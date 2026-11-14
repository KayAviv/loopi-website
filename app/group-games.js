'use strict';
/* LOOPI — group-chat game sessions (client).
 *
 * Kay's group games: inside a GROUP chat, a member taps 🎮 (or Join
 * on a session card) and the whole chat plays one FoodNinja match
 * together — same seeded food stream for everyone, live standings,
 * and a final 1..N standings card posted back into the chat.
 * NO prizes: this module never touches coins, credits or XP.
 *
 * Real mode: the session is created over REST
 * (POST /v1/rooms/:id/game-sessions — the server validates chat
 * membership and posts the game_session card), then driven over the
 * game WebSocket ({t:'gs_join'|'gs_start'|'score'}, see
 * src/gamerooms.js). The slicing itself is FoodNinja's group mode
 * (foodninja.js): this module owns the socket + session state and
 * feeds scores in/out through FoodNinja.enterGroup's hooks.
 *
 * Demo mode (no server / demo room): the whole flow is simulated
 * on-device with DEMO_CREATORS bots — labelled "demo" on the cards
 * and in the lobby, exactly like the demo challenges. You still
 * really slice; the bots' scores are simulated, over a shortened
 * 20-second match so the loop completes quickly.
 */
(function () {
  var DEMO_DURATION_MS = 20000;
  var DEMO_BOT_KEYS = ['mira', 'kenji', 'sofia'];

  function $(id) { return document.getElementById(id); }
  function appState() { return window.S || {}; }
  function myId() { var u = appState().user; return u ? u.id : 'you'; }
  function myUser() {
    return appState().user || { id: 'you', displayName: 'You', handle: 'you' };
  }
  function isDemoRoom(room) {
    return !room || room.demo || appState().demo || !sessionToken();
  }
  function sessionToken() {
    try { return localStorage.getItem('nocta.token') || ''; } catch (e) { return ''; }
  }

  var GS = {
    ws: null, wsOpen: false, pending: null,
    session: null, timers: []
  };

  /* ================= socket (same pattern as foodninja.js) ================= */
  function wsUrl() {
    var base = (window.CONFIG && CONFIG.apiBase) || '';
    var origin = base ? base.replace(/^http/i, 'ws')
      : (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
    return origin + '/v1/games/ws?token=' + encodeURIComponent(sessionToken());
  }
  function ensureWs(action) {
    if (!sessionToken()) { toast(t('gsStartFailed')); return; }
    if (GS.ws && GS.wsOpen) { action(); return; }
    GS.pending = action;
    var ws;
    try { ws = new WebSocket(wsUrl()); } catch (e) { toast(t('gsStartFailed')); return; }
    GS.ws = ws;
    ws.onopen = function () {
      GS.wsOpen = true;
      if (GS.pending) { var a = GS.pending; GS.pending = null; a(); }
    };
    ws.onmessage = function (ev) {
      var msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      onServerMsg(msg);
    };
    ws.onclose = function () { GS.ws = null; GS.wsOpen = false; };
    ws.onerror = function () { /* onclose follows */ };
  }
  function sendWs(obj) { if (GS.ws && GS.wsOpen) GS.ws.send(JSON.stringify(obj)); }

  /* ================= session state ================= */
  function setSession(s) { GS.session = s; }
  function normPlayers(list) {
    return (list || []).map(function (p) {
      return { userId: p.userId || p.key, name: p.name || p.handle || '?', score: 0 };
    });
  }
  function computeStandings(players) {
    var rows = players.map(function (p, i) {
      return { userId: p.userId, name: p.name, score: p.score || 0, order: i };
    });
    rows.sort(function (a, b) { return (b.score - a.score) || (a.order - b.order); });
    var rank = 0, prev = null;
    return rows.map(function (r, i) {
      if (prev === null || r.score < prev) { rank = i + 1; prev = r.score; }
      return { rank: rank, userId: r.userId, name: r.name, score: r.score };
    });
  }
  function displayStandings() {
    var s = GS.session;
    if (!s) return [];
    if (s.standings) return s.standings;
    return computeStandings(s.players || []);
  }

  /* ================= overlay (lobby + results) ================= */
  function openOverlay() { show($('gs-overlay')); renderOverlay(); }
  function hideOverlay() { hide($('gs-overlay')); }
  function renderOverlay() {
    var s = GS.session;
    if (!s) return;
    var g = window.gsGameOf ? gsGameOf({ game: s.game }) : null;
    $('gs-title').textContent = '🎮 ' + t('gsGroupGame') + ' · ' + (g ? g.icon + ' ' + t(g.nameKey) : s.game);
    $('gs-demo-tag').classList.toggle('hidden', !s.demo);
    var statusKey = s.status === 'playing' ? 'gsStatusPlaying'
      : (s.status === 'finished' ? 'gsStatusFinished' : 'gsStatusLobby');
    $('gs-sub').textContent = (s.demo ? '' : t('gsCode') + ' ' + s.code + ' · ') + t(statusKey) +
      ' · 👥 ' + (s.players ? s.players.length : 0) + ' · ' + t('gsNoPrizes');

    var wrap = $('gs-players');
    wrap.innerHTML = '';
    (s.players || []).forEach(function (p) {
      var row = el('div', 'gs-player');
      row.appendChild(el('span', 'mini-avatar', initial(p.name)));
      row.appendChild(el('span', 'gs-who', p.name + (p.userId === myId() ? ' (' + t('gsYou') + ')' : '')));
      if (p.userId === s.hostId) row.appendChild(el('span', 'gs-host-tag', '👑 ' + t('gsHost')));
      wrap.appendChild(row);
    });

    var st = $('gs-standings');
    var showStandings = s.status === 'finished' || (s.status === 'playing' && s.role === 'spectator');
    st.classList.toggle('hidden', !showStandings);
    if (showStandings) {
      st.innerHTML = '';
      displayStandings().forEach(function (r) { st.appendChild(gsStandingRow(r)); });
    }

    var status = $('gs-status');
    if (s.demo) status.textContent = t('gsDemoSim');
    else if (s.role === 'spectator') status.textContent = t('gsSpectator');
    else if (s.status === 'lobby') status.textContent = (s.players || []).length < 2 ? t('gsNeedTwo') : t('gsWaiting');
    else if (s.status === 'finished') status.textContent = t('gsGameOver');
    else status.textContent = '';

    $('gs-start-btn').classList.toggle('hidden',
      !(s.status === 'lobby' && s.hostId === myId()));
    $('gs-back-btn').classList.toggle('hidden', s.status !== 'finished');
  }
  function renderStrip() {
    var strip = $('fn-group-strip');
    if (!strip || !GS.session) return;
    strip.innerHTML = '';
    displayStandings().forEach(function (r) {
      var item = el('span', 'gs-strip-item' + (r.userId === myId() ? ' me' : ''),
        ('#' + r.rank) + ' ' + r.name + ' ' + r.score);
      strip.appendChild(item);
    });
  }

  /* ================= chat helpers ================= */
  function appendChatMessage(m) {
    var wrap = $('chat-messages');
    if (!wrap) return;
    wrap.appendChild(messageNode(m));
    wrap.scrollTop = wrap.scrollHeight;
  }
  function pushDemoMessage(roomId, m) {
    if (!DEMO_MESSAGES[roomId]) DEMO_MESSAGES[roomId] = [];
    DEMO_MESSAGES[roomId].push(m);
    var room = appState().currentRoom;
    if (room && room.id === roomId) appendChatMessage(m);
  }
  function flipDemoCard(roomId, code, status) {
    (DEMO_MESSAGES[roomId] || []).forEach(function (m) {
      if (m.type === 'game_session' && m.game && m.game.code === code) m.game.status = status;
    });
  }

  /* ================= real flow ================= */
  function startFromChat() {
    var room = appState().currentRoom;
    if (!room || room.type !== 'group') return;
    if (isDemoRoom(room)) { demoCreate(room); return; }
    api('/v1/rooms/' + room.id + '/game-sessions', { method: 'POST', body: { game: 'food' } })
      .then(function (r) {
        appendChatMessage(r.data.message);
        setSession({
          code: r.data.session.code, chatRoomId: room.id, game: 'food',
          status: r.data.session.status, hostId: r.data.session.hostId,
          players: normPlayers(r.data.session.players), role: 'player', demo: false
        });
        openOverlay();
        ensureWs(function () { sendWs({ t: 'gs_join', code: GS.session.code }); });
      })
      .catch(function (e) { toast(typeof localizedError === 'function' ? localizedError(e) : t('gsStartFailed')); });
  }
  function joinFromCard(m) {
    var p = m.game || {};
    if (p.status === 'finished') { toast(t('gsStatusFinished')); return; }
    if (m.demo) { demoJoin(m); return; }
    var room = appState().currentRoom;
    setSession({
      code: p.code, chatRoomId: room ? room.id : null, game: p.game || 'food',
      status: p.status || 'lobby', hostId: p.hostId,
      players: [], role: null, demo: false
    });
    openOverlay();
    ensureWs(function () { sendWs({ t: 'gs_join', code: p.code }); });
  }
  function beginPlay(msg) {
    var s = GS.session;
    if (!s) return;
    s.status = 'playing';
    s.players = normPlayers(msg.players);
    hideOverlay();
    if (window.FoodNinja) {
      FoodNinja.enterGroup({ onScore: function (sc) { sendWs({ t: 'score', score: sc }); } });
    }
    showPanel('game-foodninja');
    if (window.FoodNinja) FoodNinja.startGroup(msg.seed, msg.durationMs);
    renderStrip();
  }
  function finishWith(standings) {
    var s = GS.session;
    if (!s) return;
    s.status = 'finished';
    s.standings = (standings || []).map(function (r) {
      return { rank: r.rank, userId: r.key || r.userId, name: r.name, score: r.score };
    });
    renderStrip();
    $('fn-group-back').classList.remove('hidden');
    openOverlay();
    // pull the server's own results card into the chat behind us
    if (typeof loadMessages === 'function') loadMessages();
  }
  function onServerMsg(msg) {
    var s = GS.session;
    if (msg.t === 'error') {
      toast(msg.message || t('gsStartFailed'));
      var st = $('gs-status');
      if (st && s) st.textContent = msg.message || '';
      return;
    }
    if (!s) return;
    if (msg.t === 'gs_joined') {
      s.role = msg.role;
      s.status = msg.status;
      renderOverlay();
    } else if (msg.t === 'gs_lobby') {
      s.status = msg.status;
      s.hostId = msg.hostId;
      var scores = {};
      (s.players || []).forEach(function (p) { scores[p.userId] = p.score; });
      s.players = normPlayers(msg.players);
      s.players.forEach(function (p) { p.score = scores[p.userId] || 0; });
      renderOverlay();
    } else if (msg.t === 'gs_start') {
      if (s.role === 'spectator') {
        // Spectators stay in the overlay and watch the standings move.
        s.status = 'playing';
        s.players = normPlayers(msg.players);
        renderOverlay();
      } else {
        beginPlay(msg);
      }
    } else if (msg.t === 'gs_scores') {
      (msg.scores || []).forEach(function (sc) {
        var p = (s.players || []).find(function (x) { return x.userId === sc.key; });
        if (p) p.score = sc.score;
      });
      s.standings = (msg.scores || []).map(function (sc) {
        var p = (s.players || []).find(function (x) { return x.userId === sc.key; });
        return { rank: sc.rank, userId: sc.key, name: p ? p.name : '?', score: sc.score };
      });
      if (window.FoodNinja) FoodNinja.syncGroupClock(msg.left);
      renderStrip();
      if (s.role === 'spectator') renderOverlay();
    } else if (msg.t === 'gs_over') {
      finishWith(msg.standings);
    }
  }

  /* ================= demo flow (on-device simulation) ================= */
  function later(fn, ms) { GS.timers.push(setTimeout(fn, ms)); }
  function clearTimers() {
    GS.timers.forEach(function (id) { clearTimeout(id); clearInterval(id); });
    GS.timers = [];
  }
  function demoCreate(room) {
    var me = myUser();
    var code = 'DEMO';
    pushDemoMessage(room.id, {
      id: 'gs_' + Date.now(), sender: me, type: 'game_session', demo: true, mine: true,
      game: { kind: 'session', game: 'food', code: code, hostId: me.id, status: 'lobby' },
      createdAt: Date.now()
    });
    setSession({
      code: code, chatRoomId: room.id, game: 'food', status: 'lobby', hostId: me.id,
      players: [{ userId: me.id, name: me.displayName || 'You', score: 0 }],
      role: 'player', demo: true
    });
    openOverlay();
    DEMO_BOT_KEYS.forEach(function (k, i) {
      later(function () {
        if (!GS.session || !GS.session.demo || GS.session.status !== 'lobby') return;
        var c = DEMO_CREATORS[k];
        GS.session.players.push({ userId: 'demo_' + k, name: c.displayName, score: 0 });
        renderOverlay();
      }, 800 * (i + 1));
    });
  }
  function demoJoin(m) {
    var me = myUser();
    var host = m.sender || DEMO_CREATORS.mira;
    var room = appState().currentRoom;
    setSession({
      code: (m.game || {}).code || 'DEMO', chatRoomId: room ? room.id : null, game: 'food',
      status: 'lobby', hostId: host.id, role: 'player', demo: true,
      players: [
        { userId: host.id, name: host.displayName || 'Host', score: 0 },
        { userId: me.id, name: me.displayName || 'You', score: 0 }
      ]
    });
    openOverlay();
    later(function () {
      if (!GS.session || GS.session.status !== 'lobby') return;
      var c = DEMO_CREATORS.sofia;
      if (!GS.session.players.some(function (p) { return p.userId === 'demo_sofia'; })) {
        GS.session.players.push({ userId: 'demo_sofia', name: c.displayName, score: 0 });
        renderOverlay();
      }
    }, 1200);
    // the demo host is a bot — it starts the match after a beat
    later(function () {
      if (GS.session && GS.session.demo && GS.session.status === 'lobby') demoStart();
    }, 3500);
  }
  function demoStart() {
    var s = GS.session;
    if (!s || s.status !== 'lobby') return;
    if (s.players.length < 2) { toast(t('gsNeedTwo')); return; }
    s.status = 'playing';
    flipDemoCard(s.chatRoomId, s.code, 'playing');
    hideOverlay();
    if (window.FoodNinja) {
      FoodNinja.enterGroup({ onScore: function (sc) {
        var me = s.players.find(function (p) { return p.userId === myId(); });
        if (me) me.score = sc;
        renderStrip();
      } });
    }
    showPanel('game-foodninja');
    if (window.FoodNinja) FoodNinja.startGroup((Math.random() * 0xffffffff) >>> 0, DEMO_DURATION_MS);
    renderStrip();
    var tick = setInterval(function () {
      if (!GS.session || GS.session.status !== 'playing') { clearInterval(tick); return; }
      s.players.forEach(function (p) {
        if (p.userId !== myId() && Math.random() < 0.6) p.score += 5 + Math.floor(Math.random() * 12);
      });
      renderStrip();
    }, 900);
    GS.timers.push(tick);
    later(demoFinish, DEMO_DURATION_MS + 500);
  }
  function demoFinish() {
    var s = GS.session;
    if (!s || s.status === 'finished') return;
    s.status = 'finished';
    clearTimers();
    s.standings = computeStandings(s.players);
    renderStrip();
    $('fn-group-back').classList.remove('hidden');
    flipDemoCard(s.chatRoomId, s.code, 'finished');
    pushDemoMessage(s.chatRoomId, {
      id: 'gsr_' + Date.now(),
      sender: { id: s.hostId, displayName: (s.players[0] || {}).name || '', handle: '' },
      type: 'game_results', demo: true,
      game: { kind: 'results', game: 'food', code: s.code, standings: s.standings },
      createdAt: Date.now()
    });
    openOverlay();
  }

  /* ================= shared actions ================= */
  function startPressed() {
    var s = GS.session;
    if (!s) return;
    if (s.demo) { demoStart(); return; }
    sendWs({ t: 'gs_start' });
  }
  function closePressed() {
    var s = GS.session;
    if (s && !s.demo && s.status === 'lobby') sendWs({ t: 'gs_leave' });
    if (s && s.demo && s.status === 'lobby') { clearTimers(); GS.session = null; }
    hideOverlay();
  }
  function backToChat() {
    hideOverlay();
    clearTimers();
    if (window.FoodNinja) FoodNinja.leaveGroup();
    $('fn-group-back').classList.add('hidden');
    var room = appState().currentRoom;
    if (room) enterChat(room);
    else showPanel('inbox');
  }

  /* ================= wiring ================= */
  $('chat-game-btn').addEventListener('click', startFromChat);
  $('gs-start-btn').addEventListener('click', startPressed);
  $('gs-close-btn').addEventListener('click', closePressed);
  $('gs-back-btn').addEventListener('click', backToChat);
  $('fn-group-back').addEventListener('click', backToChat);

  window.GroupGames = { joinFromCard: joinFromCard, startFromChat: startFromChat };
})();
