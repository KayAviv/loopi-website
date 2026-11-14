'use strict';
/* LOOPI app-shell smoke test (no browser needed).
 *
 *   node smoke-test.js
 *
 * Checks:
 *  1. index.html / style.css / app.js exist and are non-trivial.
 *  2. app.js compiles (syntax) via vm.Script.
 *  3. index.html links style.css and app.js.
 *  4. Every element id app.js looks up ($('...') / getElementById)
 *     actually exists in index.html.
 *  5. The design-correction invariants hold: NO language toggle ids
 *     anywhere in the main UI markup, and the Settings screen +
 *     its Profile entry point DO exist.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dir = __dirname;
let failures = 0;
function check(name, ok, extra) {
  console.log((ok ? '  ok  ' : ' FAIL ') + name + (extra ? ' — ' + extra : ''));
  if (!ok) failures++;
}

const html = fs.existsSync(path.join(dir, 'index.html')) ? fs.readFileSync(path.join(dir, 'index.html'), 'utf8') : '';
const css = fs.existsSync(path.join(dir, 'style.css')) ? fs.readFileSync(path.join(dir, 'style.css'), 'utf8') : '';
const js = fs.existsSync(path.join(dir, 'app.js')) ? fs.readFileSync(path.join(dir, 'app.js'), 'utf8') : '';

check('index.html exists', html.length > 2000, html.length + ' bytes');
check('style.css exists', css.length > 2000, css.length + ' bytes');
check('app.js exists', js.length > 5000, js.length + ' bytes');

try { new vm.Script(js); check('app.js compiles', true); }
catch (e) { check('app.js compiles', false, e.message); }

check('index.html links style.css', /href="style\.css"/.test(html));
check('index.html loads app.js', /src="app\.js"/.test(html));

const ids = new Set();
let m;
const reDollar = /\$\('([a-zA-Z0-9-]+)'\)/g;
while ((m = reDollar.exec(js))) ids.add(m[1]);
const reGebi = /getElementById\('([a-zA-Z0-9-]+)'\)/g;
while ((m = reGebi.exec(js))) ids.add(m[1]);
const missing = [];
ids.forEach(function (id) {
  if (html.indexOf('id="' + id + '"') < 0) missing.push(id);
});
check('all ' + ids.size + ' JS-referenced ids exist in index.html', missing.length === 0,
  missing.length ? 'missing: ' + missing.join(', ') : '');

check('no lang-toggle button in markup (design correction)', html.indexOf('lang-toggle') < 0);
check('settings panel exists', html.indexOf('id="panel-settings"') >= 0);
check('settings entry on profile exists', html.indexOf('id="settings-btn"') >= 0);
check('language radios exist', html.indexOf('id="lang-en"') >= 0 && html.indexOf('id="lang-zh"') >= 0);
check('key screens present', ['screen-auth', 'screen-onboarding', 'panel-home', 'panel-discover',
  'panel-live', 'panel-inbox', 'panel-profile', 'panel-chat', 'panel-live-room',
  'create-panel', 'comments-sheet', 'chat-bubble', 'chat-overlay', 'explore-grid', 'feed']
  .every(function (id) { return html.indexOf('id="' + id + '"') >= 0; }));

check('games tab present', html.indexOf('data-tab="games"') >= 0);
check('games hub present', ['panel-games', 'games-grid', 'coins-pill', 'games-level-strip',
  'games-leaderboard', 'challenge-picker', 'challenge-room-list', 'challenge-cancel']
  .every(function (id) { return html.indexOf('id="' + id + '"') >= 0; }));
check('game screens present', ['panel-game-penalty', 'panel-game-pong', 'panel-game-volley',
  'panel-game-poker', 'pk-goal', 'pk-score', 'pk-prompt', 'pk-msg', 'pk-result',
  'pong-canvas', 'pong-start', 'pong-msg', 'volley-challenge', 'poker-challenge']
  .every(function (id) { return html.indexOf('id="' + id + '"') >= 0; }));
check('level-gate data present in app.js (penalty/volley L1, foodninja L2, pong L3, poker L4)',
  /id: 'penalty'[^}]*unlockLevel: 1/.test(js) &&
  /id: 'volley'[^}]*unlockLevel: 1/.test(js) &&
  /id: 'foodninja'[^}]*unlockLevel: 2/.test(js) &&
  /id: 'pong'[^}]*unlockLevel: 3/.test(js) &&
  /id: 'poker'[^}]*unlockLevel: 4/.test(js));
check('challenge message type wired into chat rendering', js.indexOf("m.type === 'challenge'") >= 0);
check('poker free-coins-only rule stated on the poker screen',
  html.indexOf('Free coins only') >= 0 && js.indexOf('pokerFreeRule') >= 0);
check('live connection-state chip exists', html.indexOf('id="lr-conn"') >= 0);
check('live room wired to the server token endpoint',
  js.indexOf("'/v1/live/' + s.id + '/token'") >= 0);
check('tip buttons wired to the server tip endpoint',
  js.indexOf("'/v1/live/' + s.id + '/tip'") >= 0 && js.indexOf('body: { credits: amount }') >= 0);
check('tip amounts are credits, not dollars',
  html.indexOf('data-tip="1">✦ 1') >= 0 && html.indexOf('data-tip="20">✦ 20') >= 0);

/* ---- creator levels engine wiring ---- */
check('creator level is demoted to one quiet profile line (no card/explainer)',
  html.indexOf('id="profile-level-line"') >= 0 && html.indexOf('id="creator-level-line"') >= 0 &&
  html.indexOf('level-card') < 0 && html.indexOf('levels-explainer') < 0 &&
  js.indexOf('function profileLevelLine') >= 0);
