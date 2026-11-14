'use strict';
/* LOOPI — FoodNinja: our own swipe-slicing game.
 *
 * An original game in the slicing genre — LOOPI's name, LOOPI's art
 * (every item is drawn from canvas shapes at runtime; nothing is
 * copied from any other game), and LOOPI's twists:
 *   COMBO PLATTER — slice 3+ items in ONE swipe: +15, then +5 each.
 *   GOLDEN SNACK  — a rare golden ring worth 50.
 *   FEVER         — fill the combo meter (10 slices) for 5 s of
 *                   double points.
 *   ROTTEN EGG    — the hazard. Slicing it costs 30 points; against
 *                   the AI it also costs one of your 3 lives.
 *
 * Modes:
 *  - vs AI: a 60-second match against a bot slicer (Easy / Normal /
 *    Hard). The bot's score ticks up at a difficulty rate; your
 *    slices are real.
 *  - 1v1 ONLINE: rooms over the same WebSocket as Pong Clash
 *    (src/gamerooms.js, game:'food'). The server deals both players
 *    the SAME seeded item stream and relays the scores; each client
 *    slices locally and reports its score. Create room gives a
 *    4-letter code; Quick match pairs you or a server bot fills in.
 *
 * Accepting a 🍔 challenge card in chat lands here in Online mode
 * with a room created — send the code back to your friend.
 */
