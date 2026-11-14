'use strict';
/* LOOPI — live video controller (LiveKit web SDK).
 *
 * One controller per live-room visit. It owns ONLY the media layer:
 * the server-minted join token (src/livekit.js) is handed in, the SDK
 * is lazy-loaded from CDN the first time a room is actually entered
 * (the shell stays light and offline-capable everywhere else), and
 * the room's video lands on the stage element app.js gives it.
 *
 * Honesty rules, same as the rest of the shell:
 *  - No token (server answered LIVE_NOT_CONFIGURED) -> app.js never
 *    creates a controller; the placeholder stays. Nothing is faked.
 *  - SDK unreachable / WebRTC missing -> state 'unavailable'.
 *  - Camera/mic refused for a host -> state 'denied'; the room and
 *    its chat keep working, the host just is not broadcasting.
 *  - Host leaves / connection drops -> viewers see 'ended' /
 *    'disconnected', never a frozen lie.
 *
 * States reported via deps.onState(state):
 *   connecting | onair (host publishing) | connected (viewer, video
 *   flowing) | waiting (connected, no video yet) | reconnecting |
 *   ended | disconnected | denied | unavailable
 * deps.onViewers(n) reports the participant count when it changes.
 *
 * The module is environment-agnostic: in the browser it registers
 * window.LoopiLiveVideo; under node (tests) it is require()-able and
 * the SDK + elements are injected through deps.
 */