check('creator rules still load from the server endpoint when signed in',
  js.indexOf("'/v1/creator-levels'") >= 0 && js.indexOf('loadCreatorLevels') >= 0);
check('bottom bar has exactly Feed · Profile · Search, in that order',
  (function () {
    var a = html.indexOf('data-bottom-nav="home"');
    var b = html.indexOf('data-bottom-nav="profile"');
    var c = html.indexOf('data-bottom-nav="discover"');
    return a >= 0 && b > a && c > b && (html.match(/data-bottom-nav=/g) || []).length === 3;
  })());
check('Instagram-style profile chrome exists for own + creator profiles',
  ['profile-avatar', 'profile-video-count', 'profile-followers-count', 'profile-following-count',
   'edit-profile-btn', 'profile-share-btn', 'creator-avatar', 'creator-video-count',
   'creator-followers-count', 'creator-following-count', 'creator-follow-btn',
   'creator-message-btn', 'creator-share-btn', 'creator-grid', 'profile-grid']
    .every(function (id) { return html.indexOf('id="' + id + '"') >= 0; }));
check('profile tabs split Videos from the Shop / Credits tab',
  html.indexOf('id="profile-tab-videos"') >= 0 && html.indexOf('id="profile-tab-shop"') >= 0 &&
  html.indexOf('id="profile-videos-pane"') >= 0 && html.indexOf('id="profile-shop-pane"') >= 0 &&
  html.indexOf('id="earnings-balance"') >= 0 && js.indexOf("'/v1/me/earnings'") >= 0 &&
  js.indexOf('function setProfileTab') >= 0);
check('follower / following lists open through the shared people sheet',
  html.indexOf('id="people-sheet"') >= 0 && js.indexOf('function openPeopleList') >= 0 &&
  js.indexOf("'/' + kind") >= 0);
check('creator Message button uses the existing DM endpoint',
  js.indexOf("api('/v1/dms'") >= 0 && js.indexOf('function messageCreator') >= 0);
check('credits popup is the shared purchase surface (profile + Generate)',
  html.indexOf('id="credits-sheet"') >= 0 && html.indexOf('id="popup-packs-list"') >= 0 &&
  html.indexOf('id="gen-topup"') >= 0 && js.indexOf('function openCreditsPopup') >= 0 &&
  js.indexOf('function renderPackList') >= 0 &&
  js.indexOf("api('/v1/credits/purchase'") >= 0);
check('insufficient credits at Generate opens the popup',
  js.indexOf('openCreditsPopup(cost, true)') >= 0 && js.indexOf('openCreditsPopup((e.data && e.data.needed) || cost, true)') >= 0);