(function () {
  var W = 360, H = 480, GRAV = 620;
  var DURATION = 60000;

  /* seeded PRNG — identical algorithm to src/gamerooms.js so the
   * shared spawn stream matches on both clients (and the server's
   * bot uses its own stream; only the SPAWNS must match). */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------------- item table + spawn stream (pure) ---------------- */
  var ITEMS = {
    burger: { pts: 12, r: 27 },
    pizza: { pts: 10, r: 25 },
    sushi: { pts: 15, r: 20 },
    donut: { pts: 8, r: 22 },
    melon: { pts: 10, r: 28 },
    golden: { pts: 50, r: 21 },
    egg: { pts: -30, r: 22, hazard: true }
  };
  function fnItemDef(kind) { return ITEMS[kind]; }
  function fnPickKind(rng) {
    var roll = rng();
    if (roll < 0.05) return 'golden';
    if (roll < 0.14) return 'egg';
    var foods = ['burger', 'pizza', 'sushi', 'donut', 'melon'];
    var w = [0.22, 0.22, 0.18, 0.18, 0.20];
    var r2 = rng(), acc = 0;
    for (var i = 0; i < foods.length; i++) { acc += w[i]; if (r2 <= acc) return foods[i]; }
    return 'melon';
  }
  /* the deterministic spawn stream both online clients play */
  function fnSpawnStream(seed, durationMs) {
    var rng = mulberry32(seed >>> 0);
    var items = [];
    var t = 600;
    var id = 1;
    while (t < durationMs - 500) {
      var n = rng() < 0.3 ? 2 : 1;
      for (var i = 0; i < n; i++) {
        items.push({
          id: id++, at: t + i * 150, kind: fnPickKind(rng),
          x: 44 + rng() * (W - 88),
          vx: (rng() * 2 - 1) * 55,
          vy: -(545 + rng() * 160),
          spin: (rng() * 2 - 1) * 3.2,
          deco: rng() * 1000
        });
      }
      t += 640 + rng() * 520;
    }
    return items;
  }
  /* segment vs circle — the slice test (pure) */
  function fnSegCircle(x1, y1, x2, y2, cx, cy, r) {
    var dx = x2 - x1, dy = y2 - y1;
    var len2 = dx * dx + dy * dy;
    var tt = len2 > 0 ? ((cx - x1) * dx + (cy - y1) * dy) / len2 : 0;
    tt = Math.max(0, Math.min(1, tt));
    var px = x1 + tt * dx - cx, py = y1 + tt * dy - cy;
    return px * px + py * py <= r * r;
  }
  /* bonus paid for the n-th slice inside one swipe */
  function fnComboBonus(n) { return n === 3 ? 15 : (n > 3 ? 5 : 0); }

  var DIFFS = {
    easy: { interval: 560, chance: 0.45 },
    normal: { interval: 480, chance: 0.58 },
    hard: { interval: 420, chance: 0.72 }
  };
  var BOT_VALUES = [8, 10, 10, 12, 15];

  var TXT = {
    en: {
      needAccount: 'Online play needs a signed-in account on the LOOPI server — you are browsing the demo.',
      connecting: 'Connecting…', connected: 'Connected. Create a room, quick-match, or join with a code.',
      waiting: 'Waiting for your friend to join with this code…',
      queued: 'Looking for an opponent… a bot takes the seat if nobody shows within 20 seconds.',
      matchOn: 'Slice! 60 seconds — most points wins. Avoid the rotten egg!',
      over: 'Match over.', leftRoom: 'You left the match.',
      oppLeft: 'Your opponent left — match ended.',
      connClosed: 'Connection closed. Online play needs a signed-in account on the LOOPI server.',
      badCode: 'Enter the 4-letter room code first.',
      onlineHint: 'Online 1v1: same food stream for both players — slice fast, report proud.',
      pressStart: 'Press Start — slice the food, dodge the rotten egg.',
      win: 'You win', lose: 'Bot wins', winFriend: 'You win the duel', loseFriend: 'Your friend takes it',
      draw: 'Dead heat', outOfLives: 'Out of lives — the eggs got you.',
      youLabel: 'You', fever: 'FEVER ×2',
      groupWait: 'Group match — waiting in the lobby…',
      groupOn: 'Slice! Group match — top score takes the crown ',
      groupOver: 'Time! Waiting for the final standings…',
      comboPlatter: 'COMBO PLATTER +', errorWord: 'Error'
    },
    zh: {
      needAccount: '在线对战需要登录 LOOPI 服务器账号 — 你现在浏览的是演示模式。',
      connecting: '连接中…', connected: '已连接。创建房间、快速匹配，或用代码加入。',
      waiting: '等待朋友用这个代码加入…',
      queued: '正在寻找对手…20 秒内没人加入将由机器人补位。',
      matchOn: '开切！60 秒 — 分高者胜。躲开臭鸡蛋！',
      over: '比赛结束。', leftRoom: '你已离开比赛。',
      oppLeft: '对手离开了 — 比赛结束。',
      connClosed: '连接已断开。在线对战需要登录 LOOPI 服务器账号。',
      badCode: '请先输入 4 位房间代码。',
      onlineHint: '在线 1v1：双方食物流完全相同 — 切得快，赢得漂亮。',
      pressStart: '按开始 — 切开食物，躲开臭鸡蛋。',
      win: '你赢了', lose: '机器人获胜', winFriend: '你赢下了对决', loseFriend: '你的朋友赢了',
      draw: '平局', outOfLives: '生命耗尽 — 臭鸡蛋把你放倒了。',
      youLabel: '你', fever: 'FEVER ×2',
      groupWait: '群游戏 — 正在大厅等待…',
      groupOn: '开切！群游戏 — 最高分夺冠 ',
      groupOver: '时间到！等待最终排名…',
      comboPlatter: '组合拼盘 +', errorWord: '出错了'},
    hi: {
      needAccount: '\u0911\u0928\u0932\u093E\u0907\u0928 \u0916\u0947\u0932\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F LOOPI \u0938\u0930\u094D\u0935\u0930 \u092A\u0930 \u0938\u093E\u0907\u0928-\u0907\u0928 \u0915\u093F\u092F\u093E \u0939\u0941\u0906 \u0905\u0915\u093E\u0909\u0902\u091F \u091A\u093E\u0939\u093F\u090F \u2014 \u0906\u092A \u0921\u0947\u092E\u094B \u092C\u094D\u0930\u093E\u0909\u091C\u093C \u0915\u0930 \u0930\u0939\u0947 \u0939\u0948\u0902\u0964',
      connecting: '\u0915\u0928\u0947\u0915\u094D\u091F \u0939\u094B \u0930\u0939\u093E \u0939\u0948\u2026',
      connected: '\u0915\u0928\u0947\u0915\u094D\u091F \u0939\u094B \u0917\u092F\u093E\u0964 \u0930\u0942\u092E \u092C\u0928\u093E\u090F\u0902, \u0915\u094D\u0935\u093F\u0915-\u092E\u0948\u091A \u0915\u0930\u0947\u0902, \u092F\u093E \u0915\u094B\u0921 \u0938\u0947 \u091C\u0949\u0907\u0928 \u0915\u0930\u0947\u0902\u0964',
      waiting: '\u0906\u092A\u0915\u0947 \u0926\u094B\u0938\u094D\u0924 \u0915\u0947 \u0907\u0938 \u0915\u094B\u0921 \u0938\u0947 \u091C\u0949\u0907\u0928 \u0915\u0930\u0928\u0947 \u0915\u093E \u0907\u0902\u0924\u091C\u093C\u093E\u0930 \u0939\u0948\u2026',
      queued: '\u0935\u093F\u0930\u094B\u0927\u0940 \u0916\u094B\u091C \u0930\u0939\u0947 \u0939\u0948\u0902\u2026 \u0905\u0917\u0930 20 \u0938\u0947\u0915\u0902\u0921 \u092E\u0947\u0902 \u0915\u094B\u0908 \u0928\u0939\u0940\u0902 \u0906\u092F\u093E \u0924\u094B \u092C\u0949\u091F \u0938\u0940\u091F \u0932\u0947 \u0932\u0947\u0917\u093E\u0964',
      matchOn: '\u0915\u093E\u091F\u094B! 60 \u0938\u0947\u0915\u0902\u0921 \u2014 \u0938\u092C\u0938\u0947 \u091C\u093C\u094D\u092F\u093E\u0926\u093E \u092A\u0949\u0907\u0902\u091F\u094D\u0938 \u0935\u093E\u0932\u093E \u091C\u0940\u0924\u0947\u0917\u093E\u0964 \u0938\u0921\u093C\u0947 \u0939\u0941\u090F \u0905\u0902\u0921\u0947 \u0938\u0947 \u092C\u091A\u094B!',
      over: '\u092E\u0948\u091A \u0916\u093C\u0924\u094D\u092E\u0964',
      leftRoom: '\u0906\u092A\u0928\u0947 \u092E\u0948\u091A \u091B\u094B\u0921\u093C \u0926\u093F\u092F\u093E\u0964',
      oppLeft: '\u0906\u092A\u0915\u093E \u0935\u093F\u0930\u094B\u0927\u0940 \u091A\u0932\u093E \u0917\u092F\u093E \u2014 \u092E\u0948\u091A \u0916\u093C\u0924\u094D\u092E\u0964',
      connClosed: '\u0915\u0928\u0947\u0915\u094D\u0936\u0928 \u092C\u0902\u0926 \u0939\u094B \u0917\u092F\u093E\u0964 \u0911\u0928\u0932\u093E\u0907\u0928 \u0916\u0947\u0932\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F LOOPI \u0938\u0930\u094D\u0935\u0930 \u092A\u0930 \u0938\u093E\u0907\u0928-\u0907\u0928 \u0915\u093F\u092F\u093E \u0939\u0941\u0906 \u0905\u0915\u093E\u0909\u0902\u091F \u091A\u093E\u0939\u093F\u090F\u0964',
      badCode: '\u092A\u0939\u0932\u0947 4 \u0905\u0915\u094D\u0937\u0930\u094B\u0902 \u0935\u093E\u0932\u093E \u0930\u0942\u092E \u0915\u094B\u0921 \u0921\u093E\u0932\u0947\u0902\u0964',
      onlineHint: '\u0911\u0928\u0932\u093E\u0907\u0928 1v1: \u0926\u094B\u0928\u094B\u0902 \u0916\u093F\u0932\u093E\u0921\u093C\u093F\u092F\u094B\u0902 \u0915\u0947 \u0932\u093F\u090F \u090F\u0915 \u0939\u0940 \u092B\u093C\u0942\u0921 \u0938\u094D\u091F\u094D\u0930\u0940\u092E \u2014 \u0924\u0947\u091C\u093C \u0915\u093E\u091F\u094B, \u0936\u093E\u0928 \u0938\u0947 \u092C\u0924\u093E\u0913\u0964',
      pressStart: '\u0938\u094D\u091F\u093E\u0930\u094D\u091F \u0926\u092C\u093E\u0913 \u2014 \u0916\u093E\u0928\u093E \u0915\u093E\u091F\u094B, \u0938\u0921\u093C\u0947 \u0939\u0941\u090F \u0905\u0902\u0921\u0947 \u0938\u0947 \u092C\u091A\u094B\u0964',
      win: '\uD83C\uDFC6 \u0906\u092A \u091C\u0940\u0924\u0947',
      lose: '\u092C\u0949\u091F \u091C\u0940\u0924\u093E',
      winFriend: '\uD83C\uDFC6 \u0906\u092A\u0928\u0947 \u092E\u0941\u0915\u093C\u093E\u092C\u0932\u093E \u091C\u0940\u0924 \u0932\u093F\u092F\u093E',
      loseFriend: '\u0906\u092A\u0915\u0947 \u0926\u094B\u0938\u094D\u0924 \u0928\u0947 \u091C\u0940\u0924 \u0932\u093F\u092F\u093E',
      draw: '\uD83E\uDD1D \u092C\u0930\u093E\u092C\u0930\u0940',
      outOfLives: '\u091C\u093E\u0928\u0947\u0902 \u0916\u093C\u0924\u094D\u092E \u2014 \u0905\u0902\u0921\u094B\u0902 \u0928\u0947 \u0906\u092A\u0915\u094B \u092A\u0915\u0921\u093C \u0932\u093F\u092F\u093E\u0964',
      youLabel: '\u0906\u092A',
      fever: '\uD83D\uDD25 FEVER \u00D72',
      groupWait: '\u0917\u094D\u0930\u0941\u092A \u092E\u0948\u091A \u2014 \u0932\u0949\u092C\u0940 \u092E\u0947\u0902 \u0907\u0902\u0924\u091C\u093C\u093E\u0930 \u0939\u0948\u2026',
      groupOn: '\u0915\u093E\u091F\u094B! \u0917\u094D\u0930\u0941\u092A \u092E\u0948\u091A \u2014 \u091F\u0949\u092A \u0938\u094D\u0915\u094B\u0930 \u0935\u093E\u0932\u093E \u0924\u093E\u091C \u0932\u0947\u0917\u093E \uD83D\uDC51',
      groupOver: '\u0938\u092E\u092F \u0916\u093C\u0924\u094D\u092E! \u092B\u093C\u093E\u0907\u0928\u0932 \u0938\u094D\u091F\u0948\u0902\u0921\u093F\u0902\u0917 \u0915\u093E \u0907\u0902\u0924\u091C\u093C\u093E\u0930 \u0939\u0948\u2026',
      comboPlatter: '\uD83C\uDF7D COMBO PLATTER +',
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
    inited: false, mode: 'ai', diff: 'easy',
    running: false, over: false, raf: null, lastTs: 0,
    elapsed: 0, durationMs: DURATION,
    items: [], halves: [], parts: [], popups: [],
    spawns: [], spawnIdx: 0, seed: 1,
    score: 0, oppScore: 0, lives: 3,
    meter: 0, feverUntil: -1, gunkUntil: -1,
    blade: [], stroking: false, strokeSlices: 0, lastMoveT: 0,
    botAcc: 0, botRng: Math.random,
    ws: null, wsOpen: false, pendingAction: null, role: null, code: null,
    lastSentScore: -1, lastSentAt: 0,
    finalText: null,
    group: null // group-session hooks {onScore} while mode === 'group'
  };
  var invitePending = false;

  /* ================= item art (all original, canvas-drawn) ================= */
  function drawBurger(ctx, r) {
    ctx.fillStyle = '#c97e35';
    ctx.beginPath(); ctx.arc(0, -r * 0.34, r * 0.92, Math.PI, 0); ctx.fill(); // top bun
    ctx.fillStyle = '#f7e3a1';
    [[-0.4, -0.72], [0.05, -0.85], [0.45, -0.7]].forEach(function (s) {
      ctx.beginPath(); ctx.ellipse(s[0] * r, s[1] * r, r * 0.09, r * 0.05, 0.6, 0, Math.PI * 2); ctx.fill();
    });
    ctx.strokeStyle = '#69b84c'; ctx.lineWidth = r * 0.16; ctx.beginPath();
    for (var x = -r * 0.9; x <= r * 0.9; x += r * 0.18) {
      var y = -r * 0.12 + Math.sin(x * 0.4) * r * 0.06;
      if (x === -r * 0.9) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = '#7a4a22';
    ctx.beginPath(); ctx.roundRect(-r * 0.92, -r * 0.02, r * 1.84, r * 0.34, r * 0.15); ctx.fill(); // patty
    ctx.fillStyle = '#e0a458';
    ctx.beginPath(); ctx.arc(0, r * 0.52, r * 0.92, 0, Math.PI); ctx.fill(); // bottom bun
  }
  function drawPizza(ctx, r) {
    ctx.fillStyle = '#f2c14e';
    ctx.beginPath(); ctx.moveTo(0, r); ctx.lineTo(-r * 0.85, -r * 0.62); ctx.lineTo(r * 0.85, -r * 0.62); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#c97e35'; ctx.lineWidth = r * 0.24;
    ctx.beginPath(); ctx.moveTo(-r * 0.85, -r * 0.62); ctx.lineTo(r * 0.85, -r * 0.62); ctx.stroke();
    ctx.fillStyle = '#d94f3d';
    [[-0.28, -0.2], [0.3, 0.05], [-0.02, 0.42]].forEach(function (p) {
      ctx.beginPath(); ctx.arc(p[0] * r, p[1] * r, r * 0.17, 0, Math.PI * 2); ctx.fill();
    });
  }
  function drawSushi(ctx, r) {
    ctx.fillStyle = '#20392e';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f6f2e8';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff8c66';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.44, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#69b84c';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.16, 0, Math.PI * 2); ctx.fill();
  }
  function drawDonut(ctx, r, deco) {
    ctx.fillStyle = '#e0a458';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff7eb0';
    ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 0.82, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#171021';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.34, 0, Math.PI * 2); ctx.fill();
    var rng = mulberry32(Math.floor(deco) + 7);
    var cols = ['#fff', '#57a7ff', '#b6ff3c', '#ffd84d'];
    ctx.lineWidth = 2.4;
    for (var i = 0; i < 7; i++) {
      var a = rng() * Math.PI * 2, d = r * (0.5 + rng() * 0.3);
      ctx.strokeStyle = cols[i % cols.length];
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * d - 3, Math.sin(a) * d - r * 0.1);
      ctx.lineTo(Math.cos(a) * d + 3, Math.sin(a) * d - r * 0.1 + 2);
      ctx.stroke();
    }
  }
  function drawMelon(ctx, r) {
    ctx.fillStyle = '#2f9e4f';
    ctx.beginPath(); ctx.arc(0, -r * 0.2, r, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#eaf7e0';
    ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 0.86, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#ff5470';
    ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 0.72, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#26221f';
    [[-0.4, 0.18], [0, 0.3], [0.4, 0.18], [-0.2, 0.48], [0.22, 0.48]].forEach(function (s) {
      ctx.beginPath(); ctx.ellipse(s[0] * r, s[1] * r, r * 0.05, r * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    });
  }
  function drawGolden(ctx, r, ts) {
    ctx.save();
    ctx.shadowColor = '#ffd84d'; ctx.shadowBlur = 18 + 6 * Math.sin(ts / 160);
    ctx.fillStyle = '#ffd84d';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e8a812';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#171021';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff3b0';
    [[-0.8, -0.75], [0.85, -0.5], [0.6, 0.8]].forEach(function (s) {
      ctx.beginPath(); ctx.arc(s[0] * r, s[1] * r, r * 0.09, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }
  function drawEgg(ctx, r) {
    ctx.fillStyle = '#7d8f57';
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.82, r, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a9bd76';
    ctx.beginPath(); ctx.ellipse(-r * 0.18, -r * 0.15, r * 0.42, r * 0.5, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e8ead9'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, r * 0.25); ctx.lineTo(-r * 0.2, r * 0.05); ctx.lineTo(r * 0.05, r * 0.3); ctx.lineTo(r * 0.35, r * 0.08);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(169,189,118,.85)'; ctx.lineWidth = 2;
    [-0.35, 0.25].forEach(function (sx) {
      ctx.beginPath();
      ctx.moveTo(sx * r, -r * 1.05);
      ctx.quadraticCurveTo(sx * r + 6, -r * 1.3, sx * r, -r * 1.5);
      ctx.stroke();
    });
  }
  function drawItem(ctx, kind, r, deco, ts) {
    if (kind === 'burger') drawBurger(ctx, r);
    else if (kind === 'pizza') drawPizza(ctx, r);
    else if (kind === 'sushi') drawSushi(ctx, r);
    else if (kind === 'donut') drawDonut(ctx, r, deco);
    else if (kind === 'melon') drawMelon(ctx, r);
    else if (kind === 'golden') drawGolden(ctx, r, ts);
    else drawEgg(ctx, r);
  }

  /* ================= fx helpers ================= */
  function burst(x, y, color, n, power) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = (0.3 + Math.random() * 0.7) * (power || 140);
      S.parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 0, max: 360 + Math.random() * 300, color: color, size: 1.5 + Math.random() * 2.4 });
    }
    if (S.parts.length > 240) S.parts.splice(0, S.parts.length - 240);
  }
  function popup(x, y, text, color) {
    S.popups.push({ x: x, y: y, text: text, color: color || '#f4f6ff', life: 0, max: 900 });
  }

  /* ================= engine ================= */
  function feverActive() { return S.elapsed < S.feverUntil; }
  function startMatch(seed, durationMs) {
    S.seed = seed >>> 0;
    S.durationMs = durationMs || DURATION;
    S.spawns = fnSpawnStream(S.seed, S.durationMs);
    S.spawnIdx = 0;
    S.items = []; S.halves = []; S.parts = []; S.popups = []; S.blade = [];
    S.score = 0; S.oppScore = 0; S.lives = 3;
    S.meter = 0; S.feverUntil = -1; S.gunkUntil = -1;
    S.elapsed = 0; S.botAcc = 0;
    S.strokeSlices = 0; S.stroking = false;
    S.over = false; S.running = true; S.finalText = null;
    S.lastSentScore = -1;
    hideResult();
    $('fn-start').textContent = t('playAgain');
    $('fn-msg').textContent = tt('matchOn');
    updateHud();
    startLoop();
  }
  function startAiMatch() {
    startMatch((Math.random() * 0xffffffff) >>> 0, DURATION);
  }
  function hideResult() { var r = $('fn-result'); if (r) r.classList.add('hidden'); }
  function finishMatch(reason) {
    if (S.over) return;
    S.over = true; S.running = false;
    var won = S.score > S.oppScore;
    var draw = S.score === S.oppScore;
    var reward = won ? 30 : (draw ? 15 : 5);
    if (window.addCoins) addCoins(reward);
    if (won && window.bumpGameWins) bumpGameWins();
    var oppName = S.mode === 'online' ? '' : 'Bot';
    S.finalText = t('gameFood') + ' — ' + t('youWord') + ' ' + S.score + ' : ' + S.oppScore + (oppName ? ' ' + t('botWord') : '') + '. ' + t('beatThat');
    var head = draw ? tt('draw') : (won ? (S.mode === 'online' ? tt('winFriend') : tt('win')) : (S.mode === 'online' ? tt('loseFriend') : tt('lose')));
    $('fn-msg').textContent = (reason === 'lives' ? tt('outOfLives') + ' ' : '') + head + ' ' + S.score + ' — ' + S.oppScore;
    $('fn-result-text').textContent = head + ' ' + S.score + ' — ' + S.oppScore + ' · +' + reward + ' 🪙' + t('coinsRewardSuffix');
    $('fn-result').classList.remove('hidden');
    $('fn-start').textContent = t('playAgain');
    updateHud();
  }
  function sliceItem(it, ang) {
    var def = ITEMS[it.kind];
    S.items.splice(S.items.indexOf(it), 1);
    var px = -Math.sin(ang), py = Math.cos(ang);
    [-1, 1].forEach(function (side) {
      S.halves.push({
        kind: it.kind, deco: it.deco, r: it.r, side: side,
        x: it.x + px * side * 5, y: it.y + py * side * 5,
        vx: it.vx + px * side * 90, vy: it.vy - 30,
        rot: it.rot, vr: it.spin + side * 2.4, life: 0
      });
    });
    if (def.hazard) {
      S.score = Math.max(0, S.score - 30);
      burst(it.x, it.y, '#a9bd76', 22, 190);
      popup(it.x, it.y - 26, '🤢 -30', '#c4d98a');
      if (S.mode === 'ai') {
        S.lives--;
        if (S.lives <= 0) { updateHud(); finishMatch('lives'); return; }
      } else {
        S.gunkUntil = S.elapsed + 700; // gunked blade, briefly useless online
      }
      onScoreChanged();
      updateHud();
      return;
    }
    S.strokeSlices++;
    var pts = def.pts * (feverActive() ? 2 : 1);
    S.score += pts;
    var bonus = fnComboBonus(S.strokeSlices);
    if (bonus > 0) {
      S.score += bonus;
      popup(it.x, it.y - 34, tt('comboPlatter') + bonus, '#ffd84d');
      burst(it.x, it.y, '#ffd84d', 14, 170);
    }
    popup(it.x, it.y - 14, '+' + pts, it.kind === 'golden' ? '#ffd84d' : '#f4f6ff');
    burst(it.x, it.y, it.kind === 'golden' ? '#ffd84d' : '#ff9d5c', 10, 140);
    if (!feverActive()) {
      S.meter = Math.min(10, S.meter + 1);
      if (S.meter >= 10) {
        S.feverUntil = S.elapsed + 5000;
        S.meter = 0;
        popup(W / 2, 90, tt('fever'), '#ffd84d');
      }
    }
    onScoreChanged();
    updateHud();
  }
  function onScoreChanged() {
    if (S.mode === 'group') {
      // Group sessions report through group-games.js (its socket,
      // its session) — same 180 ms throttle as the 1v1 relay.
      if (!S.group || !S.group.onScore) return;
      var nowG = Date.now();
      if (S.score !== S.lastSentScore && nowG - S.lastSentAt > 180) {
        S.lastSentScore = S.score; S.lastSentAt = nowG;
        S.group.onScore(S.score);
      }
      return;
    }
    if (S.mode !== 'online' || !S.wsOpen) return;
    var now = Date.now();
    if (S.score !== S.lastSentScore && now - S.lastSentAt > 180) {
      S.lastSentScore = S.score; S.lastSentAt = now;
      sendWs({ t: 'score', score: S.score });
    }
  }
  function botStep(dtMs) {
    var d = DIFFS[S.diff] || DIFFS.normal;
    S.botAcc += dtMs;
    while (S.botAcc >= d.interval) {
      S.botAcc -= d.interval;
      if (Math.random() < d.chance) {
        S.oppScore += BOT_VALUES[Math.floor(Math.random() * BOT_VALUES.length)];
      }
    }
  }
  function step(dtMs) {
    S.elapsed += dtMs;
    var dt = dtMs / 1000;
    // spawns
    while (S.spawnIdx < S.spawns.length && S.spawns[S.spawnIdx].at <= S.elapsed) {
      var sp = S.spawns[S.spawnIdx++];
      S.items.push({
        kind: sp.kind, x: sp.x, y: H + 34, vx: sp.vx, vy: sp.vy,
        spin: sp.spin, rot: 0, r: ITEMS[sp.kind].r, deco: sp.deco
      });
    }
    // items
    S.items = S.items.filter(function (it) {
      it.vy += GRAV * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.rot += it.spin * dt;
      return !(it.y > H + 60 && it.vy > 0);
    });
    // halves
    S.halves = S.halves.filter(function (h) {
      h.life += dtMs;
      h.vy += GRAV * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.rot += h.vr * dt;
      return h.y < H + 70;
    });
    // fx
    S.parts = S.parts.filter(function (p) {
      p.life += dtMs; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt;
      return p.life < p.max;
    });
    S.popups = S.popups.filter(function (p) { p.life += dtMs; return p.life < p.max; });
    // fever meter decay (out of fever)
    if (!feverActive() && S.meter > 0) S.meter = Math.max(0, S.meter - dt * 0.8);
    if (S.mode === 'ai') botStep(dtMs);
    // clock
    if (S.elapsed >= S.durationMs) {
      if (S.mode === 'ai') finishMatch('time');
      else if (!S.over) {
        S.running = false;
        $('fn-msg').textContent = S.mode === 'group' ? tt('groupOver') : tt('over');
      }
    }
    updateHud();
  }

  /* ================= render ================= */
  function drawScene(ctx, ts) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#8fd4f8'); g.addColorStop(0.6, '#cdeffb'); g.addColorStop(1, '#fdf0d2');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,157,60,.4)'; ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);
    // counter line
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.fillRect(0, H - 54, W, 54);
    if (feverActive()) {
      ctx.fillStyle = 'rgba(255,216,77,.10)';
      ctx.fillRect(0, 0, W, H);
    }
    if (S.elapsed < S.gunkUntil) {
      ctx.fillStyle = 'rgba(125,143,87,.30)';
      ctx.fillRect(0, 0, W, H);
    }
    // halves (under whole items)
    S.halves.forEach(function (h) {
      ctx.save();
      ctx.translate(h.x, h.y); ctx.rotate(h.rot);
      ctx.beginPath();
      ctx.rect(h.side < 0 ? -h.r - 3 : 0, -h.r - 3, h.r + 3, (h.r + 3) * 2);
      ctx.clip();
      drawItem(ctx, h.kind, h.r, h.deco, ts);
      ctx.restore();
    });
    // items
    S.items.forEach(function (it) {
      ctx.save();
      ctx.translate(it.x, it.y); ctx.rotate(it.rot);
      ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 5;
      drawItem(ctx, it.kind, it.r, it.deco, ts);
      ctx.restore();
    });
    // blade trail
    if (S.blade.length > 1) {
      for (var pass = 0; pass < 2; pass++) {
        ctx.beginPath();
        for (var i = 0; i < S.blade.length; i++) {
          var p = S.blade[i];
          if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = pass === 0 ? 'rgba(140,220,255,.45)' : 'rgba(255,255,255,.95)';
        ctx.lineWidth = pass === 0 ? 7 : 2.4;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.stroke();
      }
    }
    // particles
    S.parts.forEach(function (p) {
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    // popups
    ctx.textAlign = 'center';
    S.popups.forEach(function (p) {
      var f = p.life / p.max;
      ctx.globalAlpha = f < 0.7 ? 1 : 1 - (f - 0.7) / 0.3;
      ctx.font = '900 16px system-ui, sans-serif';
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y - f * 30);
    });
    ctx.globalAlpha = 1;
    if (!S.running && !S.over) {
      ctx.font = '900 40px system-ui, sans-serif';
      ctx.fillStyle = '#25343f';
      ctx.textAlign = 'center';
      ctx.fillText('🍔 FoodNinja', W / 2, H / 2 - 30);
      ctx.font = '700 15px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(37,52,63,.75)';
      ctx.fillText(tt('pressStart'), W / 2, H / 2 + 4);
    }
    if (S.over) {
      ctx.fillStyle = 'rgba(255,251,240,.8)'; ctx.fillRect(0, 0, W, H);
      ctx.font = '900 26px system-ui, sans-serif';
      ctx.fillStyle = '#25343f';
      ctx.textAlign = 'center';
      ctx.fillText(S.score > S.oppScore ? 'WIN' : (S.score === S.oppScore ? 'DRAW' : 'LOSE'), W / 2, H / 2 - 14);
      ctx.font = '700 17px system-ui, sans-serif';
      ctx.fillText(S.score + ' — ' + S.oppScore, W / 2, H / 2 + 18);
    }
  }
  function frame(ts) {
    S.raf = requestAnimationFrame(frame);
    var panel = $('panel-game-foodninja');
    if (!panel || panel.classList.contains('hidden')) { stopLoop(); return; }
    var cv = $('fn-canvas');
    if (!cv) return;
    var dtMs = S.lastTs ? Math.min(50, ts - S.lastTs) : 16;
    S.lastTs = ts;
    if (S.running && !S.over) step(dtMs);
    // prune blade trail
    var now = performance.now();
    S.blade = S.blade.filter(function (p) { return now - p.t < 95; });
    drawScene(cv.getContext('2d'), ts);
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
  function updateHud() {
    var sc = $('fn-score'); if (sc) sc.textContent = S.score;
    var op = $('fn-opp'); if (op) op.textContent = S.oppScore;
    var tm = $('fn-time');
    if (tm) tm.textContent = Math.max(0, Math.ceil((S.durationMs - S.elapsed) / 1000));
    var lv = $('fn-lives');
    if (lv) {
      if (S.mode === 'ai') lv.innerHTML = window.LOOPI_ICONS ? window.LOOPI_ICONS.svg('heart', 'ic ic-inline heart-ic').repeat(Math.max(0, S.lives)) : '';
      else lv.textContent = S.mode === 'group' ? 'Group' : '1v1';
    }
    var mf = $('fn-meter-fill');
    if (mf) mf.style.width = (feverActive() ? 100 : Math.round(S.meter * 10)) + '%';
    var ft = $('fn-fever-tag');
    if (ft) ft.classList.toggle('hidden', !feverActive());
  }

  /* ================= blade input ================= */
  function canvasPoint(e) {
    var cv = $('fn-canvas');
    var rect = cv.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (W / rect.width), y: (e.clientY - rect.top) * (H / rect.height) };
  }
  function onPointerDown(e) {
    S.stroking = true; S.strokeSlices = 0;
    S.blade = [];
    onPointerMove(e);
    e.preventDefault();
  }
  function onPointerMove(e) {
    var p = canvasPoint(e);
    var now = performance.now();
    var active = e.pointerType === 'mouse' || S.stroking || (e.buttons && e.buttons > 0);
    if (!S.stroking && now - S.lastMoveT > 400) S.strokeSlices = 0; // a mouse "stroke" is one continuous sweep
    S.lastMoveT = now;
    var prev = S.blade.length ? S.blade[S.blade.length - 1] : null;
    S.blade.push({ x: p.x, y: p.y, t: now });
    if (S.blade.length > 16) S.blade.shift();
    if (!active || !S.running || S.over || !prev) return;
    if (S.elapsed < S.gunkUntil) return;
    var moved = Math.sqrt((p.x - prev.x) * (p.x - prev.x) + (p.y - prev.y) * (p.y - prev.y));
    if (moved < 3) return; // the blade has to actually sweep
    var ang = Math.atan2(p.y - prev.y, p.x - prev.x);
    var snapshot = S.items.slice();
    for (var i = 0; i < snapshot.length; i++) {
      var it = snapshot[i];
      if (S.items.indexOf(it) < 0) continue;
      if (fnSegCircle(prev.x, prev.y, p.x, p.y, it.x, it.y, it.r + 3)) sliceItem(it, ang);
      if (S.over) break;
    }
  }
  function onPointerUp() {
    S.stroking = false; S.strokeSlices = 0;
  }

  /* ================= online (WebSocket, game:'food') ================= */
  function sessionToken() {
    try { return localStorage.getItem('nocta.token') || ''; } catch (e) { return ''; }
  }
  function wsUrl() {
    var base = (window.CONFIG && CONFIG.apiBase) || '';
    var origin = base ? base.replace(/^http/i, 'ws')
      : (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
    return origin + '/v1/games/ws?token=' + encodeURIComponent(sessionToken());
  }
  function fnStatus(msg) { var n = $('fn-status'); if (n) n.textContent = msg || ''; }
  function ensureWs(action) {
    if (!sessionToken()) { fnStatus(tt('needAccount')); return; }
    if (S.ws && S.wsOpen) { action(); return; }
    S.pendingAction = action;
    fnStatus(tt('connecting'));
    var ws;
    try { ws = new WebSocket(wsUrl()); } catch (e) { fnStatus(tt('connClosed')); return; }
    S.ws = ws;
    ws.onopen = function () {
      S.wsOpen = true;
      fnStatus(tt('connected'));
      if (S.pendingAction) { var a = S.pendingAction; S.pendingAction = null; a(); }
    };
    ws.onmessage = function (ev) {
      var msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      onServerMsg(msg);
    };
    ws.onclose = function () {
      S.ws = null; S.wsOpen = false;
      if (S.mode === 'online') fnStatus(tt('connClosed'));
      $('fn-leave').classList.add('hidden');
    };
    ws.onerror = function () { /* onclose follows */ };
  }
  function sendWs(obj) { if (S.ws && S.wsOpen) S.ws.send(JSON.stringify(obj)); }
  function onServerMsg(msg) {
    if (msg.t === 'created') {
      S.code = msg.code; S.role = 'p1';
      $('fn-room-code-val').textContent = msg.code;
      $('fn-room-code').classList.remove('hidden');
      $('fn-leave').classList.remove('hidden');
      fnStatus(tt('waiting'));
    } else if (msg.t === 'queued') {
      fnStatus(tt('queued'));
      $('fn-leave').classList.remove('hidden');
    } else if (msg.t === 'start' && msg.game === 'food') {
      S.role = msg.you; S.code = msg.code;
      $('fn-room-code').classList.add('hidden');
      $('fn-leave').classList.remove('hidden');
      $('fn-opp-label').textContent = msg.opponent && msg.opponent.bot ? 'BOT' : '1v1';
      fnStatus('');
      startMatch(msg.seed, msg.durationMs);
    } else if (msg.t === 'scores') {
      S.oppScore = S.role === 'p2' ? msg.s1 : msg.s2;
      if (typeof msg.left === 'number') {
        // keep the local clock honest against the server's
        var serverElapsed = S.durationMs - msg.left;
        if (Math.abs(serverElapsed - S.elapsed) > 1200) S.elapsed = serverElapsed;
      }
      updateHud();
    } else if (msg.t === 'over') {
      S.score = S.role === 'p2' ? msg.s2 : msg.s1;
      S.oppScore = S.role === 'p2' ? msg.s1 : msg.s2;
      finishMatch('time');
      fnStatus(tt('over'));
    } else if (msg.t === 'opponent_left') {
      if (S.running) finishMatch('left');
      fnStatus(tt('oppLeft'));
      $('fn-leave').classList.add('hidden');
    } else if (msg.t === 'error') {
      fnStatus(msg.message || tt('errorWord'));
    } else if (msg.t === 'left') {
      fnStatus(tt('leftRoom'));
      $('fn-leave').classList.add('hidden');
      $('fn-room-code').classList.add('hidden');
    }
  }
  function createRoom() { ensureWs(function () { sendWs({ t: 'create', game: 'food' }); }); }
  function joinRoom() {
    var code = ($('fn-code').value || '').toUpperCase().trim();
    if (code.length !== 4) { fnStatus(tt('badCode')); return; }
    ensureWs(function () { sendWs({ t: 'join', code: code }); });
  }
  function quickMatch() { ensureWs(function () { sendWs({ t: 'quick', game: 'food' }); }); }
  function leaveMatch() {
    sendWs({ t: 'leave' });
    if (S.ws) { try { S.ws.close(); } catch (e) { /* gone */ } }
    S.ws = null; S.wsOpen = false; S.running = false;
    $('fn-leave').classList.add('hidden');
    $('fn-room-code').classList.add('hidden');
  }

  /* ================= group sessions (driven by group-games.js) ====
   * A third mode beside 'ai' and 'online': the match is a group-chat
   * session. group-games.js owns the socket and the session; this
   * module owns the slicing. The server deals the seed (same stream
   * for every player); score changes flow out through hooks.onScore;
   * the SERVER ends the match — finishMatch (and its game coins)
   * never runs here: group games have no prizes. */
  function enterGroup(hooks) {
    initFood();
    S.mode = 'group';
    S.group = hooks || {};
    if (S.ws) leaveMatch(); // never carry a 1v1 socket into a group game
    $('fn-mode-ai').classList.remove('active');
    $('fn-mode-online').classList.remove('active');
    $('fn-online-panel').classList.add('hidden');
    $('fn-diff-row').classList.add('hidden');
    $('fn-group-bar').classList.remove('hidden');
    $('fn-opp-label').textContent = 'GROUP';
    $('fn-msg').textContent = tt('groupWait');
    hideResult();
    updateHud();
    startLoop();
  }
  function startGroup(seed, durationMs) {
    startMatch(seed, durationMs);
    $('fn-msg').textContent = tt('groupOn');
  }
  /* Keep the local clock honest against the server's (same trick as
   * the 1v1 relay): group-games.js feeds us the server's ms-left. */
  function syncGroupClock(leftMs) {
    if (S.mode !== 'group') return;
    var serverElapsed = S.durationMs - leftMs;
    if (Math.abs(serverElapsed - S.elapsed) > 1200) S.elapsed = serverElapsed;
  }
  function leaveGroup() {
    S.group = null;
    $('fn-group-bar').classList.add('hidden');
    if (S.mode === 'group') setMode('ai');
  }

  /* ================= panel wiring ================= */
  function setMode(mode) {
    S.mode = mode;
    $('fn-mode-ai').classList.toggle('active', mode === 'ai');
    $('fn-mode-online').classList.toggle('active', mode === 'online');
    $('fn-online-panel').classList.toggle('hidden', mode !== 'online');
    $('fn-diff-row').classList.toggle('hidden', mode !== 'ai');
    $('panel-game-foodninja').classList.toggle('fn-online-active', mode === 'online');
    $('fn-opp-label').textContent = mode === 'online' ? '1v1' : 'BOT';
    if (mode === 'online') {
      S.running = false;
      $('fn-msg').textContent = tt('onlineHint');
      if (!sessionToken()) fnStatus(tt('needAccount'));
    } else {
      if (S.ws) leaveMatch();
      $('fn-msg').textContent = tt('pressStart');
    }
    updateHud();
    startLoop();
  }
  function initFood() {
    if (!S.inited) {
      S.inited = true;
      $('fn-mode-ai').addEventListener('click', function () { setMode('ai'); });
      $('fn-mode-online').addEventListener('click', function () { setMode('online'); });
      $('fn-create').addEventListener('click', createRoom);
      $('fn-join').addEventListener('click', joinRoom);
      $('fn-quick').addEventListener('click', quickMatch);
      $('fn-leave').addEventListener('click', leaveMatch);
      $('fn-code').addEventListener('input', function () { this.value = this.value.toUpperCase(); });
      var diffs = document.querySelectorAll('.fn-diff-btn');
      for (var i = 0; i < diffs.length; i++) {
        diffs[i].addEventListener('click', function () {
          S.diff = this.getAttribute('data-diff');
          for (var j = 0; j < diffs.length; j++) diffs[j].classList.toggle('active', diffs[j] === this);
        });
      }
      $('fn-start').addEventListener('click', function () { if (S.mode === 'ai') startAiMatch(); });
      $('fn-again').addEventListener('click', function () {
        if (S.mode === 'ai') startAiMatch();
        else { hideResult(); $('fn-msg').textContent = tt('onlineHint'); }
      });
      var challenge = function () {
        if (window.openChallengePicker) openChallengePicker('foodninja', S.finalText);
      };
      $('fn-challenge').addEventListener('click', challenge);
      $('fn-challenge2').addEventListener('click', challenge);
      var cv = $('fn-canvas');
      cv.addEventListener('pointerdown', onPointerDown);
      cv.addEventListener('pointermove', onPointerMove);
      cv.addEventListener('pointerup', onPointerUp);
      cv.addEventListener('pointercancel', onPointerUp);
      cv.addEventListener('pointerleave', onPointerUp);
    }
    updateHud();
    startLoop();
  }

  /* openGame stays the single door (gates included); wrap it like
   * games-online.js does for pong, and honour 🍔 challenge accepts. */
  var origOpenGame = window.openGame;
  if (typeof origOpenGame === 'function') {
    window.openGame = function (id) {
      origOpenGame(id);
      if (id === 'foodninja') {
        initFood();
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
    if (card && card.getAttribute('data-game-id') === 'foodninja') invitePending = true;
  }, true);

  /* exposed for the headless test harness (pure parts) and for
   * group-games.js (the group-session bridge above) */
  window.FoodNinja = {
    spawnStream: fnSpawnStream, itemDef: fnItemDef,
    segCircle: fnSegCircle, comboBonus: fnComboBonus, mulberry32: mulberry32,
    init: initFood, enterGroup: enterGroup, startGroup: startGroup,
    syncGroupClock: syncGroupClock, leaveGroup: leaveGroup
  };
})();
