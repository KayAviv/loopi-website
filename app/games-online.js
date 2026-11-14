'use strict';
/* LOOPI — Pong Clash upgrade: king-pong visuals, extras, online 1v1.
 *
 * Loaded after app.js and takes over the Ping Pong panel only (the
 * level gate in openGame still applies first). app.js's simple bot
 * loop is stopped and its Start button re-bound; everything else in
 * the app is untouched.
 *
 * Two modes, one renderer:
 *  - Bot match: a local engine mirroring the server rules in
 *    src/gamerooms.js — power-up orbs (big paddle / slow ball /
 *    multi-ball / shield), spin off a moving paddle, and the same
 *    escalating bot difficulty curve as before.
 *  - Online 1v1: a WebSocket to /v1/games/ws (src/gamerooms.js). The
 *    SERVER ticks the game; this module renders its snapshots. Your
 *    own paddle is drawn from your pointer directly (the server stays
 *    authoritative for the ball, the opponent and the score).
 *
 * Accepting a 🏓 challenge card in chat lands here in Online mode
 * with a room already created — send the 4-letter code back to your
 * friend and they Join with it. The room transport is real; the
 * challenge cards themselves still ride the demo message layer and
 * stay labelled "demo", as app.js documents.
 */
(function () {
  var W = 360, H = 480, BALL_R = 6, PADDLE_H = 10, BASE_W = 74;
  var WIN = 7, BASE_SPEED = 252, MAX_SPEED = 540;
  var PU_ICONS = { big: 'WIDE', slow: 'SLOW', multi: 'MULTI', shield: 'SHIELD' };

  var TXT = {
    en: {
      needAccount: 'Online play needs a signed-in account on the LOOPI server — you are browsing the demo.',
      connecting: 'Connecting…', connected: 'Connected. Create a room, quick-match, or join with a code.',
      waiting: 'Waiting for your friend to join with this code…',
      queued: 'Looking for an opponent… a bot takes the seat if nobody shows within 20 seconds.',
      matchOn: 'Match on — first to 7. Good luck!',
      over: 'Match over.', leftRoom: 'You left the match.',
      oppLeft: 'Your opponent left — match ended.',
      connClosed: 'Connection closed. Online play needs a signed-in account on the LOOPI server.',
      badCode: 'Enter the 4-letter room code first.',
      onlineHint: 'Online 1v1: the server runs the match — power-ups and spin included, same rules as bot mode.',
      win: 'You win', lose: 'Bot wins', winFriend: 'You win the duel', loseFriend: 'Your friend takes it',
      pu_big: 'BIG PADDLE!', pu_slow: 'SLOW BALL!', pu_multi: 'MULTI-BALL!', pu_shield: 'SHIELD!',
      slowBall: 'SLOW BALL', saved: '️ SAVED!',
      winCanvas: 'YOU WIN', loseCanvas: 'BOT WINS', loseFriendCanvas: 'YOU LOSE',
      errorWord: 'Error'
    },
    zh: {
      needAccount: '在线对战需要登录 LOOPI 服务器账号 — 你现在浏览的是演示模式。',
      connecting: '连接中…', connected: '已连接。创建房间、快速匹配，或用代码加入。',
      waiting: '等待朋友用这个代码加入…',
      queued: '正在寻找对手…20 秒内没人加入将由机器人补位。',
      matchOn: '比赛开始 — 先到 7 分。祝你好运！',
      over: '比赛结束。', leftRoom: '你已离开比赛。',
      oppLeft: '对手离开了 — 比赛结束。',
      connClosed: '连接已断开。在线对战需要登录 LOOPI 服务器账号。',
      badCode: '请先输入 4 位房间代码。',
      onlineHint: '在线 1v1：服务器主持比赛 — 包含道具和旋转，规则与机器人模式相同。',
      win: '你赢了', lose: '机器人获胜', winFriend: '你赢下了对决', loseFriend: '你的朋友赢了',
      pu_big: '大球拍！', pu_slow: '慢速球！', pu_multi: '多重球！', pu_shield: '护盾！',
      slowBall: '慢速球', saved: '️ 挡住了！',
      winCanvas: '你赢了', loseCanvas: '机器人获胜', loseFriendCanvas: '你输了',
      errorWord: '出错了'    },
    hi: {
      needAccount: '\u0911\u0928\u0932\u093E\u0907\u0928 \u0916\u0947\u0932\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F LOOPI \u0938\u0930\u094D\u0935\u0930 \u092A\u0930 \u0938\u093E\u0907\u0928-\u0907\u0928 \u0915\u093F\u092F\u093E \u0939\u0941\u0906 \u0905\u0915\u093E\u0909\u0902\u091F \u091A\u093E\u0939\u093F\u090F \u2014 \u0906\u092A \u0921\u0947\u092E\u094B \u092C\u094D\u0930\u093E\u0909\u091C\u093C \u0915\u0930 \u0930\u0939\u0947 \u0939\u0948\u0902\u0964',
      connecting: '\u0915\u0928\u0947\u0915\u094D\u091F \u0939\u094B \u0930\u0939\u093E \u0939\u0948\u2026',
      connected: '\u0915\u0928\u0947\u0915\u094D\u091F \u0939\u094B \u0917\u092F\u093E\u0964 \u0930\u0942\u092E \u092C\u0928\u093E\u090F\u0902, \u0915\u094D\u0935\u093F\u0915-\u092E\u0948\u091A \u0915\u0930\u0947\u0902, \u092F\u093E \u0915\u094B\u0921 \u0938\u0947 \u091C\u0949\u0907\u0928 \u0915\u0930\u0947\u0902\u0964',
      waiting: '\u0906\u092A\u0915\u0947 \u0926\u094B\u0938\u094D\u0924 \u0915\u0947 \u0907\u0938 \u0915\u094B\u0921 \u0938\u0947 \u091C\u0949\u0907\u0928 \u0915\u0930\u0928\u0947 \u0915\u093E \u0907\u0902\u0924\u091C\u093C\u093E\u0930 \u0939\u0948\u2026',
      queued: '\u0935\u093F\u0930\u094B\u0927\u0940 \u0916\u094B\u091C \u0930\u0939\u0947 \u0939\u0948\u0902\u2026 \u0905\u0917\u0930 20 \u0938\u0947\u0915\u0902\u0921 \u092E\u0947\u0902 \u0915\u094B\u0908 \u0928\u0939\u0940\u0902 \u0906\u092F\u093E \u0924\u094B \u092C\u0949\u091F \u0938\u0940\u091F \u0932\u0947 \u0932\u0947\u0917\u093E\u0964',
      matchOn: '\u092E\u0948\u091A \u0936\u0941\u0930\u0942 \u2014 \u092A\u0939\u0932\u0947 7 \u0924\u0915\u0964 \u0917\u0941\u0921 \u0932\u0915!',
      over: '\u092E\u0948\u091A \u0916\u093C\u0924\u094D\u092E\u0964',
      leftRoom: '\u0906\u092A\u0928\u0947 \u092E\u0948\u091A \u091B\u094B\u0921\u093C \u0926\u093F\u092F\u093E\u0964',
      oppLeft: '\u0906\u092A\u0915\u093E \u0935\u093F\u0930\u094B\u0927\u0940 \u091A\u0932\u093E \u0917\u092F\u093E \u2014 \u092E\u0948\u091A \u0916\u093C\u0924\u094D\u092E\u0964',
      connClosed: '\u0915\u0928\u0947\u0915\u094D\u0936\u0928 \u092C\u0902\u0926 \u0939\u094B \u0917\u092F\u093E\u0964 \u0911\u0928\u0932\u093E\u0907\u0928 \u0916\u0947\u0932\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F LOOPI \u0938\u0930\u094D\u0935\u0930 \u092A\u0930 \u0938\u093E\u0907\u0928-\u0907\u0928 \u0915\u093F\u092F\u093E \u0939\u0941\u0906 \u0905\u0915\u093E\u0909\u0902\u091F \u091A\u093E\u0939\u093F\u090F\u0964',
      badCode: '\u092A\u0939\u0932\u0947 4 \u0905\u0915\u094D\u0937\u0930\u094B\u0902 \u0935\u093E\u0932\u093E \u0930\u0942\u092E \u0915\u094B\u0921 \u0921\u093E\u0932\u0947\u0902\u0964',
      onlineHint: '\u0911\u0928\u0932\u093E\u0907\u0928 1v1: \u092E\u0948\u091A \u0938\u0930\u094D\u0935\u0930 \u091A\u0932\u093E\u0924\u093E \u0939\u0948 \u2014 \u092A\u093E\u0935\u0930-\u0905\u092A \u0914\u0930 \u0938\u094D\u092A\u093F\u0928 \u0936\u093E\u092E\u093F\u0932 \u0939\u0948\u0902, \u092C\u0949\u091F \u092E\u094B\u0921 \u091C\u0948\u0938\u0947 \u0939\u0940 \u0928\u093F\u092F\u092E\u0964',
      win: '\uD83C\uDFC6 \u0906\u092A \u091C\u0940\u0924\u0947',
      lose: '\u092C\u0949\u091F \u091C\u0940\u0924\u093E',
      winFriend: '\uD83C\uDFC6 \u0906\u092A\u0928\u0947 \u092E\u0941\u0915\u093C\u093E\u092C\u0932\u093E \u091C\u0940\u0924 \u0932\u093F\u092F\u093E',
      loseFriend: '\u0906\u092A\u0915\u0947 \u0926\u094B\u0938\u094D\u0924 \u0928\u0947 \u091C\u0940\u0924 \u0932\u093F\u092F\u093E',
      pu_big: '\u092C\u0921\u093C\u093E \u092A\u0948\u0921\u0932!',
      pu_slow: '\u0927\u0940\u092E\u0940 \u092C\u0949\u0932!',
      pu_multi: '\u092E\u0932\u094D\u091F\u0940-\u092C\u0949\u0932!',
      pu_shield: '\u0936\u0940\u0932\u094D\u0921!',
      slowBall: '\uD83D\uDC22 \u0927\u0940\u092E\u0940 \u092C\u0949\u0932',
      saved: '\uD83D\uDEE1\uFE0F \u092C\u091A\u093E \u0932\u093F\u092F\u093E!',
      winCanvas: '\uD83C\uDFC6 \u0906\u092A \u091C\u0940\u0924\u0947',
      loseCanvas: '\u092C\u0949\u091F \u091C\u0940\u0924\u093E',
      loseFriendCanvas: '\u0906\u092A \u0939\u093E\u0930\u0947',
      errorWord: '\u090F\u0930\u0930',
    }
  };
  function tt(k) {
    var l = (window.lang === 'zh') ? 'zh' : 'en';
    return (TXT[l] && TXT[l][k]) || TXT.en[k] || k;
  }
  function $(id) { return document.getElementById(id); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  var S = {
    inited: false, mode: 'bot', raf: null, lastTs: 0,
    particles: [], popups: [], trails: {}, shake: 0,
    local: null, localRunning: false,
    ws: null, wsOpen: false, pendingAction: null,
    role: null, code: null, snap: null, started: false, over: false,
    myPointerX: null, lastSentX: null, lastSentAt: 0,
    prevScore: { me: 0, opp: 0 }, prevBalls: []
  };
  var invitePending = false;

  /* ================= local bot engine (mirrors src/gamerooms.js) ================= */
  function newLocalMatch() {
    function player() { return { x: W / 2, w: BASE_W, score: 0, shield: false, bigUntil: 0, vel: 0, lastIn: -1 }; }
    var m = {
      time: 0, over: false, winner: null, me: player(), bot: player(),
      balls: [], powerups: [], slowUntil: 0, rallyHits: 0,
      nextSpawnAt: 3500 + Math.random() * 2000, nextPuId: 1, nextBallId: 1
    };
    localServe(m, Math.random() < 0.5 ? 'me' : 'bot');
    return m;
  }
  function localServe(m, toward) {
    m.balls = [{
      id: m.nextBallId++, x: W / 2, y: H / 2, speed: BASE_SPEED,
      vx: (Math.random() * 2 - 1) * 110,
      vy: (toward === 'me' ? 1 : -1) * BASE_SPEED * 0.72,
      curve: 0, extra: false, bornAt: m.time, lastHit: toward === 'me' ? 'bot' : 'me'
    }];
    m.rallyHits = 0;
  }
  function localSetInput(m, p, centerX) {
    var nx = clamp(centerX, p.w / 2, W - p.w / 2);
    if (p.lastIn >= 0 && m.time > p.lastIn) {
      var inst = (nx - p.x) / ((m.time - p.lastIn) / 1000);
      p.vel = p.vel * 0.55 + inst * 0.45;
    }
    p.x = nx; p.lastIn = m.time;
  }
  function localBounce(m, p, role, b, evs) {
    var rel = clamp((b.x - p.x) / (p.w / 2), -1, 1);
    b.speed = Math.min(MAX_SPEED, b.speed * 1.05);
    b.vx = rel * b.speed * 0.85;
    b.vy = (role === 'me' ? -1 : 1) * b.speed * 0.72;
    b.curve = clamp(p.vel * 2.0, -1100, 1100);
    b.y = role === 'me' ? (H - 26) - BALL_R - 1 : 16 + PADDLE_H + BALL_R + 1;
    b.lastHit = role;
    m.rallyHits++;
    evs.push({ type: 'hit', x: b.x, y: b.y, me: role === 'me' });
  }
  function localPoint(m, scorer, evs) {
    var p = scorer === 'me' ? m.me : m.bot;
    p.score++;
    evs.push({ type: 'point', scorer: scorer, sMe: m.me.score, sOpp: m.bot.score });
    if (p.score >= WIN) {
      m.over = true; m.winner = scorer;
      evs.push({ type: 'over', winner: scorer });
      return;
    }
    localServe(m, scorer === 'me' ? 'bot' : 'me');
  }
  function localStep(m, dtMs) {
    var evs = [];
    if (m.over) return evs;
    m.time += dtMs;
    var dt = dtMs / 1000;
    [m.me, m.bot].forEach(function (p) {
      p.w = m.time < p.bigUntil ? Math.round(BASE_W * 1.55) : BASE_W;
      p.x = clamp(p.x, p.w / 2, W - p.w / 2);
      if (m.time - p.lastIn > 140) p.vel *= 0.8;
    });
    // bot AI: the original difficulty curve, px/s
    var b0 = m.balls[0];
    if (b0) {
      var maxSpeed = Math.min(372, 162 + m.me.score * 21 + m.rallyHits * 1.8);
      var incoming = b0.vy < 0;
      var target = incoming ? b0.x : W / 2;
      var spd = incoming ? maxSpeed : 72;
      localSetInput(m, m.bot, m.bot.x + clamp(target - m.bot.x, -spd * dt, spd * dt));
    }
    if (m.time >= m.nextSpawnAt) {
      if (m.powerups.length < 2) {
        var kinds = ['big', 'slow', 'multi', 'shield'];
        m.powerups.push({
          id: m.nextPuId++, x: 56 + Math.random() * (W - 112), y: 168 + Math.random() * 144,
          kind: kinds[Math.floor(Math.random() * kinds.length)], expiresAt: m.time + 6000
        });
      }
      m.nextSpawnAt = m.time + 6000 + Math.random() * 3000;
    }
    m.powerups = m.powerups.filter(function (pu) { return m.time < pu.expiresAt; });
    var effDt = dt * (m.time < m.slowUntil ? 0.55 : 1);
    var dead = [];
    for (var bi = 0; bi < m.balls.length; bi++) {
      var b = m.balls[bi];
      b.vx += b.curve * effDt;
      b.curve *= Math.exp(-2.0 * effDt);
      b.x += b.vx * effDt;
      b.y += b.vy * effDt;
      if (b.x < BALL_R) { b.x = BALL_R; b.vx = Math.abs(b.vx); evs.push({ type: 'wall', x: b.x, y: b.y }); }
      if (b.x > W - BALL_R) { b.x = W - BALL_R; b.vx = -Math.abs(b.vx); evs.push({ type: 'wall', x: b.x, y: b.y }); }
      if (b.vy > 0 && b.y + BALL_R >= H - 26 && b.y + BALL_R <= H - 26 + PADDLE_H + 12 &&
          b.x >= m.me.x - m.me.w / 2 - BALL_R && b.x <= m.me.x + m.me.w / 2 + BALL_R) localBounce(m, m.me, 'me', b, evs);
      else if (b.vy < 0 && b.y - BALL_R <= 16 + PADDLE_H && b.y - BALL_R >= 16 - 12 &&
          b.x >= m.bot.x - m.bot.w / 2 - BALL_R && b.x <= m.bot.x + m.bot.w / 2 + BALL_R) localBounce(m, m.bot, 'bot', b, evs);
      for (var i = m.powerups.length - 1; i >= 0; i--) {
        var pu = m.powerups[i];
        var dx = b.x - pu.x, dy = b.y - pu.y;
        if (dx * dx + dy * dy < 26 * 26) {
          m.powerups.splice(i, 1);
          var role = b.lastHit || 'me';
          var tp = role === 'me' ? m.me : m.bot;
          if (pu.kind === 'big') tp.bigUntil = m.time + 8000;
          else if (pu.kind === 'slow') m.slowUntil = m.time + 5000;
          else if (pu.kind === 'shield') tp.shield = true;
          else if (pu.kind === 'multi') {
            m.balls.push({
              id: m.nextBallId++, x: W / 2, y: H / 2, speed: BASE_SPEED,
              vx: (Math.random() * 2 - 1) * 130, vy: (role === 'me' ? -1 : 1) * BASE_SPEED * 0.72,
              curve: 0, extra: true, bornAt: m.time, lastHit: role
            });
          }
          evs.push({ type: 'powerup', kind: pu.kind, role: role, x: pu.x, y: pu.y });
        }
      }
      if (b.y > H + 12) {
        if (b.extra) dead.push(b);
        else if (m.me.shield) { m.me.shield = false; b.vy = -Math.abs(b.vy); b.y = H - 12; evs.push({ type: 'shield', role: 'me', x: b.x, y: b.y }); }
        else { localPoint(m, 'bot', evs); dead.push(b); if (m.over) break; }
      } else if (b.y < -12) {
        if (b.extra) dead.push(b);
        else if (m.bot.shield) { m.bot.shield = false; b.vy = Math.abs(b.vy); b.y = 12; evs.push({ type: 'shield', role: 'bot', x: b.x, y: b.y }); }
        else { localPoint(m, 'me', evs); dead.push(b); if (m.over) break; }
      } else if (b.extra && m.time - b.bornAt > 10000) dead.push(b);
    }
    if (dead.length) m.balls = m.balls.filter(function (x) { return dead.indexOf(x) < 0; });
    return evs;
  }

  /* ================= FX + renderer ================= */
  function burst(x, y, color, n, power) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = (0.3 + Math.random() * 0.7) * (power || 130);
      S.particles.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0, max: 380 + Math.random() * 320, color: color, size: 1.4 + Math.random() * 2.2
      });
    }
    if (S.particles.length > 260) S.particles.splice(0, S.particles.length - 260);
  }
  function popup(x, y, text, color) {
    S.popups.push({ x: x, y: y, text: text, color: color || '#f4f6ff', life: 0, max: 950 });
  }
  function applyFx(evs, mine) {
    evs.forEach(function (e) {
      if (e.type === 'hit') burst(e.x, e.y, e.me ? '#b6ff3c' : '#57a7ff', 9, 120);
      else if (e.type === 'wall') burst(e.x, e.y, 'rgba(160,180,255,.8)', 3, 70);
      else if (e.type === 'powerup') {
        burst(e.x || W / 2, e.y || H / 2, '#ffd84d', 16, 160);
        popup(e.x || W / 2, (e.y || H / 2) - 22, PU_ICONS[e.kind] + ' ' + tt('pu_' + e.kind), (e.role === mine) ? '#b6ff3c' : '#57a7ff');
      } else if (e.type === 'shield') {
        burst(e.x || W / 2, e.y || H / 2, '#7dfcd4', 18, 170);
        popup(e.x || W / 2, (e.y || H / 2) + (e.role === mine ? -34 : 30), tt('saved'), '#7dfcd4');
      } else if (e.type === 'point') {
        var iScored = e.scorer === mine;
        S.shake = iScored ? 3 : 7;
        popup(W / 2, iScored ? H - 120 : 120, '+1', iScored ? '#b6ff3c' : '#ff5470');
        burst(W / 2, iScored ? 8 : H - 8, iScored ? '#57a7ff' : '#b6ff3c', 20, 200);
      }
    });
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function drawPaddle(ctx, cx, y, w, color, shield) {
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = 15;
    var g = ctx.createLinearGradient(cx - w / 2, y, cx + w / 2, y);
    g.addColorStop(0, color); g.addColorStop(0.5, '#ffffff'); g.addColorStop(1, color);
    ctx.fillStyle = g;
    roundRect(ctx, cx - w / 2, y, w, PADDLE_H, 5);
    ctx.fill();
    ctx.restore();
    if (shield) {
      ctx.save();
      ctx.strokeStyle = 'rgba(125,252,212,.85)'; ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      roundRect(ctx, cx - w / 2 - 5, y - 5, w + 10, PADDLE_H + 10, 9);
      ctx.stroke();
      ctx.restore();
    }
  }
  /* scene: everything already in MY view (my paddle at the bottom) */
  function drawScene(ctx, sc, ts) {
    ctx.save();
    if (S.shake > 0.2) ctx.translate((Math.random() - 0.5) * 2 * S.shake, (Math.random() - 0.5) * 2 * S.shake);
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#a5dcf7'); g.addColorStop(0.5, '#d8f2fd'); g.addColorStop(1, '#fdf0d2');
    ctx.fillStyle = g; ctx.fillRect(-12, -12, W + 24, H + 24);
    // neon frame + centre net
    ctx.strokeStyle = 'rgba(31,110,200,.45)'; ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);
    ctx.save();
    ctx.shadowColor = 'rgba(31,110,200,.5)'; ctx.shadowBlur = 8;
    ctx.strokeStyle = 'rgba(37,52,63,.25)'; ctx.setLineDash([7, 8]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
    ctx.restore();
    // scores
    ctx.textAlign = 'center';
    ctx.font = '900 46px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(31,110,200,.4)';
    ctx.fillText(String(sc.oppScore), W / 2, H / 2 - 24);
    ctx.fillStyle = 'rgba(255,107,74,.45)';
    ctx.fillText(String(sc.myScore), W / 2, H / 2 + 64);
    if (sc.slow) {
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(185,126,12,.95)';
      ctx.fillText(tt('slowBall'), W / 2, 24);
    }
    // power-up orbs
    sc.pus.forEach(function (pu) {
      var pulse = 1 + 0.13 * Math.sin(ts / 170 + pu.x);
      ctx.save();
      ctx.shadowColor = '#ffd84d'; ctx.shadowBlur = 16;
      ctx.fillStyle = 'rgba(255,216,77,.16)';
      ctx.beginPath(); ctx.arc(pu.x, pu.y, 15 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,216,77,.9)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(pu.x, pu.y, 13 * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.font = (pu.kind === 'big' ? '900 13px' : '12px') + ' system-ui, sans-serif';
      ctx.fillStyle = '#b97e0c';
      ctx.fillText(PU_ICONS[pu.kind], pu.x, pu.y + 4.5);
      ctx.restore();
    });
    // ball trails
    sc.balls.forEach(function (b) {
      var tr = S.trails[b.key] || [];
      for (var i = 0; i < tr.length; i++) {
        var p = tr[i], f = (i + 1) / tr.length;
        ctx.fillStyle = b.extra ? 'rgba(168,85,247,' + (0.25 * f) + ')' : 'rgba(37,52,63,' + (0.22 * f) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, BALL_R * (0.35 + 0.6 * f), 0, Math.PI * 2); ctx.fill();
      }
    });
    // balls
    sc.balls.forEach(function (b) {
      ctx.save();
      ctx.shadowColor = b.extra ? '#be78ff' : 'rgba(37,52,63,.5)'; ctx.shadowBlur = 10;
      ctx.fillStyle = b.extra ? '#a855f7' : '#25343f';
      ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
    drawPaddle(ctx, sc.oppX, 16, sc.oppW, '#1f7ae0', sc.oppShield);
    drawPaddle(ctx, sc.meX, H - 26, sc.meW, '#ff6b4a', sc.meShield);
    // particles
    S.particles.forEach(function (p) {
      var f = 1 - p.life / p.max;
      ctx.globalAlpha = Math.max(0, f);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * f + 0.4, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    // popups
    S.popups.forEach(function (p) {
      var f = p.life / p.max;
      ctx.globalAlpha = f < 0.7 ? 1 : 1 - (f - 0.7) / 0.3;
      ctx.font = '900 17px system-ui, sans-serif';
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y - f * 34);
    });
    ctx.globalAlpha = 1;
    if (sc.over) {
      ctx.fillStyle = 'rgba(255,251,240,.85)'; ctx.fillRect(-12, -12, W + 24, H + 24);
      ctx.font = '900 27px system-ui, sans-serif';
      ctx.fillStyle = '#25343f';
      ctx.fillText(sc.overText || '', W / 2, H / 2 - 8);
      ctx.font = '700 17px system-ui, sans-serif';
      ctx.fillText(sc.myScore + ' — ' + sc.oppScore, W / 2, H / 2 + 24);
    }
    ctx.restore();
  }
  function stepFx(dtMs) {
    var dt = dtMs / 1000;
    S.particles = S.particles.filter(function (p) {
      p.life += dtMs; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 190 * dt;
      return p.life < p.max;
    });
    S.popups = S.popups.filter(function (p) { p.life += dtMs; return p.life < p.max; });
    S.shake *= Math.exp(-6 * dt);
    if (S.shake < 0.05) S.shake = 0;
  }
  function pushTrail(key, x, y) {
    var tr = S.trails[key] || (S.trails[key] = []);
    tr.push({ x: x, y: y });
    if (tr.length > 13) tr.shift();
  }

  /* ================= scenes per mode ================= */
  function localScene() {
    var m = S.local;
    if (!m) return null;
    return {
      meX: m.me.x, meW: m.me.w, meShield: m.me.shield,
      oppX: m.bot.x, oppW: m.bot.w, oppShield: m.bot.shield,
      balls: m.balls.map(function (b) { return { key: 'L' + b.id, x: b.x, y: b.y, extra: b.extra }; }),
      pus: m.powerups, myScore: m.me.score, oppScore: m.bot.score,
      slow: m.time < m.slowUntil, over: m.over,
      overText: m.over ? (m.winner === 'me' ? tt('winCanvas') : tt('loseCanvas')) : ''
    };
  }
  function onlineScene() {
    var s = S.snap;
    if (!s) return null;
    var flip = S.role === 'p2';
    var mine = flip ? s.p2 : s.p1, theirs = flip ? s.p1 : s.p2;
    var fx = function (x) { return flip ? W - x : x; };
    var fy = function (y) { return flip ? H - y : y; };
    return {
      meX: S.myPointerX !== null ? S.myPointerX : fx(mine.x),
      meW: mine.w, meShield: !!mine.sh,
      oppX: fx(theirs.x), oppW: theirs.w, oppShield: !!theirs.sh,
      balls: s.balls.map(function (b, i) { return { key: 'N' + i, x: fx(b.x), y: fy(b.y), extra: !!b.e }; }),
      pus: s.pus.map(function (pu) { return { x: fx(pu.x), y: fy(pu.y), kind: pu.k }; }),
      myScore: flip ? s.s2 : s.s1, oppScore: flip ? s.s1 : s.s2,
      slow: !!s.slow, over: S.over,
      overText: S.overText || ''
    };
  }
  function frame(ts) {
    S.raf = requestAnimationFrame(frame);
    var panel = $('panel-game-pong');
    if (!panel || panel.classList.contains('hidden')) { stopLoop(); return; }
    var cv = $('pong-canvas');
    if (!cv) return;
    var dtMs = S.lastTs ? Math.min(50, ts - S.lastTs) : 16;
    S.lastTs = ts;
    var ctx = cv.getContext('2d');
    var sc = null;
    if (S.mode === 'bot') {
      if (S.local && S.localRunning && !S.local.over) {
        var evs = localStep(S.local, dtMs);
        applyFx(evs, 'me');
        if (S.local.over) finishLocal();
      }
      sc = localScene();
    } else {
      sc = onlineScene();
      // hit flashes for online: a ball reversing vertical direction
      // near a paddle reads as a bounce
      if (sc) {
        sc.balls.forEach(function (b, i) {
          var prev = S.prevBalls[i];
          b.vy = prev ? (b.y - prev.y) : 0;
          // a vertical direction flip at close range = a paddle hit
          if (prev && prev.vy !== 0 && b.vy !== 0 &&
              Math.sign(prev.vy) !== Math.sign(b.vy) && Math.abs(b.y - prev.y) < 60) {
            burst(b.x, b.y, '#ffffff', 7, 110);
          }
        });
        S.prevBalls = sc.balls.map(function (b) { return { y: b.y, vy: b.vy }; });
      }
    }
    if (sc) {
      sc.balls.forEach(function (b) { pushTrail(b.key, b.x, b.y); });
      stepFx(dtMs);
      drawScene(ctx, sc, ts);
    }
  }
  function startLoop() {
    if (S.raf) return;
    S.lastTs = 0;
    S.raf = requestAnimationFrame(frame);
  }
  function stopLoop() {
    if (S.raf) cancelAnimationFrame(S.raf);
    S.raf = null; S.lastTs = 0;
  }

  /* ================= bot-mode lifecycle ================= */
  function finishLocal() {
    S.localRunning = false;
    var m = S.local;
    var won = m.winner === 'me';
    var reward = won ? 30 : 5;
    if (window.addCoins) addCoins(reward);
    if (won && window.bumpGameWins) bumpGameWins();
    var text = t('gamePong') + ' — ' + t('youWord') + ' ' + m.me.score + ' : ' + m.bot.score + ' ' + t('botWord') + '. ' + t('beatThat');
    if (window.pong) pong.finalText = text;
    $('pong-msg').textContent = (won ? tt('win') : tt('lose')) + ' ' + m.me.score + ' — ' + m.bot.score + ' · +' + reward + ' 🪙';
    $('pong-start').textContent = t('playAgain');
  }
  function startLocal() {
    if (!S.local || S.local.over) {
      S.local = newLocalMatch();
      S.trails = {};
    }
    S.localRunning = true;
    $('pong-start').textContent = t('startGame');
    $('pong-msg').textContent = t('pongRules');
    startLoop();
  }

  /* ================= online (WebSocket to src/gamerooms.js) ================= */
  function sessionToken() {
    try { return (window.S && S.token) || localStorage.getItem('nocta.token') || ''; }
    catch (e) { return ''; }
  }
  function wsUrl() {
    var base = (window.CONFIG && CONFIG.apiBase) || '';
    var origin = base ? base.replace(/^http/i, 'ws')
      : (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
    return origin + '/v1/games/ws?token=' + encodeURIComponent(sessionToken());
  }
  function poStatus(msg) { var n = $('po-status'); if (n) n.textContent = msg || ''; }
  function ensureWs(action) {
    if (!sessionToken()) { poStatus(tt('needAccount')); return; }
    if (S.ws && S.wsOpen) { action(); return; }
    S.pendingAction = action;
    poStatus(tt('connecting'));
    var ws;
    try { ws = new WebSocket(wsUrl()); } catch (e) { poStatus(tt('connClosed')); return; }
    S.ws = ws;
    ws.onopen = function () {
      S.wsOpen = true;
      poStatus(tt('connected'));
      if (S.pendingAction) { var a = S.pendingAction; S.pendingAction = null; a(); }
    };
    ws.onmessage = function (ev) {
      var msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      onServerMsg(msg);
    };
    ws.onclose = function () {
      S.ws = null; S.wsOpen = false; S.started = false;
      if (S.mode === 'online') poStatus(tt('connClosed'));
      $('po-leave').classList.add('hidden');
    };
    ws.onerror = function () { /* onclose follows */ };
  }
  function sendWs(obj) { if (S.ws && S.wsOpen) S.ws.send(JSON.stringify(obj)); }
  function onServerMsg(msg) {
    if (msg.t === 'created') {
      S.code = msg.code; S.role = 'p1';
      $('po-room-code-val').textContent = msg.code;
      $('po-room-code').classList.remove('hidden');
      $('po-leave').classList.remove('hidden');
      poStatus(tt('waiting'));
    } else if (msg.t === 'queued') {
      poStatus(tt('queued'));
      $('po-leave').classList.remove('hidden');
    } else if (msg.t === 'start') {
      S.role = msg.you; S.code = msg.code;
      S.snap = null; S.started = true; S.over = false; S.overText = '';
      S.trails = {}; S.prevScore = { me: 0, opp: 0 }; S.prevBalls = [];
      $('po-room-code').classList.add('hidden');
      $('po-leave').classList.remove('hidden');
      $('pong-msg').textContent = tt('matchOn');
      poStatus('');
      startLoop();
    } else if (msg.t === 'state') {
      S.snap = msg;
      var mine = S.role === 'p2' ? msg.s2 : msg.s1;
      var theirs = S.role === 'p2' ? msg.s1 : msg.s2;
      if (mine !== S.prevScore.me || theirs !== S.prevScore.opp) {
        if (S.started) applyFx([{ type: 'point', scorer: mine > S.prevScore.me ? 'me' : 'opp' }], 'me');
        S.prevScore = { me: mine, opp: theirs };
      }
    } else if (msg.t === 'powerup') {
      var mineRole = S.role;
      popup(W / 2, msg.role === 'p1' ? H - 90 : 90,
        PU_ICONS[msg.kind] + ' ' + tt('pu_' + msg.kind), msg.role === mineRole ? '#b6ff3c' : '#57a7ff');
      burst(W / 2, H / 2, '#ffd84d', 10, 130);
    } else if (msg.t === 'shield') {
      popup(W / 2, msg.role === S.role ? H - 130 : 130, tt('saved'), '#7dfcd4');
    } else if (msg.t === 'over') {
      S.started = false; S.over = true;
      var won = msg.winner === S.role;
      S.overText = won ? tt('winCanvas') : tt('loseFriendCanvas');
      var reward = won ? 30 : 5;
      if (window.addCoins) addCoins(reward);
      if (won && window.bumpGameWins) bumpGameWins();
      var myS = S.role === 'p2' ? msg.s2 : msg.s1;
      var opS = S.role === 'p2' ? msg.s1 : msg.s2;
      if (window.pong) pong.finalText = t('gamePong') + ' 1v1 — ' + t('youWord') + ' ' + myS + ' : ' + opS + '. ' + t('beatThat');
      $('pong-msg').textContent = (won ? tt('winFriend') : tt('loseFriend')) + ' ' + myS + ' — ' + opS + ' · +' + reward + ' 🪙';
      poStatus(tt('over'));
    } else if (msg.t === 'opponent_left') {
      S.started = false;
      poStatus(tt('oppLeft'));
      $('po-leave').classList.add('hidden');
    } else if (msg.t === 'error') {
      poStatus(msg.message || tt('errorWord'));
    } else if (msg.t === 'left') {
      poStatus(tt('leftRoom'));
      $('po-leave').classList.add('hidden');
      $('po-room-code').classList.add('hidden');
    }
  }
  function createRoom() { ensureWs(function () { sendWs({ t: 'create' }); }); }
  function joinRoom() {
    var code = ($('po-code').value || '').toUpperCase().trim();
    if (code.length !== 4) { poStatus(tt('badCode')); return; }
    ensureWs(function () { sendWs({ t: 'join', code: code }); });
  }
  function quickMatch() { ensureWs(function () { sendWs({ t: 'quick' }); }); }
  function leaveMatch() {
    sendWs({ t: 'leave' });
    if (S.ws) { try { S.ws.close(); } catch (e) { /* gone */ } }
    S.ws = null; S.wsOpen = false; S.started = false; S.snap = null;
    $('po-leave').classList.add('hidden');
    $('po-room-code').classList.add('hidden');
  }

  /* ================= mode + panel takeover ================= */
  function setMode(mode) {
    S.mode = mode;
    $('po-mode-bot').classList.toggle('active', mode === 'bot');
    $('po-mode-online').classList.toggle('active', mode === 'online');
    $('po-online-panel').classList.toggle('hidden', mode !== 'online');
    $('panel-game-pong').classList.toggle('po-online-active', mode === 'online');
    if (mode === 'online') {
      S.localRunning = false;
      $('pong-msg').textContent = tt('onlineHint');
      if (!sessionToken()) poStatus(tt('needAccount'));
    } else {
      if (S.ws) leaveMatch();
      if (!S.local || S.local.over) S.local = newLocalMatch();
      $('pong-msg').textContent = t('pongRules');
    }
    startLoop();
  }
  function initPong() {
    // stop the app.js engine — this module runs the panel now
    if (window.pong) {
      pong.running = false;
      if (pong.raf) cancelAnimationFrame(pong.raf);
    }
    if (!S.inited) {
      S.inited = true;
      // re-bind Start: clone-replace drops the app.js listener
      var startBtn = $('pong-start');
      var fresh = startBtn.cloneNode(true);
      startBtn.parentNode.replaceChild(fresh, startBtn);
      fresh.addEventListener('click', function () { if (S.mode === 'bot') startLocal(); });
      $('po-mode-bot').addEventListener('click', function () { setMode('bot'); });
      $('po-mode-online').addEventListener('click', function () { setMode('online'); });
      $('po-create').addEventListener('click', createRoom);
      $('po-join').addEventListener('click', joinRoom);
      $('po-quick').addEventListener('click', quickMatch);
      $('po-leave').addEventListener('click', leaveMatch);
      $('po-code').addEventListener('input', function () { this.value = this.value.toUpperCase(); });
      // pointer input for both modes
      var cv = $('pong-canvas');
      var onPointer = function (e) {
        var rect = cv.getBoundingClientRect();
        var x = (e.clientX - rect.left) * (W / rect.width);
        S.myPointerX = clamp(x, 0, W);
        if (S.mode === 'bot') {
          if (S.local) localSetInput(S.local, S.local.me, x);
          if (!S.localRunning && S.local && !S.local.over) startLocal();
        } else if (S.started) {
          var now = Date.now();
          if (S.lastSentX === null || Math.abs(x - S.lastSentX) > 2 || now - S.lastSentAt > 60) {
            S.lastSentX = x; S.lastSentAt = now;
            sendWs({ t: 'input', x: Math.round(x) });
          }
        }
      };
      cv.addEventListener('pointermove', onPointer);
      cv.addEventListener('pointerdown', onPointer);
    }
    if (S.mode === 'bot' && (!S.local || S.local.over)) {
      S.local = newLocalMatch();
      S.trails = {};
      $('pong-start').textContent = t('startGame');
      $('pong-msg').textContent = t('pongRules');
    }
    startLoop();
  }

  /* openGame stays the single door into games (gates included); we
   * wrap it to take over the pong panel and to honour challenge
   * accepts, which get flagged by the capture-phase listener below. */
  var origOpenGame = window.openGame;
  if (typeof origOpenGame === 'function') {
    window.openGame = function (id) {
      origOpenGame(id);
      if (id === 'pong') {
        initPong();
        if (invitePending) {
          invitePending = false;
          setMode('online');
          createRoom();
        }
      }
    };
  }
  document.addEventListener('click', function (e) {
    var target = e.target;
    if (!target || !target.closest) return;
    var acc = target.closest('.mc-accept');
    if (!acc) return;
    var card = acc.closest('.msg-challenge');
    if (card && card.getAttribute('data-game-id') === 'pong') invitePending = true;
  }, true);
})();