check('biometric shell bridge is wired (native side gates it)',
  html.indexOf('id="bio-toggle"') >= 0 && html.indexOf('id="bio-unlock-btn"') >= 0 &&
  js.indexOf('window.LoopiBioCallback') >= 0 && js.indexOf('function restoreSession') >= 0);
check('demo fallback mirror of the creator rules exists',
  js.indexOf('demoLevelsInfo') >= 0 && js.indexOf('CREATOR_BADGES') >= 0);
check('feed renders the sample composition (kind chip + gold level tag + music line)',
  js.indexOf("'filmed-chip'") >= 0 && js.indexOf("'level-tag'") >= 0 && js.indexOf("'musicline'") >= 0);
check('xpAward summaries are applied client-side (level-up / badge toasts)',
  js.indexOf('applyXpAward') >= 0 && js.indexOf('xpAward') >= 0);

/* ---- games upgrade (games-online.js + games.css) ---- */
const gamesJs = fs.existsSync(path.join(dir, 'games-online.js')) ? fs.readFileSync(path.join(dir, 'games-online.js'), 'utf8') : '';
const gamesCss = fs.existsSync(path.join(dir, 'games.css')) ? fs.readFileSync(path.join(dir, 'games.css'), 'utf8') : '';
check('games-online.js exists', gamesJs.length > 5000, gamesJs.length + ' bytes');
check('games.css exists', gamesCss.length > 1500, gamesCss.length + ' bytes');
try { new vm.Script(gamesJs); check('games-online.js compiles', true); }
catch (e) { check('games-online.js compiles', false, e.message); }
check('index.html loads games-online.js', /src="games-online\.js"/.test(html));
check('index.html links games.css', /href="games\.css"/.test(html));
check('pong online bar present', ['pong-online', 'po-mode-bot', 'po-mode-online', 'po-online-panel',
  'po-create', 'po-quick', 'po-code', 'po-join', 'po-room-code', 'po-room-code-val', 'po-status', 'po-leave']
  .every(function (id) { return html.indexOf('id="' + id + '"') >= 0; }));
const gIds = new Set();
let gm;
const reDollarG = /\$\('([a-zA-Z0-9-]+)'\)/g;
while ((gm = reDollarG.exec(gamesJs))) gIds.add(gm[1]);
const missingG = [];
gIds.forEach(function (id) {
  if (html.indexOf('id="' + id + '"') < 0) missingG.push(id);
});
check('all ' + gIds.size + ' games-online.js ids exist in index.html', missingG.length === 0,
  missingG.length ? 'missing: ' + missingG.join(', ') : '');
check('online client targets the game-room socket', gamesJs.indexOf('/v1/games/ws') >= 0);
check('power-up set wired in the client (big/slow/multi/shield)',
  ['big', 'slow', 'multi', 'shield'].every(function (k) { return gamesJs.indexOf(k) >= 0; }));
check('games.css carries the stadium + neon polish',
  gamesCss.indexOf('.pk-goal') >= 0 && gamesCss.indexOf('.po-mode') >= 0 && gamesCss.indexOf('.game-soon') >= 0);

/* ---- penalty kicks: swipe input (zones retired) ---- */
check('penalty tap-zones are gone from the client', js.indexOf('pk-zone') < 0 && html.indexOf('pk-zone') < 0);
check('penalty swipe engine wired (shot target + dive resolution)',
  js.indexOf('pkShotTarget') >= 0 && js.indexOf('pkResolveSave') >= 0 && js.indexOf('pkDiveReach') >= 0);
check('penalty goal listens to pointer swipes',
  js.indexOf("addEventListener('pointerdown', pkPointerDown)") >= 0 &&
  js.indexOf("addEventListener('pointerup', pkPointerUp)") >= 0);
check('penalty power meter present', html.indexOf('id="pk-power"') >= 0 && html.indexOf('id="pk-power-fill"') >= 0);
check('penalty stage actors styled (keeper / ball / aim)',
  gamesCss.indexOf('.pk-keeper') >= 0 && gamesCss.indexOf('.pk-ball') >= 0 && gamesCss.indexOf('.pk-aim') >= 0 &&
  gamesCss.indexOf('.pk-power') >= 0);

