'use strict';
/* LOOPI — VOLFIELD (client).
 *
 * LOOPI's own territory-capture boss game, built on the pure engine
 * in volfield-engine.js (the headless tests play that exact engine).
 * Art direction follows Kay's reference frame: a cratered tan
 * moonscape wall to wall, a ship on the claimed border drawing an
 * orange line into open field, a big alien boss and its rusty
 * minions roaming inside, yellow shield blocks waiting to be
 * captured. Every sprite is drawn procedurally at runtime —
 * an original drawing in that scene's spirit, never a copy.
 *
 * Modes:
 *  - BOSS MODE: six stages, six boss behaviours. Claim 80% of the
 *    field to clear a stage; progress + best scores save on-device.
 *  - 1v1 DUEL: 90 seconds against a bot rival (labelled as a bot).
 *    Both sides claim their own field under boss pressure; higher
 *    claimed % when the clock ends wins. Wins feed the hub's game
 *    coins + win counter, and the Challenge button posts a card
 *    into chat through the hub's existing challenge flow.
 */
(function () {
  var E = window.VolfieldEngine;
  if (!E) return;
  var CELL = 15, W = E.COLS * CELL, H = E.ROWS * CELL;
  var DUEL_SECONDS = 90, DUEL_STAGE = 1;
  var SOLO_REWARD = 20, DUEL_REWARD = 15;

  var TXT = {
    en: {
      vfBossMode: 'Boss mode', vfDuelMode: '1v1 duel · 90s',
      vfStage: 'Stage', vfScore: 'Score', vfShield: 'Shield', vfClaimed: 'Claimed',
      vfStart: 'Start', vfPause: 'Pause', vfResume: 'Resume', vfRetry: 'Try again',
      vfNextStage: 'Next stage', vfPaused: 'Paused',
      vfRules: 'Cruise the border, dive in to draw a line, and close the loop on claimed ground to capture the side without the boss. Claim 80% to clear the stage. If the boss or its minions touch your line — or you, while you draw — you lose a life. Your shield drains on the border and refills when you capture.',
      vfDuelHint: '90 seconds. Out-claim the bot on your own field — the boss disrupts you both.',
      vfMsgReady: 'Pick a mode and press Start. Swipe on the field or use the pad to steer.',
      vfCapture: 'Captured! {p}% of the field is yours.',
      vfPowerUp: 'Power block: {name}!',
      vfPower_speed: 'Overdrive — ship speed up',
      vfPower_freeze: 'Deep freeze — enemies stopped',
      vfPower_aegis: 'Aegis — shield restored',
      vfPower_laser: 'Laser online — minions in range get zapped',
      vfPower_clear: 'Shockwave — all minions cleared',
      vfHitLine: 'The charge ran down your line — life lost!',
      vfHitShip: 'Caught while drawing — life lost!',
      vfHitExposed: 'Shield down — the border is exposed!',
      vfHitSpark: 'Shot down by a boss spark — life lost!',
      vfStageClear: 'Stage clear! Score {s} · +{r} game coins.',
      vfGameOver: 'Game over — the field wins this time. Score {s}.',
      vfCampaignClear: 'Final boss down — campaign complete! Score {s}.',
      vfBest: 'Best {s}', vfStageLocked: 'Clear the previous stage to unlock.',
      vfYou: 'You', vfBot: 'Bot rival',
      vfDuelWin: 'Duel won {a}% — {b}% · +{r} game coins.',
      vfDuelLose: 'Bot takes the duel {b}% — {a}%.',
      vfDuelDraw: 'Dead heat — {a}% each.',
      vfBoss1: 'Verdant Drifter', vfBoss2: 'Coral Weaver', vfBoss3: 'Violet Hunter',
      vfBoss4: 'Amber Surge', vfBoss5: 'Phantom Blink', vfBoss6: 'Crimson Overlord'
    },
    zh: {
      vfBossMode: '首领模式', vfDuelMode: '1v1 对决 · 90秒',
      vfStage: '关卡', vfScore: '分数', vfShield: '护盾', vfClaimed: '已占领',
      vfStart: '开始', vfPause: '暂停', vfResume: '继续', vfRetry: '再试一次',
      vfNextStage: '下一关', vfPaused: '已暂停',
      vfRules: '沿着边界巡航，冲入场地画线，回到已占领的地面闭合，即可夺取没有首领的那一侧。占领 80% 即可过关。如果首领或其手下碰到你的线——或在你画线时碰到你——你会失去一条生命。护盾在边界巡航时会消耗，占领时恢复。',
      vfDuelHint: '90 秒。在自己的场地上比机器人占领更多——首领会干扰你们双方。',
      vfMsgReady: '选择模式并按开始。在场地上滑动或使用方向键操控。',
      vfCapture: '占领成功！你已夺取 {p}% 的场地。',
      vfPowerUp: '能量方块：{name}！',
      vfPower_speed: '超速——飞船加速',
      vfPower_freeze: '深度冻结——敌人停止',
      vfPower_aegis: '神盾——护盾已恢复',
      vfPower_laser: '激光上线——范围内的手下将被击毁',
      vfPower_clear: '冲击波——所有手下已清除',
      vfHitLine: '电流沿着你的线冲下——失去一条生命！',
      vfHitShip: '画线时被抓住了——失去一条生命！',
      vfHitExposed: '护盾耗尽——边界已暴露！',
      vfHitSpark: '被首领火花击落——失去一条生命！',
      vfStageClear: '过关！分数 {s} · +{r} 游戏币。',
      vfGameOver: '游戏结束——这次场地赢了。分数 {s}。',
      vfCampaignClear: '最终首领已被击败——战役完成！分数 {s}。',
      vfBest: '最佳 {s}', vfStageLocked: '先通过上一关才能解锁。',
      vfYou: '你', vfBot: '机器人对手',
      vfDuelWin: '对决获胜 {a}% — {b}% · +{r} 游戏币。',
      vfDuelLose: '机器人赢得对决 {b}% — {a}%。',
      vfDuelDraw: '平局——各 {a}%。',
      vfBoss1: '翠绿漂流者', vfBoss2: '珊瑚编织者', vfBoss3: '紫罗兰猎手',
      vfBoss4: '琥珀涌动者', vfBoss5: '幻影闪烁者', vfBoss6: '绯红霸主'
    },
    hi: {
      vfBossMode: 'बॉस मोड', vfDuelMode: '1v1 द्वंद्व · 90 सेकंड',
      vfStage: 'स्टेज', vfScore: 'स्कोर', vfShield: 'शील्ड', vfClaimed: 'कब्ज़ा',
      vfStart: 'शुरू करें', vfPause: 'रोकें', vfResume: 'जारी रखें', vfRetry: 'फिर कोशिश करें',
      vfNextStage: 'अगली स्टेज', vfPaused: 'रुका हुआ',
      vfRules: 'किनारे पर चलें, मैदान में घुसकर लाइन खींचें, और कब्ज़ाई ज़मीन पर लौटकर वह हिस्सा जीतें जिसमें बॉस नहीं है। स्टेज पार करने के लिए 80% कब्ज़ा करें। अगर बॉस या उसके साथी आपकी लाइन को — या लाइन खींचते समय आपको — छू लें, तो एक लाइफ़ जाएगी। किनारे पर चलने से शील्ड घटती है और कब्ज़ा करने पर भरती है।',
      vfDuelHint: '90 सेकंड। अपने मैदान पर बॉट से ज़्यादा कब्ज़ा करें — बॉस दोनों को रोकेगा।',
      vfMsgReady: 'मोड चुनें और शुरू करें दबाएँ। मैदान पर स्वाइप करें या पैड का उपयोग करें।',
      vfCapture: 'कब्ज़ा सफल! मैदान का {p}% आपका है।',
      vfPowerUp: 'पावर ब्लॉक: {name}!',
      vfPower_speed: 'ओवरड्राइव — जहाज़ की गति बढ़ी',
      vfPower_freeze: 'डीप फ़्रीज़ — दुश्मन रुक गए',
      vfPower_aegis: 'एजिस — शील्ड बहाल',
      vfPower_laser: 'लेज़र चालू — रेंज के साथी नष्ट होंगे',
      vfPower_clear: 'शॉकवेव — सभी साथी साफ़',
      vfHitLine: 'करंट आपकी लाइन से दौड़ा — एक लाइफ़ गई!',
      vfHitShip: 'लाइन खींचते समय पकड़े गए — एक लाइफ़ गई!',
      vfHitExposed: 'शील्ड ख़त्म — किनारा खुला है!',
      vfHitSpark: 'बॉस की चिंगारी से गिरे — एक लाइफ़ गई!',
      vfStageClear: 'स्टेज पार! स्कोर {s} · +{r} गेम कॉइन्स।',
      vfGameOver: 'गेम ओवर — इस बार मैदान जीता। स्कोर {s}।',
      vfCampaignClear: 'आख़िरी बॉस गिरा — अभियान पूरा! स्कोर {s}।',
      vfBest: 'सर्वश्रेष्ठ {s}', vfStageLocked: 'पहले पिछली स्टेज पार करें।',
      vfYou: 'आप', vfBot: 'बॉट प्रतिद्वंद्वी',
      vfDuelWin: 'द्वंद्व जीता {a}% — {b}% · +{r} गेम कॉइन्स।',
      vfDuelLose: 'बॉट ने द्वंद्व जीता {b}% — {a}%।',
      vfDuelDraw: 'बराबरी — दोनों {a}%।',
      vfBoss1: 'हरा भटकता', vfBoss2: 'मूंगा बुनकर', vfBoss3: 'बैंगनी शिकारी',
      vfBoss4: 'एम्बर उभार', vfBoss5: 'प्रेत झपकी', vfBoss6: 'लाल अधिपति'
    }
  };
  function txt(k) {
    var l = window.lang || 'en';
    return (TXT[l] && TXT[l][k]) || TXT.en[k] || k;
  }
  function fill(str, map) {
    return String(str).replace(/\{(\w)\}/g, function (m, k) { return map[k] !== undefined ? map[k] : m; });
  }
  function $(id) { return document.getElementById(id); }

  /* ---------------- persistent progress ---------------- */
  var progress = { unlocked: 1, best: {}, duelWins: 0 };
  try {
    var saved = JSON.parse(localStorage.getItem('nocta.volfield.v1') || 'null');
    if (saved && typeof saved === 'object') {
      progress.unlocked = Math.min(6, Math.max(1, saved.unlocked || 1));
      progress.best = saved.best || {};
      progress.duelWins = saved.duelWins || 0;
    }
  } catch (e) { /* fresh progress */ }
  function saveProgress() {
    try { localStorage.setItem('nocta.volfield.v1', JSON.stringify(progress)); } catch (e) { /* ignore */ }
  }

  /* ---------------- state ---------------- */
  var VF = {
    mode: 'boss', stage: 0, game: null, running: false, paused: false,
    raf: 0, lastTs: 0, terrainKey: '', terrain: null, claimedDirty: true,
    claimedLayer: null, shipRx: 0, shipRy: 0, beam: null, duel: null,
    wired: false, lastClaimed: -1,
    parts: [], claimFx: null, hitFx: 0, celebrateUntil: 0, bossPhase: Math.random() * 9
  };

  function newGame() {
    var seed = (Date.now() % 100000) + VF.stage * 131 + (VF.mode === 'duel' ? 777 : 0);
    VF.game = VF.mode === 'duel'
      ? E.createGame(DUEL_STAGE, seed, { endless: true })
      : E.createGame(VF.stage, seed);
    VF.claimedDirty = true; VF.lastClaimed = -1; VF.beam = null;
    VF.parts = []; VF.claimFx = null; VF.hitFx = 0; VF.celebrateUntil = 0;
    VF.shipRx = VF.game.ship.cx; VF.shipRy = VF.game.ship.cy;
    if (VF.mode === 'duel') {
      VF.duel = { left: DUEL_SECONDS, botPct: 0, nextBite: 5, flash: 0 };
    } else VF.duel = null;
  }

  /* ---------------- canvas art (all original, drawn live) ---------------- */
  function makeCanvas(w, h) {
    var c = document.createElement('canvas'); c.width = w; c.height = h; return c;
  }
  function buildTerrain(stageDef) {
    var cv = makeCanvas(W, H), x = cv.getContext('2d');
    var rng = E.mulberry32(4242 + stageDef.fieldHue * 131);
    // Kay's reference ground: a warm tan cratered moonscape — pitted
    // regolith wall to wall, no clean ground anywhere. Stage hues no
    // longer tint the ground; this IS the Volfield look.
    var bg = x.createLinearGradient(0, 0, W * 0.3, H);
    bg.addColorStop(0, '#b28f5c');
    bg.addColorStop(0.5, '#a37f4f');
    bg.addColorStop(1, '#93743f');
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    // large soft patchiness: pale dust fields and darker maria
    for (var p = 0; p < 26; p++) {
      var px = rng() * W, py = rng() * H, pr = 34 + rng() * 95;
      var pg = x.createRadialGradient(px, py, 0, px, py, pr);
      pg.addColorStop(0, rng() > 0.5 ? 'rgba(219,193,140,0.20)' : 'rgba(120,94,56,0.20)');
      pg.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = pg; x.fillRect(px - pr, py - pr, pr * 2, pr * 2);
    }
    // craters — the heart of the look: raised rim mound, shadowed
    // bowl, dark crescent under the top rim, bright rim light below
    var craters = [];
    for (var c = 0; c < 34; c++) {
      craters.push({ x: 14 + rng() * (W - 28), y: 14 + rng() * (H - 28), r: 8 + Math.pow(rng(), 1.4) * 34, sq: 0.78 + rng() * 0.14 });
    }
    craters.sort(function (a, b) { return b.r - a.r; });
    craters.forEach(function (cr) {
      var cx = cr.x, cy = cr.y, r = cr.r, sq = cr.sq;
      x.fillStyle = 'rgba(110,88,54,0.26)';
      x.beginPath(); x.ellipse(cx, cy + r * 0.05, r * 1.16, r * 1.16 * sq, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(228,203,152,0.17)';
      x.beginPath(); x.ellipse(cx, cy - r * 0.08, r * 1.1, r * 1.1 * sq, 0, 0, Math.PI * 2); x.fill();
      // worn, broken rim: a second offset bowl pass so no crater
      // reads as a perfect ring
      x.fillStyle = 'rgba(122,96,58,0.20)';
      x.beginPath(); x.ellipse(cx + r * 0.16, cy + r * 0.1, r * 0.82, r * 0.82 * sq, 0.3, 0, Math.PI * 2); x.fill();
      var bowl = x.createLinearGradient(0, cy - r * sq, 0, cy + r * sq);
      bowl.addColorStop(0, '#65512f');
      bowl.addColorStop(0.45, '#8a6f45');
      bowl.addColorStop(1, '#a78b59');
      x.fillStyle = bowl;
      x.beginPath(); x.ellipse(cx, cy, r, r * sq, 0, 0, Math.PI * 2); x.fill();
      x.strokeStyle = 'rgba(52,38,18,0.42)'; x.lineWidth = Math.max(1.6, r * 0.17);
      x.beginPath(); x.ellipse(cx, cy, r * 0.86, r * 0.86 * sq, 0, Math.PI * 1.08, Math.PI * 1.92); x.stroke();
      x.strokeStyle = 'rgba(240,216,162,0.42)'; x.lineWidth = Math.max(1.4, r * 0.12);
      x.beginPath(); x.ellipse(cx, cy, r * 0.97, r * 0.97 * sq, 0, Math.PI * 0.12, Math.PI * 0.88); x.stroke();
      x.strokeStyle = 'rgba(70,54,28,0.32)'; x.lineWidth = 1.1;
      x.beginPath(); x.ellipse(cx, cy, r * 1.06, r * 1.06 * sq, 0, Math.PI * 1.05, Math.PI * 1.95); x.stroke();
      for (var d = 0; d < r * 0.55; d++) {
        var da = rng() * Math.PI * 2, dr = Math.sqrt(rng()) * r * 0.7;
        x.fillStyle = rng() > 0.45 ? 'rgba(70,54,28,0.25)' : 'rgba(234,210,160,0.20)';
        x.beginPath(); x.arc(cx + Math.cos(da) * dr, cy + Math.sin(da) * dr * sq, 0.8 + rng() * 1.5, 0, Math.PI * 2); x.fill();
      }
    });
    // rocky patches: clusters of small angular stones
    for (var rp = 0; rp < 12; rp++) {
      var rx = rng() * W, ry = rng() * H, n = 5 + (rng() * 7 | 0);
      for (var rs = 0; rs < n; rs++) {
        var sx = rx + (rng() - 0.5) * 46, sy = ry + (rng() - 0.5) * 34;
        var ss = 2 + rng() * 4.5, rot = rng() * 3;
        x.fillStyle = 'rgba(96,78,50,0.35)';
        x.beginPath(); x.ellipse(sx, sy + ss * 0.3, ss, ss * 0.62, rot, 0, Math.PI * 2); x.fill();
        x.fillStyle = rng() > 0.5 ? 'rgba(140,116,78,0.5)' : 'rgba(112,90,58,0.5)';
        x.beginPath(); x.ellipse(sx, sy, ss, ss * 0.62, rot, 0, Math.PI * 2); x.fill();
        x.fillStyle = 'rgba(230,205,155,0.35)';
        x.beginPath(); x.ellipse(sx - ss * 0.25, sy - ss * 0.22, ss * 0.45, ss * 0.24, 0, 0, Math.PI * 2); x.fill();
      }
    }
    // dense pitting over everything
    for (var s = 0; s < 2100; s++) {
      var sx2 = rng() * W, sy2 = rng() * H, sr = rng();
      x.fillStyle = sr > 0.52 ? 'rgba(74,57,29,' + (0.10 + rng() * 0.20) + ')' : 'rgba(236,212,161,' + (0.08 + rng() * 0.16) + ')';
      x.beginPath(); x.arc(sx2, sy2, sr > 0.93 ? 1.9 : 1.05, 0, Math.PI * 2); x.fill();
    }
    // scattered pebbles with a lit top
    for (var pb = 0; pb < 110; pb++) {
      var bx = rng() * W, by = rng() * H, bs = 1.2 + rng() * 2.6;
      x.fillStyle = 'rgba(88,68,40,0.55)';
      x.beginPath(); x.ellipse(bx, by, bs, bs * 0.66, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(233,206,152,0.5)';
      x.beginPath(); x.ellipse(bx - bs * 0.2, by - bs * 0.25, bs * 0.5, bs * 0.28, 0, 0, Math.PI * 2); x.fill();
    }
    return cv;
  }
  function buildClaimedLayer() {
    var g = VF.game; if (!g) return;
    if (!VF.claimedLayer) VF.claimedLayer = makeCanvas(W, H);
    var x = VF.claimedLayer.getContext('2d');
    x.clearRect(0, 0, W, H);
    function isClaimed(cx, cy) {
      if (cx <= 0 || cy <= 0 || cx >= E.COLS - 1 || cy >= E.ROWS - 1) return true; // frame is home ground
      return g.grid[E.idx(cx, cy)] === E.CLAIMED;
    }
    function eachCell(fn) {
      for (var cy = 1; cy < E.ROWS - 1; cy++) {
        for (var cx = 1; cx < E.COLS - 1; cx++) {
          if (g.grid[E.idx(cx, cy)] === E.CLAIMED) fn(cx, cy);
        }
      }
    }
    // cleared ground: the rough regolith scraped smooth and dark —
    // packed earth that reads instantly against the bright field,
    // edged in the same orange as the line being drawn
    x.fillStyle = 'rgba(86,66,38,0.94)';
    eachCell(function (cx, cy) { x.fillRect(cx * CELL, cy * CELL, CELL, CELL); });
    var grad = x.createLinearGradient(0, 0, W * 0.8, H);
    grad.addColorStop(0, 'rgba(56,42,24,0.34)');
    grad.addColorStop(0.55, 'rgba(74,56,32,0.30)');
    grad.addColorStop(1, 'rgba(104,84,52,0.30)');
    x.fillStyle = grad;
    eachCell(function (cx, cy) { x.fillRect(cx * CELL, cy * CELL, CELL, CELL); });
    // sparse grit, deterministic per cell so rebuilds never flicker
    eachCell(function (cx, cy) {
      var hsh = ((cx * 73856093) ^ (cy * 19349663)) >>> 0;
      var px = cx * CELL, py = cy * CELL;
      for (var d = 0; d < 3; d++) {
        hsh = (hsh * 1664525 + 1013904223) >>> 0;
        var dx = (hsh % 13) + 1; hsh = (hsh * 1664525 + 1013904223) >>> 0;
        var dy = (hsh % 13) + 1;
        x.fillStyle = d === 0 ? 'rgba(226,198,146,0.20)' : 'rgba(40,29,14,0.28)';
        x.fillRect(px + dx, py + dy, 1.4, 1.4);
      }
    });
    // the boundary: dark seam under a crisp orange edge
    function edges() {
      eachCell(function (cx, cy) {
        var px = cx * CELL, py = cy * CELL;
        x.beginPath();
        if (!isClaimed(cx, cy - 1)) { x.moveTo(px, py + 0.5); x.lineTo(px + CELL, py + 0.5); }
        if (!isClaimed(cx, cy + 1)) { x.moveTo(px, py + CELL - 0.5); x.lineTo(px + CELL, py + CELL - 0.5); }
        if (!isClaimed(cx - 1, cy)) { x.moveTo(px + 0.5, py); x.lineTo(px + 0.5, py + CELL); }
        if (!isClaimed(cx + 1, cy)) { x.moveTo(px + CELL - 0.5, py); x.lineTo(px + CELL - 0.5, py + CELL); }
        x.stroke();
      });
    }
    x.strokeStyle = 'rgba(43,29,12,0.85)';
    x.lineWidth = 3.6;
    edges();
    x.strokeStyle = '#ff7d1f';
    x.lineWidth = 1.8;
    x.shadowColor = 'rgba(255,125,31,0.55)'; x.shadowBlur = 4;
    edges();
    x.shadowBlur = 0;
    VF.claimedDirty = false;
  }
  /* ---------------- capture / combat juice ---------------- */
  function spawnBurst(px, py, hue, n, speed) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = speed * (0.3 + Math.random() * 0.9);
      VF.parts.push({
        x: px, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - speed * 0.18,
        at: performance.now(), ttl: 480 + Math.random() * 460,
        hue: hue, size: 1.4 + Math.random() * 2.4
      });
    }
    if (VF.parts.length > 260) VF.parts.splice(0, VF.parts.length - 260);
  }
  function drawParts(x, now) {
    if (!VF.parts.length) return;
    x.save();
    VF.parts = VF.parts.filter(function (p) { return now - p.at < p.ttl; });
    VF.parts.forEach(function (p) {
      var t = (now - p.at) / 1000, k = 1 - (now - p.at) / p.ttl;
      var px = p.x + p.vx * t, py = p.y + p.vy * t + 130 * t * t;
      x.globalAlpha = Math.max(0, k);
      x.fillStyle = 'hsl(' + p.hue + ',100%,' + (62 + k * 22) + '%)';
      x.shadowColor = 'hsl(' + p.hue + ',100%,60%)'; x.shadowBlur = 7;
      x.beginPath(); x.arc(px, py, p.size * (0.4 + k * 0.6), 0, Math.PI * 2); x.fill();
    });
    x.restore();
    x.globalAlpha = 1;
  }
  function claimedCentroid() {
    var g = VF.game, sx = 0, sy = 0, n = 0;
    for (var cy = 1; cy < E.ROWS - 1; cy++) {
      for (var cx = 1; cx < E.COLS - 1; cx++) {
        if (g.grid[E.idx(cx, cy)] === E.CLAIMED) { sx += cx; sy += cy; n++; }
      }
    }
    if (!n) return { x: W / 2, y: H / 2 };
    return { x: (sx / n) * CELL + CELL / 2, y: (sy / n) * CELL + CELL / 2 };
  }
  function celebrate(px, py, hue) {
    spawnBurst(px, py, hue, 46, 250);
    spawnBurst(W / 2, H / 2, 46, 30, 200);
    VF.celebrateUntil = performance.now() + 1150;
    (function tick() {
      render(performance.now());
      if (performance.now() < VF.celebrateUntil) requestAnimationFrame(tick);
    })();
  }
  function drawBlock(x, blk, now) {
    var px = blk.x * CELL + CELL / 2, py = blk.y * CELL + CELL / 2;
    var bob = Math.sin(now / 380 + blk.x * 1.7 + blk.y) * 1.1;
    var s = 10.5;
    x.save(); x.translate(px, py);
    // soft shadow settling it onto the regolith
    var sh = x.createRadialGradient(0, 11, 1, 0, 11, s * 1.2);
    sh.addColorStop(0, 'rgba(43,29,10,0.42)'); sh.addColorStop(1, 'rgba(43,29,10,0)');
    x.fillStyle = sh;
    x.beginPath(); x.ellipse(0, 11, s * 1.2, s * 0.42, 0, 0, Math.PI * 2); x.fill();
    x.translate(0, bob);
    // the yellow shield block from Kay's reference: chunky bevelled
    // face, dark outline, inner plate, glyph stamped in dark amber
    var face = x.createLinearGradient(0, -s, 0, s);
    face.addColorStop(0, '#ffe45c');
    face.addColorStop(0.55, '#ffc61a');
    face.addColorStop(1, '#efa30b');
    roundRect(x, -s, -s, s * 2, s * 2, 3.5);
    x.fillStyle = face; x.fill();
    x.lineWidth = 2; x.strokeStyle = '#40300c'; x.stroke();
    // bevel light: top + left inner edges lit, bottom + right shaded
    x.lineWidth = 1.6; x.lineCap = 'round';
    x.strokeStyle = 'rgba(255,250,215,0.85)';
    x.beginPath();
    x.moveTo(-s + 2.4, s - 3.4); x.lineTo(-s + 2.4, -s + 2.4); x.lineTo(s - 3.4, -s + 2.4);
    x.stroke();
    x.strokeStyle = 'rgba(146,94,8,0.75)';
    x.beginPath();
    x.moveTo(s - 2.4, -s + 3.4); x.lineTo(s - 2.4, s - 2.4); x.lineTo(-s + 3.4, s - 2.4);
    x.stroke();
    // inner plate
    roundRect(x, -s + 4.6, -s + 4.6, (s - 4.6) * 2, (s - 4.6) * 2, 2);
    x.fillStyle = 'rgba(255,216,64,0.5)'; x.fill();
    x.lineWidth = 1; x.strokeStyle = 'rgba(122,82,10,0.5)'; x.stroke();
    // glyph stamped dark
    x.fillStyle = '#59390a'; x.strokeStyle = '#59390a';
    x.shadowColor = 'rgba(255,240,190,0.5)'; x.shadowBlur = 2;
    drawGlyph(x, blk.kind);
    x.shadowBlur = 0;
    x.restore();
  }
  function drawGlyph(x, kind) {
    x.beginPath();
    if (kind === 'speed') {           // lightning bolt
      x.moveTo(1.5, -5.5); x.lineTo(-3.4, 0.6); x.lineTo(-0.4, 0.6); x.lineTo(-1.5, 5.5); x.lineTo(3.4, -0.8); x.lineTo(0.4, -0.8);
      x.closePath(); x.fill();
    } else if (kind === 'freeze') {    // snowflake
      x.lineWidth = 1.5;
      for (var i = 0; i < 3; i++) {
        var a = i * Math.PI / 3;
        x.moveTo(-Math.cos(a) * 5, -Math.sin(a) * 5); x.lineTo(Math.cos(a) * 5, Math.sin(a) * 5);
      }
      x.stroke();
    } else if (kind === 'aegis') {     // shield
      x.moveTo(0, -5.5); x.lineTo(4.6, -3.4); x.lineTo(4.6, 0.5);
      x.quadraticCurveTo(4.6, 4.2, 0, 5.8);
      x.quadraticCurveTo(-4.6, 4.2, -4.6, 0.5); x.lineTo(-4.6, -3.4);
      x.closePath(); x.fill();
    } else if (kind === 'laser') {     // beam + node
      x.fillRect(-5.5, -1.1, 8, 2.2);
      x.beginPath(); x.arc(4.2, 0, 2.4, 0, Math.PI * 2); x.fill();
    } else {                            // 'clear': burst star
      for (var s2 = 0; s2 < 8; s2++) {
        var a2 = s2 * Math.PI / 4, r1 = s2 % 2 ? 2 : 5.2;
        var vx = Math.cos(a2) * r1, vy = Math.sin(a2) * r1;
        if (s2 === 0) x.moveTo(vx, vy); else x.lineTo(vx, vy);
      }
      x.closePath(); x.fill();
    }
  }
  function roundRect(x, a, b, w, h, r) {
    x.beginPath();
    x.moveTo(a + r, b);
    x.arcTo(a + w, b, a + w, b + h, r);
    x.arcTo(a + w, b + h, a, b + h, r);
    x.arcTo(a, b + h, a, b, r);
    x.arcTo(a, b, a + w, b, r);
    x.closePath();
  }
  function drawBoss(x, b, now) {
    var px = b.x * CELL, py = b.y * CELL;
    var R = b.r * CELL * 1.8;                     // visual radius — a big alien, mid-field presence
    var hue = VF.game.def.hue, pat = VF.game.def.pattern;
    var breathe = 1 + Math.sin(now / 640 + VF.bossPhase) * 0.02;
    var frozen = VF.game.time < VF.game.fx.freezeUntil;
    var s = VF.game.ship;
    x.save(); x.translate(px, py);
    // ground shadow on the regolith
    var sh = x.createRadialGradient(1, R * 0.72, 1, 1, R * 0.72, R * 1.15);
    sh.addColorStop(0, 'rgba(43,29,10,0.45)'); sh.addColorStop(1, 'rgba(43,29,10,0)');
    x.fillStyle = sh;
    x.beginPath(); x.ellipse(1, R * 0.72, R * 1.15, R * 0.4, 0, 0, Math.PI * 2); x.fill();
    // the alien turns to face its prey; drawn facing up (-y)
    var ang = Math.atan2(s.cy - b.y, s.cx - b.x);
    x.rotate(ang + Math.PI / 2);
    x.scale(breathe, breathe);
    var dark = 'hsl(' + hue + ',48%,22%)';
    var darker = 'hsl(' + hue + ',52%,15%)';
    // ---- legs: three segmented legs per side, scuttling ----
    x.lineCap = 'round';
    [-1, 1].forEach(function (side) {
      for (var li = 0; li < 3; li++) {
        var hipY = -R * 0.28 + li * R * 0.36;
        var lift = Math.sin(now / 130 + li * 1.15 + (side > 0 ? 0.6 : 0)) * R * 0.07;
        var kx = side * R * 1.02, ky = hipY - R * 0.1 + lift * 0.4;
        var fx = side * R * 1.22, fy = hipY + R * 0.22 + lift;
        x.strokeStyle = dark; x.lineWidth = R * 0.13;
        x.beginPath(); x.moveTo(side * R * 0.6, hipY); x.lineTo(kx, ky); x.lineTo(fx, fy); x.stroke();
        x.fillStyle = darker;
        x.beginPath(); x.arc(kx, ky, R * 0.085, 0, Math.PI * 2); x.fill();
        x.beginPath(); x.arc(fx, fy, R * 0.06, 0, Math.PI * 2); x.fill();
      }
    });
    // ---- pattern extras behind the shell ----
    if (pat === 'drift') {
      [-0.34, 0.34].forEach(function (off) {
        x.strokeStyle = dark; x.lineWidth = 2.4;
        x.beginPath(); x.moveTo(off * R, R * 0.55);
        x.quadraticCurveTo(off * R * 1.7, R * 1.05, off * R * 1.35, R * 1.3); x.stroke();
        var ox = off * R * 1.35, oy = R * 1.3;
        var orb = x.createRadialGradient(ox - 1.2, oy - 1.4, 0.4, ox, oy, 4.4);
        orb.addColorStop(0, 'hsl(' + hue + ',95%,82%)');
        orb.addColorStop(1, 'hsl(' + hue + ',70%,36%)');
        x.fillStyle = orb;
        x.beginPath(); x.arc(ox, oy, 4.2, 0, Math.PI * 2); x.fill();
      });
    }
    if (pat === 'weave') {
      var flap = Math.sin(now / 170) * 0.14;
      [-1, 1].forEach(function (side) {
        x.save(); x.scale(side, 1); x.rotate(flap * side);
        x.fillStyle = 'hsla(' + hue + ',62%,40%,0.85)';
        x.beginPath(); x.ellipse(R * 0.92, R * 0.1, R * 0.4, R * 0.17, 0.5 * side, 0, Math.PI * 2); x.fill();
        x.strokeStyle = 'hsla(' + hue + ',60%,20%,0.6)'; x.lineWidth = 1.2; x.stroke();
        x.restore();
      });
    }
    if (pat === 'hunt' || pat === 'overlord') {
      var n = pat === 'overlord' ? 7 : 5;
      for (var si = 0; si < n; si++) {
        var sa = Math.PI * (0.15 + 0.7 * (si / (n - 1))); // back rim fan
        var bx2 = Math.sin(sa) * R * 0.92, by2 = Math.cos(sa) * R * 0.8;
        var tipx = Math.sin(sa) * R * 1.24, tipy = Math.cos(sa) * R * 1.05;
        var perp = R * 0.1;
        x.fillStyle = darker;
        x.beginPath();
        x.moveTo(bx2 - Math.cos(sa) * perp, by2 + Math.sin(sa) * perp);
        x.lineTo(tipx, tipy);
        x.lineTo(bx2 + Math.cos(sa) * perp, by2 - Math.sin(sa) * perp);
        x.closePath(); x.fill();
      }
    }
    // ---- claws: rusty orange pincers at the front, snapping ----
    var pinch = (Math.sin(now / 240) + 1) / 2;      // 0..1
    [-1, 1].forEach(function (side) {
      var ax = side * R * 0.44, ay = -R * 0.52;
      var cxp = side * R * 0.78, cyp = -R * 0.88;
      x.strokeStyle = '#7e2f10'; x.lineWidth = R * 0.17;
      x.beginPath(); x.moveTo(ax, ay); x.quadraticCurveTo(side * R * 0.72, -R * 0.66, cxp, cyp); x.stroke();
      x.save(); x.translate(cxp, cyp); x.rotate(side * 0.5);
      var claw = x.createRadialGradient(-R * 0.08, -R * 0.1, 1, 0, 0, R * 0.34);
      claw.addColorStop(0, '#e8763a'); claw.addColorStop(0.6, '#c0501c'); claw.addColorStop(1, '#7e2f10');
      x.fillStyle = claw;
      // upper pincer
      x.save(); x.rotate(-0.35 - pinch * 0.22);
      x.beginPath(); x.ellipse(R * 0.1, -R * 0.1, R * 0.3, R * 0.13, -0.5, 0, Math.PI * 2); x.fill();
      x.strokeStyle = 'rgba(46,18,4,0.55)'; x.lineWidth = 1.2; x.stroke();
      x.restore();
      // lower pincer
      x.save(); x.rotate(0.3 + pinch * 0.18);
      x.beginPath(); x.ellipse(R * 0.08, R * 0.1, R * 0.24, R * 0.105, 0.45, 0, Math.PI * 2); x.fill();
      x.strokeStyle = 'rgba(46,18,4,0.55)'; x.lineWidth = 1.2; x.stroke();
      x.restore();
      x.restore();
    });
    // ---- segmented abdomen trailing behind the shell ----
    [[0.74, 0.6], [1.0, 0.46], [1.22, 0.32]].forEach(function (seg) {
      var sy2 = R * seg[0], sr2 = R * seg[1];
      var segG = x.createRadialGradient(-sr2 * 0.3, sy2 - sr2 * 0.4, 1, 0, sy2, sr2 * 1.15);
      segG.addColorStop(0, 'hsl(' + hue + ',64%,48%)');
      segG.addColorStop(1, 'hsl(' + hue + ',58%,26%)');
      x.fillStyle = segG;
      x.beginPath(); x.ellipse(0, sy2, sr2, sr2 * 0.72, 0, 0, Math.PI * 2); x.fill();
      x.strokeStyle = 'hsla(' + hue + ',55%,16%,0.5)'; x.lineWidth = 1.3;
      x.beginPath(); x.ellipse(0, sy2, sr2 * 0.92, sr2 * 0.62, 0, Math.PI * 1.1, Math.PI * 1.9); x.stroke();
      x.strokeStyle = 'rgba(14,24,6,0.4)';
      x.beginPath(); x.ellipse(0, sy2, sr2, sr2 * 0.72, 0, 0, Math.PI * 2); x.stroke();
    });
    // ---- shell: a plated dome, matte-shaded in the stage hue ----
    var shell = x.createRadialGradient(-R * 0.3, -R * 0.45, R * 0.12, 0, 0, R * 1.05);
    shell.addColorStop(0, 'hsl(' + hue + ',72%,63%)');
    shell.addColorStop(0.45, 'hsl(' + hue + ',66%,45%)');
    shell.addColorStop(0.8, 'hsl(' + hue + ',60%,32%)');
    shell.addColorStop(1, 'hsl(' + hue + ',58%,24%)');
    x.fillStyle = shell;
    x.beginPath(); x.ellipse(0, 0, R, R * 0.88, 0, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'rgba(14,24,6,0.45)'; x.lineWidth = 1.6; x.stroke();
    // shell plates: arcs sweeping back over the dome
    x.strokeStyle = 'hsla(' + hue + ',55%,18%,0.4)'; x.lineWidth = 1.6;
    [-0.34, 0.02, 0.38].forEach(function (yy) {
      x.beginPath(); x.ellipse(0, R * 0.12, R * (0.86 - Math.abs(yy) * 0.35), R * 0.62, 0, Math.PI * (yy < 0 ? 1.15 : 0.12), Math.PI * (yy < 0 ? 1.85 : 0.88)); x.stroke();
      void yy;
    });
    // shell speckle — fixed offsets, no per-frame flicker
    x.fillStyle = 'hsla(' + hue + ',60%,18%,0.30)';
    [[-0.5, -0.3], [0.42, -0.42], [-0.2, 0.3], [0.55, 0.22], [0.05, -0.62], [-0.62, 0.18], [0.3, 0.55], [-0.38, 0.55]].forEach(function (sp2) {
      x.beginPath(); x.arc(sp2[0] * R, sp2[1] * R, R * 0.045, 0, Math.PI * 2); x.fill();
    });
    // soft top light — one gentle sheen, not a gloss orb
    x.fillStyle = 'rgba(255,255,240,0.16)';
    x.beginPath(); x.ellipse(-R * 0.3, -R * 0.48, R * 0.34, R * 0.13, -0.4, 0, Math.PI * 2); x.fill();
    // ---- face plate at the front ----
    var face = x.createRadialGradient(0, -R * 0.34, 1, 0, -R * 0.3, R * 0.55);
    face.addColorStop(0, 'hsl(' + hue + ',70%,58%)');
    face.addColorStop(1, 'hsl(' + hue + ',62%,38%)');
    x.fillStyle = face;
    x.beginPath(); x.ellipse(0, -R * 0.3, R * 0.52, R * 0.4, 0, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'hsla(' + hue + ',55%,18%,0.35)'; x.lineWidth = 1.2; x.stroke();
    // ---- stalked eyes tracking the ship (straight ahead in local frame) ----
    [-0.27, 0.27].forEach(function (off) {
      var ex = off * R, ey = -R * 0.84;
      x.strokeStyle = dark; x.lineWidth = R * 0.09;
      x.beginPath(); x.moveTo(off * R * 0.8, -R * 0.58); x.quadraticCurveTo(ex, -R * 0.78, ex, ey + R * 0.08); x.stroke();
      var white = x.createRadialGradient(ex - R * 0.05, ey - R * 0.06, 0.5, ex, ey, R * 0.155);
      white.addColorStop(0, '#ffffff'); white.addColorStop(0.75, '#eef0e6'); white.addColorStop(1, '#c9cdbb');
      x.fillStyle = white;
      x.beginPath(); x.arc(ex, ey, R * 0.15, 0, Math.PI * 2); x.fill();
      x.strokeStyle = 'rgba(14,24,6,0.4)'; x.lineWidth = 1.1; x.stroke();
      x.fillStyle = '#10130a';
      x.beginPath(); x.arc(ex, ey - R * 0.035, R * 0.085, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.95)';
      x.beginPath(); x.arc(ex - R * 0.04, ey - R * 0.075, R * 0.028, 0, Math.PI * 2); x.fill();
      // angry brow plate slanting down toward the centre
      x.save(); x.translate(ex, ey - R * 0.21); x.rotate(off > 0 ? 0.35 : -0.35);
      x.fillStyle = darker;
      roundRect(x, -R * 0.17, -R * 0.045, R * 0.34, R * 0.09, R * 0.04); x.fill();
      x.restore();
    });
    // ---- maw: dark grin with jagged teeth under the face plate ----
    var mw = R * 0.44, my = -R * 0.18;
    x.fillStyle = '#1d0d06';
    x.beginPath(); x.ellipse(0, my, mw, R * 0.15, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#f2ecd8';
    for (var f = 0; f < 5; f++) {
      var fx = -mw * 0.76 + (mw * 1.52 / 4) * f;
      var fl = (f % 2 === 0) ? R * 0.13 : R * 0.09;
      x.beginPath();
      x.moveTo(fx - R * 0.05, my - R * 0.07);
      x.lineTo(fx + R * 0.05, my - R * 0.07);
      x.lineTo(fx, my - R * 0.07 + fl);
      x.closePath(); x.fill();
    }
    if (frozen) {
      x.fillStyle = 'rgba(185,228,255,0.35)';
      x.beginPath(); x.ellipse(0, 0, R, R * 0.88, 0, 0, Math.PI * 2); x.fill();
      x.strokeStyle = 'rgba(240,252,255,0.55)'; x.lineWidth = 1.1;
      x.beginPath();
      x.moveTo(-R * 0.5, -R * 0.5); x.lineTo(-R * 0.15, -R * 0.05); x.lineTo(-R * 0.3, R * 0.35);
      x.moveTo(R * 0.44, -R * 0.4); x.lineTo(R * 0.18, 0);
      x.stroke();
    }
    x.restore();
  }
  function drawMinion(x, m, now) {
    var px = m.x * CELL, py = m.y * CELL;
    var ang = Math.atan2(m.vy, m.vx);
    x.save(); x.translate(px, py);
    // faint dust puffs kicked up behind it
    for (var gi = 2; gi >= 1; gi--) {
      x.fillStyle = 'rgba(122,94,54,' + (0.16 - gi * 0.04) + ')';
      x.beginPath();
      x.arc(-m.vx * gi * 1.3, -m.vy * gi * 1.3, 3.4 - gi * 0.8, 0, Math.PI * 2); x.fill();
    }
    // soft ground shadow
    var sh = x.createRadialGradient(0, 7, 0.5, 0, 7, 8);
    sh.addColorStop(0, 'rgba(43,29,10,0.4)'); sh.addColorStop(1, 'rgba(43,29,10,0)');
    x.fillStyle = sh;
    x.beginPath(); x.ellipse(0, 7, 8, 3, 0, 0, Math.PI * 2); x.fill();
    x.rotate(ang);
    // rusty organic dart — the orange minion ships of the reference,
    // with the same green heart-core as the boss's brood
    var body = x.createLinearGradient(-9, 0, 10, 0);
    body.addColorStop(0, '#6e2410');
    body.addColorStop(0.45, '#a03a1a');
    body.addColorStop(1, '#e0653a');
    x.fillStyle = body;
    x.beginPath();
    x.moveTo(10, 0);
    x.quadraticCurveTo(4, -6.8, -6.5, -5.6);
    x.quadraticCurveTo(-9.5, 0, -6.5, 5.6);
    x.quadraticCurveTo(4, 6.8, 10, 0);
    x.closePath(); x.fill();
    x.strokeStyle = 'rgba(46,18,4,0.55)'; x.lineWidth = 1.1; x.stroke();
    // rear finlets
    x.fillStyle = '#7e2f10';
    x.beginPath();
    x.moveTo(-6, -4.4); x.lineTo(-10.5, -7.6); x.lineTo(-8.6, -2.6);
    x.closePath(); x.fill();
    x.beginPath();
    x.moveTo(-6, 4.4); x.lineTo(-10.5, 7.6); x.lineTo(-8.6, 2.6);
    x.closePath(); x.fill();
    // lit spine ridge
    x.fillStyle = 'rgba(255,190,130,0.5)';
    x.beginPath(); x.ellipse(3.4, -1.8, 3.6, 1.2, -0.25, 0, Math.PI * 2); x.fill();
    // green heart-core
    var core = x.createRadialGradient(0.4, -0.4, 0.3, 0.5, 0, 3.4);
    core.addColorStop(0, '#d8ffa8'); core.addColorStop(0.55, '#7dd956'); core.addColorStop(1, '#3f9425');
    x.fillStyle = core;
    x.shadowColor = 'rgba(110,220,70,0.75)'; x.shadowBlur = 5;
    x.beginPath(); x.arc(0.5, 0, 3.1, 0, Math.PI * 2); x.fill();
    x.shadowBlur = 0;
    x.strokeStyle = 'rgba(20,40,8,0.6)'; x.lineWidth = 0.9;
    x.beginPath(); x.arc(0.5, 0, 3.1, 0, Math.PI * 2); x.stroke();
    if (VF.game.time < VF.game.fx.freezeUntil) {
      x.fillStyle = 'rgba(190,230,255,0.45)';
      x.beginPath(); x.arc(0, 0, 9, 0, Math.PI * 2); x.fill();
    }
    x.restore();
  }
  function drawShip(x, now) {
    var g = VF.game, s = g.ship;
    var px = VF.shipRx * CELL + CELL / 2, py = VF.shipRy * CELL + CELL / 2;
    var bob = Math.sin(now / 300) * 1.1;
    var ang = (s.dir.x || s.dir.y) ? Math.atan2(s.dir.y, s.dir.x) : -Math.PI / 2;
    x.save(); x.translate(px, py);
    // ground shadow + under-glow from the amber core
    var sh = x.createRadialGradient(1, 9, 0.5, 1, 9, 11);
    sh.addColorStop(0, 'rgba(0,0,0,0.45)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = sh;
    x.beginPath(); x.ellipse(1, 9, 11, 4, 0, 0, Math.PI * 2); x.fill();
    var ug = x.createRadialGradient(0, 2, 0.5, 0, 2, 17);
    ug.addColorStop(0, 'rgba(255,160,60,0.28)'); ug.addColorStop(1, 'rgba(255,160,60,0)');
    x.fillStyle = ug; x.fillRect(-17, -15, 34, 34);
    x.translate(0, bob);
    var invuln = g.time < s.invulnUntil;
    if (invuln && Math.floor(now / 110) % 2) x.globalAlpha = 0.45;
    x.rotate(ang);
    // engine flare at the tail, flickering
    var flick = 4.6 + Math.sin(now / 43) * 1.3 + Math.random() * 0.8;
    var flame = x.createRadialGradient(-9, 0, 0.3, -9, 0, flick + 4);
    flame.addColorStop(0, 'rgba(255,240,200,0.95)');
    flame.addColorStop(0.4, 'rgba(255,160,60,0.65)');
    flame.addColorStop(1, 'rgba(255,120,40,0)');
    x.fillStyle = flame;
    x.beginPath(); x.arc(-9.5, 0, flick + 4, 0, Math.PI * 2); x.fill();
    // hull: a glossy teardrop pod, lit from above
    var hull = x.createRadialGradient(-2, -4.5, 1, 0, 0, 12.5);
    hull.addColorStop(0, '#ffffff');
    hull.addColorStop(0.34, '#e6ecf4');
    hull.addColorStop(0.68, '#9aa7ba');
    hull.addColorStop(1, '#525e70');
    x.fillStyle = hull;
    x.shadowColor = 'rgba(0,0,0,0.45)'; x.shadowBlur = 5; x.shadowOffsetY = 2;
    x.beginPath();
    x.moveTo(11.5, 0); x.quadraticCurveTo(5, -8.2, -6.5, -6.4);
    x.quadraticCurveTo(-10.5, 0, -6.5, 6.4); x.quadraticCurveTo(5, 8.2, 11.5, 0);
    x.closePath(); x.fill();
    x.shadowBlur = 0; x.shadowOffsetY = 0;
    x.strokeStyle = 'rgba(24,32,46,0.55)'; x.lineWidth = 0.9; x.stroke();
    // rim light along the lower hull
    x.strokeStyle = 'rgba(160,220,255,0.5)'; x.lineWidth = 1.3; x.lineCap = 'round';
    x.beginPath(); x.moveTo(7.5, 4.4); x.quadraticCurveTo(1, 7.6, -5.5, 5.6); x.stroke();
    // glass canopy with a specular streak
    var can = x.createRadialGradient(3.4, -1.8, 0.4, 3.2, -0.6, 4.6);
    can.addColorStop(0, 'rgba(235,252,255,0.98)');
    can.addColorStop(0.45, 'rgba(140,215,255,0.9)');
    can.addColorStop(1, 'rgba(30,110,190,0.92)');
    x.fillStyle = can;
    x.beginPath(); x.ellipse(3.2, -0.6, 4.3, 3.1, 0.25, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.9)';
    x.beginPath(); x.ellipse(4.4, -2, 1.7, 0.75, 0.5, 0, Math.PI * 2); x.fill();
    // amber heart-core
    var corePulse = 4.3 + Math.sin(now / 180) * 0.5;
    var core = x.createRadialGradient(-2.4, 0.6, 0.4, -2.4, 0.6, 5);
    core.addColorStop(0, '#fff6d8'); core.addColorStop(0.5, '#ffb340'); core.addColorStop(1, '#e2543e');
    x.fillStyle = core;
    x.shadowColor = 'rgba(255,150,60,0.9)'; x.shadowBlur = 9;
    x.beginPath(); x.arc(-2.4, 0.6, corePulse, 0, Math.PI * 2); x.fill();
    x.shadowBlur = 0;
    x.restore();
  }
  function pathPoint(pts, lens, total, s) {
    for (var i = 1; i < pts.length; i++) {
      if (s <= lens[i]) {
        var t = lens[i] === lens[i - 1] ? 0 : (s - lens[i - 1]) / (lens[i] - lens[i - 1]);
        return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t,
                pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
      }
    }
    return pts[pts.length - 1];
  }
  function render(now) {
    var cv = $('vf-canvas'); if (!cv || !VF.game) return;
    var x = cv.getContext('2d');
    var g = VF.game;
    var key = (VF.mode === 'duel' ? 'd' : 's' + g.stage);
    if (VF.terrainKey !== key || !VF.terrain) { VF.terrain = buildTerrain(g.def); VF.terrainKey = key; }
    x.clearRect(0, 0, W, H);
    x.drawImage(VF.terrain, 0, 0);
    var claimed = E.countClaimed(g.grid);
    if (VF.claimedDirty || claimed !== VF.lastClaimed) { buildClaimedLayer(); VF.lastClaimed = claimed; }
    if (VF.claimedLayer) x.drawImage(VF.claimedLayer, 0, 0);
    // capture flash blooming over the territory just won
    if (VF.claimFx && now - VF.claimFx.at < 680) {
      var ct = (now - VF.claimFx.at) / 680, fx = VF.claimFx;
      x.save();
      x.globalCompositeOperation = 'lighter';
      var fr = 30 + ct * 190;
      var fg = x.createRadialGradient(fx.x, fx.y, 2, fx.x, fx.y, fr);
      fg.addColorStop(0, 'hsla(' + fx.hue + ',100%,76%,' + (0.4 * (1 - ct)) + ')');
      fg.addColorStop(1, 'hsla(' + fx.hue + ',100%,76%,0)');
      x.fillStyle = fg;
      x.fillRect(fx.x - fr, fx.y - fr, fr * 2, fr * 2);
      x.strokeStyle = 'hsla(' + fx.hue + ',100%,82%,' + (0.55 * (1 - ct)) + ')';
      x.lineWidth = 2;
      x.beginPath(); x.arc(fx.x, fx.y, fr * 0.72, 0, Math.PI * 2); x.stroke();
      x.restore();
    }
    // blocks waiting to be captured
    g.blocks.forEach(function (b) { if (!b.taken) drawBlock(x, b, now); });
    // the open line: a live energy beam — halo, body, hot core, pulses
    if (g.trail.length) {
      var pts = [];
      for (var i = 0; i < g.trail.length; i++) {
        pts.push([(g.trail[i] % E.COLS) * CELL + CELL / 2,
                  (((g.trail[i] / E.COLS) | 0)) * CELL + CELL / 2]);
      }
      pts.push([VF.shipRx * CELL + CELL / 2, VF.shipRy * CELL + CELL / 2]);
      var lens = [0], total = 0;
      for (var j = 1; j < pts.length; j++) {
        total += Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]);
        lens.push(total);
      }
      function tracePath() {
        x.beginPath();
        x.moveTo(pts[0][0], pts[0][1]);
        for (var q = 1; q < pts.length; q++) x.lineTo(pts[q][0], pts[q][1]);
      }
      x.save();
      x.lineJoin = 'round'; x.lineCap = 'round';
      x.strokeStyle = 'rgba(255,125,31,0.30)'; x.lineWidth = 7.5;
      x.shadowColor = 'rgba(255,125,31,0.55)'; x.shadowBlur = 7;
      tracePath(); x.stroke();
      x.strokeStyle = 'rgba(122,52,4,0.55)'; x.lineWidth = 4.6; x.shadowBlur = 0;
      tracePath(); x.stroke();
      x.strokeStyle = '#ff7d1f'; x.lineWidth = 2.8;
      tracePath(); x.stroke();
      // anchor glow where the line leaves home ground
      var ag = x.createRadialGradient(pts[0][0], pts[0][1], 0.5, pts[0][0], pts[0][1], 8);
      ag.addColorStop(0, 'rgba(255,190,110,0.75)'); ag.addColorStop(1, 'rgba(255,140,40,0)');
      x.fillStyle = ag;
      x.beginPath(); x.arc(pts[0][0], pts[0][1], 8, 0, Math.PI * 2); x.fill();
      x.restore();
    }
    // laser beam flash
    if (VF.beam && now - VF.beam.at < 130) {
      x.save();
      x.strokeStyle = 'rgba(170,245,255,0.95)'; x.lineWidth = 2.4;
      x.shadowColor = 'rgba(120,220,255,0.95)'; x.shadowBlur = 10;
      x.beginPath();
      x.moveTo(VF.shipRx * CELL + CELL / 2, VF.shipRy * CELL + CELL / 2);
      x.lineTo(VF.beam.x * CELL, VF.beam.y * CELL);
      x.stroke(); x.restore();
    }
    // boss sparks: hot glowing orbs with a short trail
    g.sparks.forEach(function (sp) {
      x.save();
      x.globalCompositeOperation = 'lighter';
      var sx = sp.x * CELL, sy = sp.y * CELL;
      x.strokeStyle = 'rgba(255,110,60,0.5)'; x.lineWidth = 2.4; x.lineCap = 'round';
      x.beginPath(); x.moveTo(sx - sp.vx * CELL * 0.09, sy - sp.vy * CELL * 0.09); x.lineTo(sx, sy); x.stroke();
      var sg = x.createRadialGradient(sx, sy, 0.3, sx, sy, 6.4);
      sg.addColorStop(0, 'rgba(255,246,220,0.98)');
      sg.addColorStop(0.4, 'rgba(255,140,60,0.85)');
      sg.addColorStop(1, 'rgba(255,80,40,0)');
      x.fillStyle = sg;
      x.beginPath(); x.arc(sx, sy, 6.4, 0, Math.PI * 2); x.fill();
      x.restore();
    });
    g.minions.forEach(function (m) { if (m.alive) drawMinion(x, m, now); });
    drawBoss(x, g.boss, now);
    drawShip(x, now);
    drawParts(x, now);
    // danger: boss closing in on you or your open line
    if (VF.running && !g.over) {
      var bpx = g.boss.x * CELL, bpy = g.boss.y * CELL;
      var spx = VF.shipRx * CELL + CELL / 2, spy = VF.shipRy * CELL + CELL / 2;
      var bd = Math.hypot(bpx - spx, bpy - spy);
      var danger = bd < 135 ? (1 - bd / 135) : 0;
      if (!g.ship.drawing && g.shield <= 15) danger = Math.max(danger, 0.45);
      if (danger > 0) {
        var pulse = 0.72 + 0.28 * Math.sin(now / 110);
        var dg = x.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.72);
        dg.addColorStop(0, 'rgba(255,36,24,0)');
        dg.addColorStop(1, 'rgba(255,36,24,' + (0.34 * danger * pulse) + ')');
        x.fillStyle = dg; x.fillRect(0, 0, W, H);
      }
      // fresh-hit red flash
      if (VF.hitFx && now - VF.hitFx < 320) {
        x.fillStyle = 'rgba(255,46,32,' + (0.16 * (1 - (now - VF.hitFx) / 320)) + ')';
        x.fillRect(0, 0, W, H);
      }
    }
    // arena frame: a dark rim seating the moonscape in the scene
    x.save();
    var eg = 14;
    var et = x.createLinearGradient(0, 0, 0, eg);
    et.addColorStop(0, 'rgba(34,22,8,0.4)'); et.addColorStop(1, 'rgba(34,22,8,0)');
    x.fillStyle = et; x.fillRect(0, 0, W, eg);
    var eb = x.createLinearGradient(0, H - eg, 0, H);
    eb.addColorStop(0, 'rgba(34,22,8,0)'); eb.addColorStop(1, 'rgba(34,22,8,0.4)');
    x.fillStyle = eb; x.fillRect(0, H - eg, W, eg);
    var el = x.createLinearGradient(0, 0, eg, 0);
    el.addColorStop(0, 'rgba(34,22,8,0.4)'); el.addColorStop(1, 'rgba(34,22,8,0)');
    x.fillStyle = el; x.fillRect(0, 0, eg, H);
    var er = x.createLinearGradient(W - eg, 0, W, 0);
    er.addColorStop(0, 'rgba(34,22,8,0)'); er.addColorStop(1, 'rgba(34,22,8,0.4)');
    x.fillStyle = er; x.fillRect(W - eg, 0, eg, H);
    x.strokeStyle = 'rgba(43,29,12,0.9)'; x.lineWidth = 3;
    roundRect(x, 1.5, 1.5, W - 3, H - 3, 10); x.stroke();
    x.strokeStyle = 'rgba(240,216,160,0.20)'; x.lineWidth = 1;
    roundRect(x, 4.5, 4.5, W - 9, H - 9, 8); x.stroke();
    x.restore();
  }

  /* ---------------- HUD / messages ---------------- */
  function heartsSvg(n) {
    var out = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
      '<radialGradient id="vf-heart-g" cx="35%" cy="28%" r="85%">' +
      '<stop offset="0%" stop-color="#ffd7de"/><stop offset="38%" stop-color="#ff7d92"/>' +
      '<stop offset="72%" stop-color="#f43f5e"/><stop offset="100%" stop-color="#c21430"/>' +
      '</radialGradient></defs></svg>';
    for (var i = 0; i < 3; i++) {
      out += '<svg class="ic ic-inline heart-ic' + (i < n ? '' : ' off') + '" viewBox="0 0 24 24" stroke="none" aria-hidden="true">' +
        '<path fill="' + (i < n ? 'url(#vf-heart-g)' : 'currentColor') + '" d="M12 20.3C6.9 16.4 3.4 13.2 3.4 9.7 3.4 7.1 5.3 5.1 7.8 5.1c1.7 0 3.2.9 4.2 2.4.9-1.5 2.5-2.4 4.2-2.4 2.5 0 4.4 2 4.4 4.6 0 3.5-3.5 6.7-8.6 10.6z"/>' +
        (i < n ? '<ellipse cx="8.2" cy="8.6" rx="2.3" ry="1.5" fill="rgba(255,255,255,0.75)" transform="rotate(-24 8.2 8.6)"/>' : '') +
        '</svg>';
    }
    return out;
  }
  function updateHud() {
    var g = VF.game; if (!g) return;
    var pct = Math.floor(E.claimedPct(g) * 100);
    $('vf-pct').textContent = pct + '%';
    $('vf-score').textContent = g.score;
    $('vf-shield-fill').style.width = Math.max(0, Math.round(g.shield)) + '%';
    $('vf-shield-fill').classList.toggle('low', g.shield <= 25);
    $('vf-lives').innerHTML = heartsSvg(Math.max(0, g.lives));
    $('vf-stage-label').textContent = VF.mode === 'duel'
      ? txt('vfDuelMode')
      : txt('vfStage') + ' ' + (VF.stage + 1) + ' · ' + txt(g.def.nameKey);
    if (VF.duel) {
      $('vf-time').textContent = Math.max(0, Math.ceil(VF.duel.left));
      $('vf-you-fill').style.width = pct + '%';
      $('vf-you-pct').textContent = pct + '%';
      $('vf-bot-fill').style.width = Math.floor(VF.duel.botPct) + '%';
      $('vf-bot-pct').textContent = Math.floor(VF.duel.botPct) + '%';
      $('vf-bot-fill').classList.toggle('flash', VF.duel.flash > 0);
    }
  }
  function setMsg(str) { var m = $('vf-msg'); if (m) m.textContent = str; }

  /* ---------------- events ---------------- */
  function onEvents(evs) {
    var g = VF.game;
    for (var i = 0; i < evs.length; i++) {
      var ev = evs[i];
      if (ev.type === 'capture') {
        VF.claimedDirty = true;
        var cen = claimedCentroid();
        VF.claimFx = { at: performance.now(), x: cen.x, y: cen.y, hue: 32 };
        spawnBurst(VF.shipRx * CELL + CELL / 2, VF.shipRy * CELL + CELL / 2,
          32, 16, 165);
        if (ev.powers && ev.powers.length) {
          spawnBurst(cen.x, cen.y, 46, 18, 190);
          setMsg(txt('vfPowerUp').replace('{name}', txt('vfPower_' + ev.powers[0])));
        } else setMsg(fill(txt('vfCapture'), { p: Math.floor(ev.pct * 100) }));
      } else if (ev.type === 'power') {
        setMsg(txt('vfPowerUp').replace('{name}', txt('vfPower_' + ev.kind)));
      } else if (ev.type === 'kill' && ev.by === 'laser') {
        var dead = null;
        g.minions.forEach(function (m) { if (!m.alive) dead = m; });
        if (dead) {
          VF.beam = { x: dead.x, y: dead.y, at: performance.now() };
          spawnBurst(dead.x * CELL, dead.y * CELL, 330, 10, 150);
        }
      } else if (ev.type === 'hit') {
        VF.hitFx = performance.now();
        spawnBurst(VF.shipRx * CELL + CELL / 2, VF.shipRy * CELL + CELL / 2, 8, 16, 180);
        setMsg(txt(ev.cause === 'line' ? 'vfHitLine' : ev.cause === 'ship' ? 'vfHitShip'
          : ev.cause === 'spark' ? 'vfHitSpark' : 'vfHitExposed'));
      } else if (ev.type === 'clear') {
        finishSolo(true);
      } else if (ev.type === 'over') {
        if (VF.mode === 'boss') finishSolo(false);
      }
    }
  }
  function recordBest() {
    var g = VF.game;
    var key = VF.mode === 'duel' ? 'duel' : String(VF.stage);
    if (!progress.best[key] || g.score > progress.best[key]) progress.best[key] = g.score;
  }
  function finishSolo(cleared) {
    VF.running = false;
    var g = VF.game;
    recordBest();
    var res = $('vf-result'), rt = $('vf-result-text');
    if (cleared) {
      celebrate(g.boss.x * CELL, g.boss.y * CELL, VF.game.def.hue);
      if (VF.stage >= E.STAGES.length - 1) {
        rt.textContent = fill(txt('vfCampaignClear'), { s: g.score });
      } else {
        rt.textContent = fill(txt('vfStageClear'), { s: g.score, r: SOLO_REWARD });
        progress.unlocked = Math.max(progress.unlocked, VF.stage + 2);
      }
      if (window.addCoins) addCoins(SOLO_REWARD);
      if (window.bumpGameWins) bumpGameWins();
      $('vf-next').classList.toggle('hidden', VF.stage >= E.STAGES.length - 1);
    } else {
      rt.textContent = fill(txt('vfGameOver'), { s: g.score });
      $('vf-next').classList.add('hidden');
    }
    saveProgress();
    res.classList.remove('hidden');
    $('vf-start').textContent = txt('vfRetry');
    syncStageChips();
  }
  function finishDuel() {
    VF.running = false;
    var g = VF.game;
    recordBest();
    var you = Math.floor(E.claimedPct(g) * 100), bot = Math.floor(VF.duel.botPct);
    var res = $('vf-result'), rt = $('vf-result-text');
    if (you > bot) {
      celebrate(W / 2, H / 2, 32);
      rt.textContent = fill(txt('vfDuelWin'), { a: you, b: bot, r: DUEL_REWARD });
      progress.duelWins++;
      if (window.addCoins) addCoins(DUEL_REWARD);
      if (window.bumpGameWins) bumpGameWins();
    } else if (you < bot) {
      rt.textContent = fill(txt('vfDuelLose'), { a: you, b: bot });
    } else {
      rt.textContent = fill(txt('vfDuelDraw'), { a: you });
    }
    $('vf-next').classList.add('hidden');
    saveProgress();
    res.classList.remove('hidden');
    $('vf-start').textContent = txt('vfRetry');
  }

  /* ---------------- main loop ---------------- */
  function loop(ts) {
    if (!VF.running) return;
    var panel = $('panel-game-volfield');
    if (!panel || panel.classList.contains('hidden')) { pauseGame(true); return; }
    if (!VF.lastTs) VF.lastTs = ts;
    var dt = Math.min(0.05, (ts - VF.lastTs) / 1000);
    VF.lastTs = ts;
    var g = VF.game;
    if (g && !g.over) {
      var evs = E.step(g, dt);
      if (evs.length) onEvents(evs);
    }
    // smooth ship render position toward its cell
    var k = 1 - Math.pow(0.000001, dt);
    VF.shipRx += (g.ship.cx - VF.shipRx) * k;
    VF.shipRy += (g.ship.cy - VF.shipRy) * k;
    if (VF.duel && VF.running) {
      VF.duel.left -= dt;
      VF.duel.flash = Math.max(0, VF.duel.flash - dt);
      VF.duel.nextBite -= dt;
      if (VF.duel.nextBite <= 0) {
        VF.duel.nextBite = 5.5 + Math.random() * 2.5;
        if (Math.random() < 0.13 && VF.duel.botPct > 8) {
          VF.duel.botPct = Math.max(0, VF.duel.botPct - 6);
          VF.duel.flash = 0.7;
        } else {
          VF.duel.botPct = Math.min(92, VF.duel.botPct + 4 + Math.random() * 2.5);
        }
      }
      if (VF.duel.left <= 0) { render(ts); updateHud(); finishDuel(); return; }
    }
    render(ts);
    updateHud();
    if (VF.running) VF.raf = requestAnimationFrame(loop);
  }
  function startLoop() {
    cancelAnimationFrame(VF.raf);
    VF.lastTs = 0;
    VF.raf = requestAnimationFrame(loop);
  }

  /* ---------------- controls ---------------- */
  function startGame() {
    newGame();
    $('vf-result').classList.add('hidden');
    VF.paused = false; VF.running = true;
    $('vf-start').textContent = txt('vfPause');
    setMsg(VF.mode === 'duel' ? txt('vfDuelHint') : txt('vfRules'));
    updateHud(); render(performance.now());
    startLoop();
  }
  function pauseGame(auto) {
    VF.running = false;
    cancelAnimationFrame(VF.raf);
    if (VF.game && !VF.game.over) {
      $('vf-start').textContent = txt('vfResume');
      if (!auto) setMsg(txt('vfPaused'));
    }
  }
  function resumeGame() {
    if (!VF.game || VF.game.over) { startGame(); return; }
    VF.running = true; VF.paused = false;
    $('vf-start').textContent = txt('vfPause');
    startLoop();
  }
  function setMode(mode) {
    if (VF.mode === mode) return;
    VF.mode = mode;
    VF.running = false; cancelAnimationFrame(VF.raf);
    $('vf-mode-boss').classList.toggle('active', mode === 'boss');
    $('vf-mode-duel').classList.toggle('active', mode === 'duel');
    $('vf-stage-row').classList.toggle('hidden', mode === 'duel');
    $('vf-duel-bar').classList.toggle('hidden', mode !== 'duel');
    $('vf-time-chip').classList.toggle('hidden', mode !== 'duel');
    $('vf-start').textContent = txt('vfStart');
    $('vf-result').classList.add('hidden');
    newGame();
    setMsg(mode === 'duel' ? txt('vfDuelHint') : txt('vfMsgReady'));
    updateHud(); render(performance.now());
  }
  function syncStageChips() {
    $('vf-stage-name').textContent =
      txt('vfStage') + ' ' + (VF.stage + 1) + ' — ' + txt(E.STAGES[VF.stage].nameKey);
    $('vf-stage-prev').disabled = VF.stage <= 0;
    $('vf-stage-next').disabled = VF.stage >= E.STAGES.length - 1;
    var best = progress.best[String(VF.stage)];
    $('vf-best').textContent = best ? fill(txt('vfBest'), { s: best }) : '';
  }
  function pickStage(d) {
    var n = VF.stage + d;
    if (n < 0 || n >= E.STAGES.length) return;
    if (n + 1 > progress.unlocked) { toast(txt('vfStageLocked')); return; }
    VF.stage = n;
    VF.running = false; cancelAnimationFrame(VF.raf);
    $('vf-start').textContent = txt('vfStart');
    $('vf-result').classList.add('hidden');
    newGame(); syncStageChips();
    setMsg(txt('vfMsgReady'));
    updateHud(); render(performance.now());
  }
  function steer(x, y) { if (VF.game) E.setDir(VF.game, x, y); }

  function initVolfield() {
    var cv = $('vf-canvas');
    if (!cv) return;
    if (!VF.game) newGame();
    if (!VF.wired) {
      VF.wired = true;
      $('vf-mode-boss').addEventListener('click', function () { setMode('boss'); });
      $('vf-mode-duel').addEventListener('click', function () { setMode('duel'); });
      $('vf-stage-prev').addEventListener('click', function () { pickStage(-1); });
      $('vf-stage-next').addEventListener('click', function () { pickStage(1); });
      $('vf-start').addEventListener('click', function () {
        if (VF.running) pauseGame(false);
        else if (VF.game && !VF.game.over && VF.lastTs) resumeGame();
        else startGame();
      });
      $('vf-again').addEventListener('click', startGame);
      $('vf-next').addEventListener('click', function () { pickStage(1); if (VF.stage < E.STAGES.length) startGame(); });
      $('vf-challenge').addEventListener('click', function () {
        if (window.openChallengePicker) {
          var g = VF.game;
          openChallengePicker('volfield', g ? (Math.floor(E.claimedPct(g) * 100) + '% · ' + g.score) : null);
        }
      });
      // steering: swipe on the field (dominant axis, re-anchored)
      var anchor = null;
      cv.addEventListener('pointerdown', function (e) {
        anchor = { x: e.clientX, y: e.clientY };
        try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      });
      cv.addEventListener('pointermove', function (e) {
        if (!anchor) return;
        var dx = e.clientX - anchor.x, dy = e.clientY - anchor.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
        if (Math.abs(dx) > Math.abs(dy)) steer(dx > 0 ? 1 : -1, 0);
        else steer(0, dy > 0 ? 1 : -1);
        anchor = { x: e.clientX, y: e.clientY };
      });
      function endPointer() { anchor = null; }
      cv.addEventListener('pointerup', endPointer);
      cv.addEventListener('pointercancel', endPointer);
      // D-pad
      [['vf-pad-up', 0, -1], ['vf-pad-down', 0, 1], ['vf-pad-left', -1, 0], ['vf-pad-right', 1, 0]]
        .forEach(function (cfg) {
          var btn = $(cfg[0]);
          if (btn) btn.addEventListener('pointerdown', function (e) {
            e.preventDefault(); steer(cfg[1], cfg[2]);
          });
        });
      document.addEventListener('keydown', function (e) {
        var panel = $('panel-game-volfield');
        if (!panel || panel.classList.contains('hidden')) return;
        var map = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
          w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0] };
        var d = map[e.key];
        if (d) { e.preventDefault(); steer(d[0], d[1]); }
      });
    }
    // refresh static labels for the current language
    $('vf-mode-boss').textContent = txt('vfBossMode');
    $('vf-mode-duel').textContent = txt('vfDuelMode');
    $('vf-rules').textContent = txt('vfRules');
    $('vf-you-label').textContent = txt('vfYou');
    $('vf-bot-label').textContent = txt('vfBot');
    $('vf-claimed-label').textContent = txt('vfClaimed');
    $('vf-score-label').textContent = txt('vfScore');
    $('vf-shield-label').textContent = txt('vfShield');
    $('vf-next').textContent = txt('vfNextStage');
    if (!VF.running) {
      $('vf-start').textContent = txt('vfStart');
      setMsg(txt('vfMsgReady'));
    }
    syncStageChips();
    updateHud();
    render(performance.now());
  }

  /* openGame stays the single door (gates included); wrap it like
   * foodninja.js does, and stop our loop when another game opens. */
  var origOpenGame = window.openGame;
  if (typeof origOpenGame === 'function') {
    window.openGame = function (id) {
      origOpenGame(id);
      if (id === 'volfield') initVolfield();
      else if (VF.running) pauseGame(true);
    };
  }

  window.Volfield = {
    init: initVolfield, engine: E, state: VF,
    start: startGame, setMode: setMode, steer: steer
  };
})();