(function (global) {
  /* The SDK ships WITH the app (app/livekit-client.umd.js, v2.15.1) so
   * live video never depends on a CDN being reachable — the packaged
   * WebView loads the shell from file://, where a same-directory file
   * is always available. The CDN copies are only a fallback for a
   * shell served without its bundle. */
  var SDK_URLS = [
    'livekit-client.umd.js',
    'https://cdn.jsdelivr.net/npm/livekit-client@2.15.1/dist/livekit-client.umd.js',
    'https://cdn.unpkg.com/livekit-client@2.15.1/dist/livekit-client.umd.js'
  ];
  var sdkPromise = null;

  function loadSdk() {
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise(function (resolve) {
      if (global.LivekitClient) { resolve(global.LivekitClient); return; }
      if (typeof document === 'undefined' || !document.createElement) {
        resolve(null); return;
      }
      var i = 0;
      (function next() {
        if (global.LivekitClient) { resolve(global.LivekitClient); return; }
        if (i >= SDK_URLS.length) { resolve(null); return; }
        var s = document.createElement('script');
        s.src = SDK_URLS[i++];
        s.async = true;
        s.onload = function () {
          if (global.LivekitClient) resolve(global.LivekitClient); else next();
        };
        s.onerror = function () { next(); };
        (document.head || document.documentElement).appendChild(s);
      })();
    });
    return sdkPromise;
  }

  function createController(deps) {
    deps = deps || {};
    var videoEl = deps.videoEl || null;
    var artEl = deps.artEl || null;
    var audioBox = deps.audioBox || null;
    var hostId = deps.hostId || null;
    var onState = typeof deps.onState === 'function' ? deps.onState : function () {};
    var onViewers = typeof deps.onViewers === 'function' ? deps.onViewers : function () {};
    var LK = deps.LK || null;
    var room = null;
    var closed = false;
    var hasVideo = false;
    var audioEls = [];

    function showStage() {
      if (videoEl) videoEl.classList.remove('hidden');
      if (artEl) artEl.classList.add('hidden');
    }
    function showArt() {
      if (videoEl) videoEl.classList.add('hidden');
      if (artEl) artEl.classList.remove('hidden');
    }
    function viewerCount() {
      if (!room) return 0;
      var remotes = room.remoteParticipants ? room.remoteParticipants.size : 0;
      return remotes + 1;
    }
    function isVideo(pub) {
      if (!pub) return false;
      var cam = LK && LK.Track && LK.Track.Source ? LK.Track.Source.Camera : 'camera';
      return pub.source === cam || pub.source === 'camera' || pub.source === undefined;
    }
    function attachVideo(track) {
      if (!videoEl) return;
      try { track.attach(videoEl); } catch (e) { /* element gone */ }
      hasVideo = true;
      showStage();
    }
    function detachVideo(track) {
      try { track.detach(videoEl); } catch (e) { /* ignore */ }
      hasVideo = false;
      showArt();
    }
    function wireRoom(r) {
      var EV = LK.RoomEvent;
      r.on(EV.TrackSubscribed, function (track, publication) {
        if (closed) return;
        if (track.kind === 'video' || (LK.Track && track.kind === LK.Track.Kind.Video)) {
          if (isVideo(publication)) { attachVideo(track); onState('connected'); }
        } else if (track.kind === 'audio' || (LK.Track && track.kind === LK.Track.Kind.Audio)) {
          try {
            var el = track.attach();
            if (audioBox && el) { audioBox.appendChild(el); audioEls.push(el); }
          } catch (e) { /* audio element is best-effort */ }
        }
      });
      r.on(EV.TrackUnsubscribed, function (track, publication) {
        if (closed) return;
        if (track.kind === 'video' || (LK.Track && track.kind === LK.Track.Kind.Video)) {
          if (isVideo(publication)) { detachVideo(track); onState('waiting'); }
        }
      });
      r.on(EV.ParticipantConnected, function () { onViewers(viewerCount()); });
      r.on(EV.ParticipantDisconnected, function (participant) {
        onViewers(viewerCount());
        if (closed) return;
        if (hostId && participant && participant.identity === hostId) {
          onState('ended');
        }
      });
      r.on(EV.Reconnecting, function () { if (!closed) onState('reconnecting'); });
      r.on(EV.Reconnected, function () {
        if (!closed) onState(hasVideo ? 'connected' : 'waiting');
      });
      r.on(EV.Disconnected, function () { if (!closed) onState('disconnected'); });
    }

    function publishLocal() {
      var lp = room.localParticipant;
      function attachLocal() {
        var cam = LK.Track ? LK.Track.Source.Camera : 'camera';
        var pub = lp.getTrackPublication ? lp.getTrackPublication(cam) : null;
        if (pub && pub.track && videoEl) {
          videoEl.muted = true;
          try { pub.track.attach(videoEl); } catch (e) { /* ignore */ }
          hasVideo = true;
          showStage();
        }
        onState('onair');
      }
      if (typeof lp.enableCameraAndMicrophone === 'function') {
        return lp.enableCameraAndMicrophone().then(attachLocal, function () {
          /* Camera+mic refused or missing: try video alone before
           * declaring the host dark — a muted-camera stream is still
           * a stream, and the note states the denial honestly. */
          if (typeof LK.createLocalTracks !== 'function') {
            onState('denied'); return null;
          }
          return LK.createLocalTracks({ audio: false, video: true }).then(function (tracks) {
            var t = tracks && tracks[0];
            if (!t) { onState('denied'); return null; }
            return lp.publishTrack(t).then(attachLocal, function () { onState('denied'); });
          }, function () { onState('denied'); });
        });
      }
      onState('denied');
      return Promise.resolve();
    }

    function connect(conn) {
      closed = false;
      onState('connecting');
      var ready = LK ? Promise.resolve(LK) : loadSdk();
      return ready.then(function (mod) {
        if (!mod) { onState('unavailable'); return null; }
        LK = mod;
        if (closed) return null;
        room = new LK.Room({ adaptiveStream: true, dynacast: true });
        wireRoom(room);
        return room.connect(conn.url, conn.token).then(function () {
          if (closed) { try { room.disconnect(); } catch (e) {} return null; }
          onViewers(viewerCount());
          if (conn.role === 'host') return publishLocal();
          onState(hasVideo ? 'connected' : 'waiting');
          return room;
        }, function () {
          if (!closed) onState('unavailable');
          return null;
        });
      });
    }

    function disconnect() {
      closed = true;
      audioEls.forEach(function (el) {
        try { if (el.parentNode) el.parentNode.removeChild(el); } catch (e) {}
      });
      audioEls = [];
      if (room) {
        try { room.disconnect(); } catch (e) { /* already gone */ }
        room = null;
      }
      hasVideo = false;
      showArt();
    }

    return {
      connect: connect,
      disconnect: disconnect,
      _room: function () { return room; },
      _hasVideo: function () { return hasVideo; }
    };
  }

  var api = { createController: createController, loadSdk: loadSdk, SDK_URLS: SDK_URLS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.LoopiLiveVideo = api;
})(typeof window !== 'undefined' ? window : globalThis);