/* ---- FoodNinja ---- */
const fnJs = fs.existsSync(path.join(dir, 'foodninja.js')) ? fs.readFileSync(path.join(dir, 'foodninja.js'), 'utf8') : '';
check('foodninja.js exists', fnJs.length > 5000, fnJs.length + ' bytes');
try { new vm.Script(fnJs); check('foodninja.js compiles', true); }
catch (e) { check('foodninja.js compiles', false, e.message); }
check('index.html loads foodninja.js', /src="foodninja\.js"/.test(html));
check('foodninja screen present', ['panel-game-foodninja', 'fn-canvas', 'fn-score', 'fn-opp', 'fn-opp-label',
  'fn-time', 'fn-lives', 'fn-meter-fill', 'fn-fever-tag', 'fn-msg', 'fn-result', 'fn-result-text',
  'fn-again', 'fn-challenge', 'fn-challenge2', 'fn-controls', 'fn-start', 'fn-mode-ai', 'fn-mode-online',
  'fn-online-panel', 'fn-diff-row', 'fn-create', 'fn-quick', 'fn-code', 'fn-join', 'fn-room-code',
  'fn-room-code-val', 'fn-status', 'fn-leave']
  .every(function (id) { return html.indexOf('id="' + id + '"') >= 0; }));
const fnIds = new Set();
let fm;
const reDollarF = /\$\('([a-zA-Z0-9-]+)'\)/g;
while ((fm = reDollarF.exec(fnJs))) fnIds.add(fm[1]);
const missingF = [];
fnIds.forEach(function (id) {
  if (html.indexOf('id="' + id + '"') < 0) missingF.push(id);
});
check('all ' + fnIds.size + ' foodninja.js ids exist in index.html', missingF.length === 0,
  missingF.length ? 'missing: ' + missingF.join(', ') : '');
check('foodninja has its twists (platter / golden / fever / rotten egg)',
  fnJs.indexOf('COMBO PLATTER') >= 0 && fnJs.indexOf('golden') >= 0 &&
  fnJs.indexOf('FEVER') >= 0 && fnJs.indexOf('hazard') >= 0);
check('foodninja speaks the food-room protocol',
  fnJs.indexOf("game: 'food'") >= 0 && fnJs.indexOf("t: 'score'") >= 0 && fnJs.indexOf('/v1/games/ws') >= 0);
check('foodninja styles present', gamesCss.indexOf('#fn-canvas') >= 0 && gamesCss.indexOf('.fn-hud') >= 0 &&
  gamesCss.indexOf('.fn-meter') >= 0);
const gameroomsSrc = fs.existsSync(path.join(dir, '..', 'src', 'gamerooms.js'))
  ? fs.readFileSync(path.join(dir, '..', 'src', 'gamerooms.js'), 'utf8') : '';
check('server deals food rooms (createFoodMatch)', gameroomsSrc.indexOf('createFoodMatch') >= 0);

/* ---- Volfield ---- */
const vfEngJs = fs.existsSync(path.join(dir, 'volfield-engine.js')) ? fs.readFileSync(path.join(dir, 'volfield-engine.js'), 'utf8') : '';
const vfJs = fs.existsSync(path.join(dir, 'volfield.js')) ? fs.readFileSync(path.join(dir, 'volfield.js'), 'utf8') : '';
check('volfield-engine.js exists', vfEngJs.length > 5000, vfEngJs.length + ' bytes');
check('volfield.js exists', vfJs.length > 5000, vfJs.length + ' bytes');
try { new vm.Script(vfEngJs); check('volfield-engine.js compiles', true); }
catch (e) { check('volfield-engine.js compiles', false, e.message); }
try { new vm.Script(vfJs); check('volfield.js compiles', true); }
catch (e) { check('volfield.js compiles', false, e.message); }
check('index.html loads volfield engine + game + styles',
  /src="volfield-engine\.js"/.test(html) && /src="volfield\.js"/.test(html) && /href="volfield\.css"/.test(html));
