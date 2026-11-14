'use strict';
/* LOOPI — VOLFIELD engine (pure, no DOM).
 *
 * An original implementation of the classic territory-capture
 * mechanics, written for LOOPI: a ship cruises the claimed border of
 * a rectangular arena, dives into open field drawing a glowing line,
 * and captures the enclosed region that does NOT contain the boss
 * when it reaches claimed ground again. Capture 80% of the field to
 * beat the stage. A boss creature and its minions roam the open
 * field; touching the ship's unfinished line (or the ship itself
 * while it draws) costs a life. A shield drains while the ship
 * cruises the border and refills on captures — at zero shield the
 * ship is exposed even on the border. Power blocks hidden in the
 * field grant speed / freeze / aegis / laser / clear when captured.
 *
 * All art direction, names, code and tuning here are LOOPI's own.
 * The engine is deterministic (seeded PRNG) and runs identically in
 * the browser (window.VolfieldEngine) and in Node (module.exports)
 * so the headless tests play the exact game the shell ships.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.VolfieldEngine = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var COLS = 24, ROWS = 32;
  var OPEN = 0, CLAIMED = 1, TRAIL = 2;
  var TARGET = 0.80;               // claim this share of the interior to win
  var SHIELD_MAX = 100;
  var SHIELD_DRAIN = 2.0;          // per second while cruising the border
  var SHIELD_REFILL_PER_CELL = 0.35;

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------------- stage table ----------------
   * Six bosses, six behaviours, six looks (hue drives the canvas
   * palette in the shell). Patterns: drift / weave / hunt / surge /
   * blink / overlord. */
  var STAGES = [
    { nameKey: 'vfBoss1', pattern: 'drift',    bossSpeed: 2.0, minions: 1, minionSpeed: 3.0, hue: 118, fieldHue: 96 },
    { nameKey: 'vfBoss2', pattern: 'weave',    bossSpeed: 2.4, minions: 2, minionSpeed: 3.2, hue: 16,  fieldHue: 28 },
    { nameKey: 'vfBoss3', pattern: 'hunt',     bossSpeed: 2.5, minions: 2, minionSpeed: 3.4, hue: 268, fieldHue: 252 },
    { nameKey: 'vfBoss4', pattern: 'surge',    bossSpeed: 2.6, minions: 3, minionSpeed: 3.6, hue: 38,  fieldHue: 44 },
    { nameKey: 'vfBoss5', pattern: 'blink',    bossSpeed: 2.7, minions: 3, minionSpeed: 3.8, hue: 190, fieldHue: 205 },
    { nameKey: 'vfBoss6', pattern: 'overlord', bossSpeed: 3.0, minions: 3, minionSpeed: 4.0, hue: 348, fieldHue: 330 }
  ];
  var POWER_KINDS = ['speed', 'freeze', 'aegis', 'laser', 'clear'];

  function interiorTotal() { return (COLS - 2) * (ROWS - 2); }
  function idx(x, y) { return y * COLS + x; }
  function inField(x, y) { return x >= 0 && y >= 0 && x < COLS && y < ROWS; }
  function isFrame(x, y) { return x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1; }

  /* ---------------- capture (pure) ----------------
   * grid holds OPEN / CLAIMED / TRAIL. Flood-fill OPEN cells from
   * the boss's cell: everything the boss can reach stays open; every
   * other OPEN cell plus the whole TRAIL is captured. Returns the
   * list of newly claimed cells (the grid is NOT mutated). */
  function vfCapture(grid, bossCell) {
    var seen = new Uint8Array(COLS * ROWS);
    var stack = [idx(bossCell.x, bossCell.y)];
    seen[stack[0]] = 1;
    while (stack.length) {
      var cur = stack.pop();
      var cx = cur % COLS, cy = (cur / COLS) | 0;
      var nb = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
      for (var i = 0; i < 4; i++) {
        var nx = nb[i][0], ny = nb[i][1];
        if (!inField(nx, ny)) continue;
        var ni = idx(nx, ny);
        if (seen[ni] || grid[ni] !== OPEN) continue;
        seen[ni] = 1;
        stack.push(ni);
      }
    }
    var claimedNow = [];
    for (var j = 0; j < grid.length; j++) {
      if (grid[j] === TRAIL) claimedNow.push(j);
      else if (grid[j] === OPEN && !seen[j]) claimedNow.push(j);
    }
    return claimedNow;
  }

  function countClaimed(grid) {
    var n = 0;
    for (var y = 1; y < ROWS - 1; y++) for (var x = 1; x < COLS - 1; x++) {
      if (grid[idx(x, y)] === CLAIMED) n++;
    }
    return n;
  }

  /* ---------------- game creation ---------------- */
  function createGame(stageIndex, seed, opts) {
    var def = STAGES[stageIndex] || STAGES[0];
    var endless = !!(opts && opts.endless); // duel mode: no 80% ending
    var rng = mulberry32((seed >>> 0) ^ (0x9e3779b9 * (stageIndex + 1)));
    var grid = new Uint8Array(COLS * ROWS);
    for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) {
      if (isFrame(x, y)) grid[idx(x, y)] = CLAIMED;
    }
    // power blocks: seeded open cells, away from the frame and each other
    var kinds = POWER_KINDS.slice();
    for (var i = kinds.length - 1; i > 0; i--) {
      var j = (rng() * (i + 1)) | 0; var t = kinds[i]; kinds[i] = kinds[j]; kinds[j] = t;
    }
    var blocks = [];
    var want = 4, guard = 0;
    while (blocks.length < want && guard++ < 400) {
      var bx = 3 + ((rng() * (COLS - 6)) | 0);
      var by = 3 + ((rng() * (ROWS - 6)) | 0);
      var ok = true;
      for (var b = 0; b < blocks.length; b++) {
        if (Math.abs(blocks[b].x - bx) + Math.abs(blocks[b].y - by) < 7) { ok = false; break; }
      }
      if (ok) blocks.push({ x: bx, y: by, kind: kinds[blocks.length % kinds.length], taken: false });
    }
    function spawnPos(minDist) {
      for (var g = 0; g < 200; g++) {
        var px = 2.5 + rng() * (COLS - 5), py = 2.5 + rng() * (ROWS - 5);
        if (Math.abs(px - COLS / 2) + Math.abs(py - (ROWS - 1)) >= minDist) return { x: px, y: py };
      }
      return { x: COLS / 2, y: 5.5 };
    }
    function mkEnemy(x, y, speed, radius, isBoss) {
      var ang = rng() * Math.PI * 2;
      return {
        x: x, y: y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
        speed: speed, r: radius, boss: !!isBoss, alive: true, respawnAt: 0,
        blinkAt: 4 + rng() * 4, sparkAt: 2.5, phase: rng() * Math.PI * 2
      };
    }
    var bp = spawnPos(14);
    var boss = mkEnemy(bp.x, bp.y, def.bossSpeed, 0.95, true);
    var minions = [];
    for (var m = 0; m < def.minions; m++) {
      var mp = spawnPos(10);
      minions.push(mkEnemy(mp.x, mp.y, def.minionSpeed, 0.42, false));
    }
    return {
      stage: stageIndex, def: def, rng: rng, grid: grid, blocks: blocks,
      time: 0, over: false, won: false, endless: endless,
      ship: {
        cx: (COLS / 2) | 0, cy: ROWS - 1, px: (COLS / 2) | 0, py: ROWS - 1,
        dir: { x: 0, y: 0 }, want: { x: 0, y: 0 }, acc: 0, drawing: false,
        invulnUntil: 0
      },
      trail: [],
      boss: boss, minions: minions, sparks: [],
      lives: 3, shield: SHIELD_MAX, score: 0,
      fx: { speedUntil: 0, freezeUntil: 0, aegisUntil: 0, laserUntil: 0, laserTick: 0 },
      events: []
    };
  }

  function claimedPct(g) { return countClaimed(g.grid) / interiorTotal(); }
  function shipCell(g) { return { x: g.ship.cx, y: g.ship.cy }; }
  function cellAt(g, x, y) { return inField(x, y) ? g.grid[idx(x, y)] : CLAIMED; }

  function setDir(g, x, y) {
    if (!x && !y) return;
    g.ship.want = { x: x, y: y };
  }

  /* ---------------- ship stepping ---------------- */
  function shipSpeed(g) {
    var base = g.ship.drawing ? 8 : 9.5;
    if (g.time < g.fx.speedUntil) base *= 1.45;
    return base;
  }

  function loseLife(g, cause) {
    g.lives--;
    g.events.push({ type: 'hit', cause: cause, lives: g.lives });
    for (var i = 0; i < g.trail.length; i++) g.grid[g.trail[i]] = OPEN;
    g.trail = [];
    g.ship.drawing = false;
    g.ship.cx = g.ship.px = (COLS / 2) | 0;
    g.ship.cy = g.ship.py = ROWS - 1;
    g.ship.dir = { x: 0, y: 0 }; g.ship.want = { x: 0, y: 0 }; g.ship.acc = 0;
    g.ship.invulnUntil = g.time + 2.5;
    g.shield = Math.max(g.shield, 40);
    g.sparks = [];
    if (g.lives <= 0) { g.over = true; g.events.push({ type: 'over' }); }
  }

  function completeCapture(g) {
    var bossCell = { x: Math.round(g.boss.x), y: Math.round(g.boss.y) };
    if (cellAt(g, bossCell.x, bossCell.y) !== OPEN) {
      // boss hugging a wall: flood from the nearest open cell instead
      outer:
      for (var rad = 1; rad < 6; rad++) {
        for (var dy = -rad; dy <= rad; dy++) for (var dx = -rad; dx <= rad; dx++) {
          if (cellAt(g, bossCell.x + dx, bossCell.y + dy) === OPEN) {
            bossCell = { x: bossCell.x + dx, y: bossCell.y + dy };
            break outer;
          }
        }
      }
    }
    var now = vfCapture(g.grid, bossCell);
    var gained = 0;
    for (var i = 0; i < now.length; i++) {
      if (!isFrame(now[i] % COLS, (now[i] / COLS) | 0)) gained++;
      g.grid[now[i]] = CLAIMED;
    }
    g.trail = [];
    g.ship.drawing = false;
    g.score += gained * 10;
    g.shield = Math.min(SHIELD_MAX, g.shield + gained * SHIELD_REFILL_PER_CELL);
    var got = [];
    for (var b = 0; b < g.blocks.length; b++) {
      var blk = g.blocks[b];
      if (!blk.taken && g.grid[idx(blk.x, blk.y)] === CLAIMED) {
        blk.taken = true; got.push(blk.kind); applyPower(g, blk.kind);
      }
    }
    var pct = claimedPct(g);
    g.events.push({ type: 'capture', cells: gained, pct: pct, powers: got });
    if (g.endless) return;
    if (pct >= TARGET && !g.won) {
      g.won = true; g.over = true;
      g.score += 500 + g.lives * 100 + Math.round(g.shield);
      g.events.push({ type: 'clear', pct: pct, score: g.score });
    }
  }

  function applyPower(g, kind) {
    if (kind === 'speed') g.fx.speedUntil = g.time + 12;
    else if (kind === 'freeze') g.fx.freezeUntil = g.time + 6;
    else if (kind === 'aegis') { g.shield = SHIELD_MAX; g.fx.aegisUntil = g.time + 8; }
    else if (kind === 'laser') g.fx.laserUntil = g.time + 10;
    else if (kind === 'clear') {
      for (var i = 0; i < g.minions.length; i++) {
        if (g.minions[i].alive) {
          g.minions[i].alive = false; g.minions[i].respawnAt = g.time + 5;
          g.score += 50; g.events.push({ type: 'kill', by: 'clear' });
        }
      }
    }
    g.events.push({ type: 'power', kind: kind });
  }

  /* one cell step of the ship; returns false if it stayed put */
  function stepShipCell(g) {
    var s = g.ship;
    var dirs = [];
    if (s.want.x || s.want.y) dirs.push(s.want);
    if ((s.dir.x || s.dir.y) && (s.dir.x !== s.want.x || s.dir.y !== s.want.y)) dirs.push(s.dir);
    for (var d = 0; d < dirs.length; d++) {
      var dir = dirs[d];
      // never reverse straight back through the trail neck
      if (s.drawing && dir.x === -s.dir.x && dir.y === -s.dir.y &&
          (s.dir.x || s.dir.y)) continue;
      var nx = s.cx + dir.x, ny = s.cy + dir.y;
      if (!inField(nx, ny)) continue;
      var cell = g.grid[idx(nx, ny)];
      if (cell === TRAIL) {
        // retreating along your own line is allowed one step back
        var prev = g.trail[g.trail.length - 2];
        if (prev !== undefined && prev === idx(nx, ny)) {
          var head = g.trail.pop();
          g.grid[head] = OPEN;
          s.px = s.cx; s.py = s.cy; s.cx = nx; s.cy = ny; s.dir = dir;
          return true;
        }
        continue;
      }
      s.px = s.cx; s.py = s.cy; s.cx = nx; s.cy = ny; s.dir = dir;
      if (cell === OPEN) {
        if (!s.drawing) { s.drawing = true; g.trail = []; }
        g.grid[idx(nx, ny)] = TRAIL;
        g.trail.push(idx(nx, ny));
      } else if (cell === CLAIMED && s.drawing) {
        completeCapture(g);
      }
      return true;
    }
    return false;
  }

  /* ---------------- enemies ---------------- */
  function cellBlockedForEnemy(g, x, y) { return cellAt(g, x, y) !== OPEN; }

  function moveEnemy(g, e, dt) {
    if (!e.alive) return;
    var frozen = g.time < g.fx.freezeUntil;
    var speed = e.speed;
    if (e.boss) {
      var p = g.def.pattern;
      if (p === 'surge' || p === 'overlord') speed *= 1 + claimedPct(g) * 0.9;
      if (p === 'weave') {
        var pxn = -e.vy, pyn = e.vx;
        var len = Math.hypot(pxn, pyn) || 1;
        var wob = Math.sin(g.time * 3.1 + e.phase) * speed * 0.55;
        e.x += (pxn / len) * wob * dt; e.y += (pyn / len) * wob * dt;
      }
      if (p === 'hunt' || p === 'overlord') {
        var tx = g.ship.cx + 0.0, ty = g.ship.cy + 0.0;
        if (g.trail.length) {
          var head = g.trail[g.trail.length - 1];
          tx = head % COLS; ty = (head / COLS) | 0;
        }
        var dx = tx - e.x, dy = ty - e.y, dl = Math.hypot(dx, dy) || 1;
        var turn = 1.6 * dt;
        var cvx = e.vx, cvy = e.vy;
        var desx = (dx / dl) * speed, desy = (dy / dl) * speed;
        e.vx = cvx + (desx - cvx) * Math.min(1, turn);
        e.vy = cvy + (desy - cvy) * Math.min(1, turn);
        var vl = Math.hypot(e.vx, e.vy) || 1;
        e.vx = e.vx / vl * speed; e.vy = e.vy / vl * speed;
      }
      if (p === 'blink' || p === 'overlord') {
        e.blinkAt -= dt;
        if (e.blinkAt <= 0) {
          e.blinkAt = 5 + g.rng() * 4;
          for (var tries = 0; tries < 60; tries++) {
            var bx = 2.5 + g.rng() * (COLS - 5), by = 2.5 + g.rng() * (ROWS - 5);
            if (cellAt(g, Math.round(bx), Math.round(by)) === OPEN &&
                Math.abs(bx - g.ship.cx) + Math.abs(by - g.ship.cy) > 8) {
              e.x = bx; e.y = by; break;
            }
          }
        }
      }
      if (p === 'overlord') {
        e.sparkAt -= dt;
        if (e.sparkAt <= 0) {
          e.sparkAt = 2.5;
          var sx = g.ship.cx - e.x, sy = g.ship.cy - e.y, sl = Math.hypot(sx, sy) || 1;
          g.sparks.push({ x: e.x, y: e.y, vx: (sx / sl) * 6.5, vy: (sy / sl) * 6.5, life: 4 });
        }
      }
    }
    if (frozen) return;
    var nx = e.x + e.vx * dt, ny = e.y + e.vy * dt;
    // trail contact anywhere on the rim = the charge runs down the line
    var rim = [[nx, ny], [nx + e.r, ny], [nx - e.r, ny], [nx, ny + e.r], [nx, ny - e.r]];
    for (var i = 0; i < rim.length; i++) {
      var cell = cellAt(g, Math.round(rim[i][0]), Math.round(rim[i][1]));
      if (cell === TRAIL) {
        if (g.ship.drawing && g.time >= g.ship.invulnUntil) loseLife(g, 'line');
        return;
      }
    }
    var blockedX = cellBlockedForEnemy(g, Math.round(nx + Math.sign(e.vx) * e.r), Math.round(e.y));
    var blockedY = cellBlockedForEnemy(g, Math.round(e.x), Math.round(ny + Math.sign(e.vy) * e.r));
    if (blockedX && blockedY) { e.vx = -e.vx; e.vy = -e.vy; }
    else if (blockedX) e.vx = -e.vx;
    else if (blockedY) e.vy = -e.vy;
    e.x += e.vx * dt; e.y += e.vy * dt;
    // final safety: never end a step inside a wall
    if (cellBlockedForEnemy(g, Math.round(e.x), Math.round(e.y))) {
      e.x -= e.vx * dt; e.y -= e.vy * dt; e.vx = -e.vx; e.vy = -e.vy;
    }
  }

  function distToShip(g, x, y) {
    return Math.hypot(x - (g.ship.cx + 0.0), y - (g.ship.cy + 0.0));
  }

  /* ---------------- main step ---------------- */
  function step(g, dt) {
    g.events = [];
    if (g.over || dt <= 0) return g.events;
    dt = Math.min(dt, 0.05);
    g.time += dt;

    // ship cell stepping
    g.ship.acc += dt * shipSpeed(g);
    var guard = 0;
    while (g.ship.acc >= 1 && guard++ < 6) {
      g.ship.acc -= 1;
      if (!stepShipCell(g)) { g.ship.acc = 0; break; }
      if (g.over) return g.events;
    }

    // shield: drains while cruising claimed ground (not while drawing)
    if (!g.ship.drawing && g.time >= g.fx.aegisUntil) {
      g.shield = Math.max(0, g.shield - SHIELD_DRAIN * dt);
    }

    // enemies
    moveEnemy(g, g.boss, dt);
    if (g.over) return g.events;
    for (var i = 0; i < g.minions.length; i++) {
      var mn = g.minions[i];
      if (!mn.alive) {
        if (g.time >= mn.respawnAt) {
          var rx = 2.5 + g.rng() * (COLS - 5), ry = 2.5 + g.rng() * (ROWS - 8);
          if (cellAt(g, Math.round(rx), Math.round(ry)) === OPEN) {
            mn.x = rx; mn.y = ry; mn.alive = true;
            var ang = g.rng() * Math.PI * 2;
            mn.vx = Math.cos(ang) * mn.speed; mn.vy = Math.sin(ang) * mn.speed;
          } else mn.respawnAt = g.time + 1;
        }
        continue;
      }
      moveEnemy(g, mn, dt);
      if (g.over) return g.events;
    }

    // sparks (overlord projectiles)
    for (var si = g.sparks.length - 1; si >= 0; si--) {
      var sp = g.sparks[si];
      sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.life -= dt;
      var sc = cellAt(g, Math.round(sp.x), Math.round(sp.y));
      if (sp.life <= 0 || sc === CLAIMED) { g.sparks.splice(si, 1); continue; }
      if (sc === TRAIL || distToShip(g, sp.x, sp.y) < 0.7) {
        g.sparks.splice(si, 1);
        if (g.ship.drawing && g.time >= g.ship.invulnUntil) { loseLife(g, 'spark'); if (g.over) return g.events; }
      }
    }

    // laser power-up: zap the nearest live minion in range
    if (g.time < g.fx.laserUntil) {
      g.fx.laserTick -= dt;
      if (g.fx.laserTick <= 0) {
        g.fx.laserTick = 0.35;
        var best = null, bd = 6.5;
        for (var li = 0; li < g.minions.length; li++) {
          var cand = g.minions[li];
          if (!cand.alive) continue;
          var dd = distToShip(g, cand.x, cand.y);
          if (dd < bd) { bd = dd; best = cand; }
        }
        if (best) {
          best.alive = false; best.respawnAt = g.time + 4;
          g.score += 50; g.events.push({ type: 'kill', by: 'laser' });
        }
      }
    }

    // enemy contact with the ship
    if (g.time >= g.ship.invulnUntil) {
      var all = [g.boss].concat(g.minions);
      for (var ci = 0; ci < all.length; ci++) {
        var en = all[ci];
        if (!en.alive) continue;
        var touch = distToShip(g, en.x, en.y) < en.r + 0.45;
        if (!touch) continue;
        if (g.ship.drawing) { loseLife(g, 'ship'); break; }
        if (g.shield <= 0) { loseLife(g, 'exposed'); break; }
        // shielded on the border: the ship bumps the enemy away
        en.vx = -en.vx; en.vy = -en.vy;
        en.x += en.vx * 0.12; en.y += en.vy * 0.12;
      }
    }
    return g.events;
  }

  return {
    COLS: COLS, ROWS: ROWS, OPEN: OPEN, CLAIMED: CLAIMED, TRAIL: TRAIL,
    TARGET: TARGET, STAGES: STAGES, POWER_KINDS: POWER_KINDS,
    createGame: createGame, setDir: setDir, step: step,
    vfCapture: vfCapture, completeCapture: completeCapture,
    countClaimed: countClaimed, claimedPct: claimedPct,
    interiorTotal: interiorTotal, idx: idx, mulberry32: mulberry32
  };
});
