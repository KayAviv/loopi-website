'use strict';
/* LOOPI — icon system (2030 pass).
 *
 * Two tiers, one language:
 *  - CHROME icons (buttons, menu, rail, chips): clean stroke icons on
 *    a 24-grid, drawn the way the benchmark's frosted cards draw
 *    theirs — thin lines, rounded caps, lots of air. They inherit
 *    currentColor, so glass/lime/coral states come from CSS.
 *  - OBJECT icons (gifts, games, coins): glossy 3D renders shipped as
 *    transparent PNGs (gifts3d/, games3d/) — soft inflated forms,
 *    studio light, one consistent set. No emoji anywhere in UI art.
 *
 * Loaded before app.js; everything hangs off window.LOOPI_ICONS.
 */
(function (global) {
  var PATHS = {
    gift: '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v7a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-7"/><path d="M12 8v12.5"/><path d="M12 8c-4.2 0-5.5-1.6-5.5-3.2C6.5 3.1 7.8 2 9.3 2 11.4 2 12 4.6 12 8zm0 0c4.2 0 5.5-1.6 5.5-3.2C17.5 3.1 16.2 2 14.7 2 12.6 2 12 4.6 12 8z"/>',
    eye: '<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    broadcast: '<circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><path d="M8.2 15.8a5.4 5.4 0 0 1 0-7.6M15.8 8.2a5.4 5.4 0 0 1 0 7.6M5.6 18.4a9.4 9.4 0 0 1 0-12.8M18.4 5.6a9.4 9.4 0 0 1 0 12.8"/>',
    heart: '<path d="M12 20.3C6.9 16.4 3.4 13.2 3.4 9.7 3.4 7.1 5.3 5.1 7.8 5.1c1.7 0 3.2.9 4.2 2.4.9-1.5 2.5-2.4 4.2-2.4 2.5 0 4.4 2 4.4 4.6 0 3.5-3.5 6.7-8.6 10.6z"/>',
    comment: '<path d="M20.5 11.8a8 8 0 0 1-8.4 7.7c-1.2 0-2.4-.2-3.4-.7L3.5 20.5l1.7-5.2a8 8 0 1 1 15.3-3.5z"/>',
    share: '<path d="M12 15V3.5M7.5 6 12 2l4.5 4"/><path d="M5 12.5V19a1.8 1.8 0 0 0 1.8 1.8h10.4A1.8 1.8 0 0 0 19 19v-6.5"/>',
    repeat: '<path d="M17 2.5 20.5 6 17 9.5"/><path d="M3.5 11V9.8a3.8 3.8 0 0 1 3.8-3.8h13.2"/><path d="M7 21.5 3.5 18 7 14.5"/><path d="M20.5 13v1.2a3.8 3.8 0 0 1-3.8 3.8H3.5"/>',
    pin: '<path d="M12 21.2S5.2 15.6 5.2 10a6.8 6.8 0 0 1 13.6 0c0 5.6-6.8 11.2-6.8 11.2z"/><circle cx="12" cy="10" r="2.6"/>',
    lock: '<rect x="5" y="10.8" width="14" height="9.2" rx="2"/><path d="M8 10.8V8a4 4 0 0 1 8 0v2.8"/><circle cx="12" cy="15.4" r="1.3" fill="currentColor" stroke="none"/>',
    sliders: '<path d="M4 6.5h9M19 6.5h1.5M4 12h3.5M13.5 12H20M4 17.5h11.5M19.5 17.5H20"/><circle cx="16" cy="6.5" r="2.2"/><circle cx="10.5" cy="12" r="2.2"/><circle cx="17" cy="17.5" r="2.2"/>',
    bell: '<path d="M17.8 9.2a5.8 5.8 0 1 0-11.6 0c0 5-2.3 6.6-2.3 6.6h16.2s-2.3-1.6-2.3-6.6"/><path d="M10.2 19.5a2 2 0 0 0 3.6 0"/>',
    game: '<path d="M6.8 7.5h10.4a5.3 5.3 0 0 1 5.2 5.6c0 2.9-2.3 5.2-5.1 5.2-1.7 0-3.2-.8-4.1-2.1H10.8c-.9 1.3-2.4 2.1-4.1 2.1-2.8 0-5.1-2.3-5.1-5.2a5.3 5.3 0 0 1 5.2-5.6z"/><path d="M7.2 10.8v4M5.2 12.8h4"/><circle cx="16.4" cy="11.2" r=".4" fill="currentColor"/><circle cx="18.6" cy="14" r=".4" fill="currentColor"/>',
    video: '<rect x="3" y="6.5" width="18" height="12.5" rx="2.5"/><path d="M3 10.5h18M7.5 6.5l2 4M13 6.5l2 4"/>',
    trophy: '<path d="M7.5 4h9v4.8a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 5.5H4.2a3.1 3.1 0 0 0 3.3 3.8M16.5 5.5h3.3a3.1 3.1 0 0 1-3.3 3.8"/><path d="M12 13.3V17M8.5 20.5h7M10 17h4l.6 3.5H9.4z"/>',
    target: '<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="4.9"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
    check: '<path d="M4.5 12.6 9.8 18 19.5 6.5"/>',
    flame: '<path d="M12 3.2c.9 2.9-1.9 4.3-1.9 6.8a4.4 4.4 0 0 0 8.8 0c0-1.4-.5-2.4-1.4-3.7-.9 1-1.4 1.9-1.4 3.2C14.6 7.6 13.9 5 13.9 3.2c2.9 2 4.9 4.9 4.9 8.2a6.8 6.8 0 1 1-13.6 0C5.2 7.2 9.2 5.7 12 3.2z"/>',
    upload: '<path d="M12 15.5v-11M7.5 8 12 3.8 16.5 8"/><path d="M4 19.5h16"/>',
    trend: '<path d="M3.5 16.8 9 11.3l3.8 3.8 7.2-7.6"/><path d="M15.3 7.4h4.9v4.9"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20.5 20.5-4.8-4.8"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6"/>',
    person: '<circle cx="12" cy="8.2" r="3.7"/><path d="M5 20.2a7.2 7.2 0 0 1 14 0"/>',
    play: '<path d="M8.5 5.4v13.2c0 .9 1 1.5 1.8 1L20 13a1.2 1.2 0 0 0 0-2L10.3 4.5c-.8-.5-1.8 0-1.8.9z" fill="currentColor" stroke="none"/>',
    star: '<path d="M12 3.6l2.5 5.7 6.2.6-4.6 4.2 1.3 6.1L12 17l-5.4 3.2 1.3-6.1L3.3 9.9l6.2-.6z" fill="currentColor" stroke="none"/>',
    spark: '<path d="M12 3.5 13.9 10 20.5 12 13.9 14 12 20.5 10.1 14 3.5 12 10.1 10z" fill="currentColor" stroke="none"/>',
    megaphone: '<path d="M4 10.5v3a1.5 1.5 0 0 0 1.5 1.5H8l8.5 4.5v-15L8 9H5.5A1.5 1.5 0 0 0 4 10.5z"/><path d="M8 15v3.2a1.8 1.8 0 0 0 3.6 0"/>',
    music: '<path d="M9.5 18.4V6.2L19.5 4.2v11.6"/><circle cx="6.8" cy="18.4" r="2.7"/><circle cx="16.8" cy="15.8" r="2.7"/>',
    mic: '<rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5.8 11.8a6.2 6.2 0 0 0 12.4 0M12 18v3.2"/>',
    pause: '<rect x="6.5" y="5" width="3.6" height="14" rx="1.1" fill="currentColor" stroke="none"/><rect x="13.9" y="5" width="3.6" height="14" rx="1.1" fill="currentColor" stroke="none"/>'
  };
  function svg(name, cls) {
    return '<svg class="' + (cls || 'ic') + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true">' + (PATHS[name] || '') + '</svg>';
  }
  function giftImg(id, cls) {
    return '<img class="' + (cls || 'gift-png') + '" src="gifts3d/' + id +
      '.png" alt="" loading="lazy" draggable="false">';
  }
  function gameImg(id, cls) {
    return '<img class="' + (cls || 'game-png') + '" src="games3d/' + id +
      '.png" alt="" loading="lazy" draggable="false">';
  }
  var BADGE_ICONS = {
    first_upload: 'upload', streak_7: 'flame', likes_100: 'heart',
    level_2: 'trend', level_3: 'trend', level_4: 'trend', level_5: 'star'
  };
  function badge(id, cls) { return svg(BADGE_ICONS[id] || 'spark', cls); }
  global.LOOPI_ICONS = {
    svg: svg, giftImg: giftImg, gameImg: gameImg, badge: badge,
    GIFT_IDS: ['rose', 'heart', 'star', 'crown', 'rocket', 'diamond', 'castle', 'dragon'],
    coinImg: function (cls) { return gameImg('coin', cls || 'coin-png'); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