check('volfield screen present', ['panel-game-volfield', 'vf-canvas', 'vf-msg', 'vf-result',
  'vf-result-text', 'vf-again', 'vf-next', 'vf-challenge', 'vf-start', 'vf-mode-boss', 'vf-mode-duel',
  'vf-stage-row', 'vf-stage-prev', 'vf-stage-next', 'vf-stage-name', 'vf-best', 'vf-pct', 'vf-score',
  'vf-lives', 'vf-shield-fill', 'vf-duel-bar', 'vf-you-fill', 'vf-bot-fill', 'vf-time', 'vf-rules']
  .every(function (id) { return html.indexOf('id="' + id + '"') >= 0; }));
const vfIds = new Set();
let vm3;
const reDollarV = /\$\('([a-zA-Z0-9-]+)'\)/g;
while ((vm3 = reDollarV.exec(vfJs))) vfIds.add(vm3[1]);
const missingV = [];
vfIds.forEach(function (id) {
  if (html.indexOf('id="' + id + '"') < 0) missingV.push(id);
});
check('all ' + vfIds.size + ' volfield.js ids exist in index.html', missingV.length === 0,
  missingV.length ? 'missing: ' + missingV.join(', ') : '');
check('volfield hub entry present at L1 (Kay spec slot)',
  /id: 'volfield'[^}]*unlockLevel: 1/.test(js));
check('volfield hub art shipped (games3d/volfield.png)',
  fs.existsSync(path.join(dir, 'games3d', 'volfield.png')));
(function () {
  try {
    const eng = require(path.join(dir, 'volfield-engine.js'));
    const g = eng.createGame(0, 5);
    let won = false;
    check('volfield engine loads in node with 6 boss stages',
      !!eng && eng.STAGES.length === 6 && g.boss && g.minions.length === 1);
    const grid = new Uint8Array(eng.COLS * eng.ROWS);
    for (let y = 0; y < eng.ROWS; y++) for (let x = 0; x < eng.COLS; x++) {
      if (x === 0 || y === 0 || x === eng.COLS - 1 || y === eng.ROWS - 1) grid[eng.idx(x, y)] = eng.CLAIMED;
    }
    for (let y = 1; y < eng.ROWS - 1; y++) grid[eng.idx(10, y)] = eng.TRAIL;
    const now = eng.vfCapture(grid, { x: 18, y: 16 });
    check('volfield capture excludes the boss side', now.indexOf(eng.idx(5, 16)) >= 0 && now.indexOf(eng.idx(18, 16)) < 0);
    void won;
  } catch (e) { check('volfield engine loads in node', false, e.message); }
})();

/* ---- group-chat game sessions (group-games.js + cards) ---- */
const ggPath = path.join(dir, 'group-games.js');
check('group-games.js exists', fs.existsSync(ggPath));
const ggJs = fs.existsSync(ggPath) ? fs.readFileSync(ggPath, 'utf8') : '';
try { new Function(ggJs); check('group-games.js parses', true); }
catch (e) { check('group-games.js parses', false, e.message); }
const ggIds = new Set();
let gm2;
const reDollarGG = /\$\('([a-zA-Z0-9-]+)'\)/g;
while ((gm2 = reDollarGG.exec(ggJs))) ggIds.add(gm2[1]);
const missingGG = [];
ggIds.forEach(function (id) {
  if (html.indexOf('id="' + id + '"') < 0) missingGG.push(id);
});
check('all ' + ggIds.size + ' group-games.js ids exist in index.html', missingGG.length === 0,
  missingGG.length ? 'missing: ' + missingGG.join(', ') : '');
check('group-games.js speaks the session protocol',
  ggJs.indexOf("t: 'gs_join'") >= 0 && ggJs.indexOf("t: 'gs_start'") >= 0 &&
  ggJs.indexOf('/game-sessions') >= 0);
check('group-games.js hands scores to the slicing layer',
  ggJs.indexOf('FoodNinja.enterGroup') >= 0 && ggJs.indexOf('FoodNinja.startGroup') >= 0);
check('group-games.js simulates demo sessions with the demo creators',
  ggJs.indexOf('DEMO_CREATORS') >= 0 && ggJs.indexOf('demoFinish') >= 0);
const gsChromeIds = ['gs-overlay', 'gs-title', 'gs-sub', 'gs-demo-tag', 'gs-players',
 'gs-standings', 'gs-status', 'gs-start-btn', 'gs-back-btn', 'gs-close-btn',
 'chat-game-btn', 'fn-group-bar', 'fn-group-strip', 'fn-group-back'];
check('group-game chrome ids all present',
  gsChromeIds.every(function (id) { return html.indexOf('id="' + id + '"') >= 0; }),
  gsChromeIds.filter(function (id) { return html.indexOf('id="' + id + '"') < 0; }).join(', '));
check('FoodNinja exposes the group-session bridge',
  fnJs.indexOf('enterGroup: enterGroup') >= 0 && fnJs.indexOf('startGroup: startGroup') >= 0 &&
  fnJs.indexOf('leaveGroup: leaveGroup') >= 0);
const appJsAll = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');
check('app.js renders the game_session + game_results cards',
  appJsAll.indexOf("m.type === 'game_session'") >= 0 && appJsAll.indexOf("m.type === 'game_results'") >= 0 &&
  appJsAll.indexOf('function gameSessionCard') >= 0 && appJsAll.indexOf('function gameResultsCard') >= 0);
check('the chat cards are generic (game resolved through a registry)',
  appJsAll.indexOf('GS_GAME_IDS') >= 0 && appJsAll.indexOf('gsGameOf') >= 0);
check('backend exposes the N-player group food match',
  gameroomsSrc.indexOf('createGroupFoodMatch') >= 0 && gameroomsSrc.indexOf('gs_join') >= 0);
check('zh strings cover the group-game chrome', appJsAll.indexOf('群游戏') >= 0);
check('group-game styles present', gamesCss.indexOf('.gs-standing') >= 0 &&
  gamesCss.indexOf('.gs-strip-item') >= 0 && gamesCss.indexOf('.fn-group-bar') >= 0);

/* ---- localization pass (EN / 中文, edition default) ---- */
function extractTable(srcText, marker, closer, varName) {
  const a = srcText.indexOf(marker);
  if (a < 0) return null;
  const b = srcText.indexOf(closer, a);
  if (b < 0) return null;
  const sb = { window: {} };
  vm.createContext(sb);
  try {
    vm.runInContext(srcText.slice(a, b + closer.length) + ';this.__T=' + varName + ';', sb);
    return sb.__T;
  } catch (e) { return null; }
}
function keyParity(T) {
  if (!T || !T.en || !T.zh || !T.hi) return null;
  const enK = Object.keys(T.en), zhK = Object.keys(T.zh), hiK = Object.keys(T.hi);
  return {
    n: enK.length,
    missZh: enK.filter(function (k) { return !(k in T.zh); }),
    missEn: zhK.filter(function (k) { return !(k in T.en); }),
    missHi: enK.filter(function (k) { return !(k in T.hi); }),
    extraHi: hiK.filter(function (k) { return !(k in T.en); })
  };
}
const STR = extractTable(js, 'var STRINGS = {', '\n};', 'STRINGS');
check('app.js STRINGS table extractable (en + zh + hi)', !!STR && !!STR.en && !!STR.zh && !!STR.hi);
const par = keyParity(STR);
check('app.js STRINGS key parity en<->zh<->hi', !!par && par.missZh.length === 0 && par.missEn.length === 0 && par.missHi.length === 0 && par.extraHi.length === 0,
  par ? par.n + ' keys per language' +
    (par.missZh.length ? '; missing in zh: ' + par.missZh.join(',') : '') +
    (par.missEn.length ? '; missing in en: ' + par.missEn.join(',') : '') +
    (par.missHi.length ? '; missing in hi: ' + par.missHi.join(',') : '') +
    (par.extraHi.length ? '; extra in hi: ' + par.extraHi.join(',') : '') : 'table not extractable');
check('zh STRINGS are actually Chinese (demo tag / settings samples)',
  !!STR && STR.zh.demoTag === '演示' && STR.en.demoTag === 'demo' &&
  typeof STR.zh.appTitle === 'string' && STR.zh.appTitle !== STR.en.appTitle);
check('hi STRINGS are actually Hindi (demo tag / settings samples)',
  !!STR && STR.hi.demoTag === 'डेमो' && STR.en.demoTag === 'demo' &&
  typeof STR.hi.appTitle === 'string' && STR.hi.appTitle !== STR.en.appTitle);
check('main server error codes localized in both languages',
  !!STR && ['err_OFFLINE', 'err_INSUFFICIENT_CREDITS', 'err_GENERATION_NOT_CONFIGURED',
    'err_BILLING_NOT_CONFIGURED', 'err_BILLING_MISCONFIGURED', 'err_LIVE_NOT_CONFIGURED',
    'err_CANNOT_TIP_SELF', 'err_STREAM_ENDED', 'err_UNKNOWN_PRODUCT',
    'err_PURCHASE_ALREADY_PROCESSED', 'err_PURCHASE_VERIFICATION_FAILED', 'err_GENERATION_FAILED']
    .every(function (k) { return typeof STR.en[k] === 'string' && typeof STR.zh[k] === 'string' && typeof STR.hi[k] === 'string'; }));
check('edition DEFAULT_LANG constant present in app.js', /var DEFAULT_LANG = '(en|zh)';/.test(js));
check('first-run language comes from DEFAULT_LANG; the saved Settings choice wins',
  js.indexOf('var lang = DEFAULT_LANG;') >= 0 && js.indexOf("localStorage.getItem('nocta.lang')") >= 0);
check('localizedError() maps server codes to localized strings', js.indexOf('function localizedError') >= 0);
check('language radios live ONLY inside the settings panel', (function () {
  const panelAt = html.indexOf('id="panel-settings"');
  if (panelAt < 0) return false;
  let count = 0, idx = html.indexOf('name="lang"'), ok = true;
  while (idx >= 0) { count++; if (idx < panelAt) ok = false; idx = html.indexOf('name="lang"', idx + 1); }
  return ok && count === 3;
})());
check('no other language control anywhere in the markup',
  !/<select[^>]*\blang/i.test(html) && html.indexOf('lang-toggle') < 0 &&
  !/data-i18n="(language|tabHome)"[^>]*id="(?!panel-settings)/.test(html));
[['games-online.js', gamesJs], ['foodninja.js', fnJs], ['volfield.js', vfJs]].forEach(function (pair) {
  const T = extractTable(pair[1], 'var TXT = {', '\n  };', 'TXT');
  const p = keyParity(T);
  check(pair[0] + ' TXT key parity en<->zh<->hi', !!p && p.missZh.length === 0 && p.missEn.length === 0 && p.missHi.length === 0 && p.extraHi.length === 0,
    p ? p.n + ' keys per language' +
      (p.missZh.length ? '; missing in zh: ' + p.missZh.join(',') : '') +
      (p.missEn.length ? '; missing in en: ' + p.missEn.join(',') : '') +
      (p.missHi.length ? '; missing in hi: ' + p.missHi.join(',') : '') +
      (p.extraHi.length ? '; extra in hi: ' + p.extraHi.join(',') : '') : 'table not extractable');
});

/* ---- live gifts + live chat ---- */
check('gift shelf chrome present (button, sheet, grid, overlay)',
  ['lr-gift-btn', 'gift-sheet', 'gift-grid', 'gift-balance', 'gift-msg', 'gift-close',
   'lr-gift-overlay', 'lr-gift-emoji']
    .every(function (id) { return html.indexOf('id="' + id + '"') >= 0; }));
check('gift shelf wired to the server catalogue + purchase endpoints',
  js.indexOf("'/v1/live/gifts'") >= 0 && js.indexOf("'/v1/live/' + s.id + '/gift'") >= 0 &&
  js.indexOf('function openGiftShelf') >= 0 && js.indexOf('function sendGift') >= 0 &&
  js.indexOf('function renderGiftShelf') >= 0);
check('live chat runs on the server live-messages endpoints (text + gift events)',
  js.indexOf("'/v1/live/' + s.id + '/messages'") >= 0 && js.indexOf('function loadLiveChat') >= 0 &&
  js.indexOf("m.type === 'gift'") >= 0 && js.indexOf('function liveChatNode') >= 0);
check('gift strings exist in all three languages (shelf, names, errors)',
  !!STR && ['giftBtn', 'giftShelfTitle', 'giftBalance', 'giftSentMsg', 'giftEventLine', 'giftDemo',
    'giftName_rose', 'giftName_heart', 'giftName_star', 'giftName_crown', 'giftName_rocket',
    'giftName_diamond', 'giftName_castle', 'giftName_dragon',
    'err_CANNOT_GIFT_SELF', 'err_INVALID_GIFT']
    .every(function (k) { return typeof STR.en[k] === 'string' && typeof STR.zh[k] === 'string' && typeof STR.hi[k] === 'string'; }));
check('gift overlay animation + distinct gift chat rows styled',
  css.indexOf('.lr-gift-overlay') >= 0 && css.indexOf('@keyframes gift-pop') >= 0 &&
  css.indexOf('.lc-msg.gift') >= 0 && css.indexOf('.gift-grid') >= 0);
check('insufficient credits on a gift opens the shared credits popup',
  js.indexOf("e.data.code === 'INSUFFICIENT_CREDITS'") >= 0 &&
  js.indexOf('openCreditsPopup((e.data && e.data.needed) || g.credits, false)') >= 0);

/* ---- weekly competitions (Discover card) ---- */
check('competition card chrome present in Discover',
  html.indexOf('id="comp-card"') >= 0 && html.indexOf('id="comp-body"') >= 0 &&
  html.indexOf('data-i18n="compTitle"') >= 0);
check('competitions wired to the server endpoints',
  js.indexOf("'/v1/competitions/current'") >= 0 && js.indexOf("'/v1/competitions/past'") >= 0 &&
  js.indexOf("'/v1/competitions/enter'") >= 0 && js.indexOf('function renderCompetition') >= 0 &&
  js.indexOf('function loadCompetitions') >= 0);
check('competition strings exist in all three languages (incl. dormant + errors)',
  !!STR && ['compTitle', 'compDormant', 'compProgress', 'compEnter', 'compGenerateCta',
    'compPastWinners', 'err_COMPETITIONS_NOT_ACTIVE', 'err_NOT_AI_VIDEO', 'err_ALREADY_ENTERED']
    .every(function (k) { return typeof STR.en[k] === 'string' && typeof STR.zh[k] === 'string' && typeof STR.hi[k] === 'string'; }));
check('competition prompt comes from the server, never hardcoded in the shell',
  js.indexOf('comp.prompt') >= 0 || js.indexOf('c.prompt') >= 0);
check('account deletion danger-zone row lives inside the settings panel',
  (function () {
    var panelAt = html.indexOf('id="panel-settings"');
    var btnAt = html.indexOf('id="delete-account-btn"');
    var aboutAt = html.indexOf('id="settings-mode"');
    return panelAt >= 0 && btnAt > aboutAt;
  })());
check('account deletion confirm sheet exists (password re-entry)',
  html.indexOf('id="delete-sheet"') >= 0 && html.indexOf('id="delete-password"') >= 0 &&
  html.indexOf('id="delete-confirm"') >= 0 && html.indexOf('id="delete-cancel"') >= 0);
check('account deletion wired to DELETE /v1/me with password confirmation',
  js.indexOf("api('/v1/me', { method: 'DELETE'") >= 0 &&
  js.indexOf('function openDeleteAccount') >= 0 &&
  js.indexOf('function submitDeleteAccount') >= 0);
check('account deletion strings exist in both languages (incl. wrong-password error)',
  !!STR && ['dangerZone', 'deleteAccount', 'deleteAccountNote', 'deleteAccountWarn',
    'deletePasswordLabel', 'deletePasswordPlaceholder', 'deleteConfirm',
    'deletePasswordRequired', 'accountDeleted', 'deleteNeedsAccount',
    'err_PASSWORD_CONFIRMATION_FAILED']
    .every(function (k) { return typeof STR.en[k] === 'string' && typeof STR.zh[k] === 'string'; }));

console.log(failures ? '\nSMOKE TEST FAILED (' + failures + ')' : '\nSMOKE TEST PASSED');
process.exit(failures ? 1 : 0);
