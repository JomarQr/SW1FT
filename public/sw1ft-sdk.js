/*!
 * SW1FT Behavioral Intelligence SDK  v0.1.0
 * https://sw1ft.jevgenij-springis.workers.dev · EU-hosted · GDPR compliant
 *
 * Usage:
 *   <script src="https://sw1ft.jevgenij-springis.workers.dev/sw1ft-sdk.js"></script>
 *   <script>
 *     const tracker = SW1FT.init({
 *       apiKey:   'YOUR_API_KEY',
 *       selector: '#payment-form',   // form or container to watch
 *       endpoint: 'https://sw1ft.jevgenij-springis.workers.dev/api/sessions',
 *       debug:    false,
 *     });
 *   </script>
 */
(function (global) {
  'use strict';

  /* ── Utilities ─────────────────────────────────────────────────────────── */

  function uid() {
    return 'sw1ft_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function avg(arr) {
    return arr.length ? arr.reduce(function (a, b) { return a + b; }, 0) / arr.length : 0;
  }

  function std(arr) {
    if (arr.length < 2) return 0;
    var m = avg(arr);
    return Math.sqrt(avg(arr.map(function (x) { return (x - m) * (x - m); })));
  }

  /* ── Core init ─────────────────────────────────────────────────────────── */

  function init(config) {
    var apiKey    = config.apiKey;
    var selector  = config.selector  || 'form';
    var endpoint  = config.endpoint  || null;
    var debug     = config.debug     || false;
    var onCapture = config.onCapture || null;

    if (!apiKey) {
      console.warn('[SW1FT] apiKey is required');
      return null;
    }

    var container = typeof selector === 'string'
      ? document.querySelector(selector)
      : selector;

    if (!container) {
      console.warn('[SW1FT] element not found for selector:', selector);
      return null;
    }

    /* ── Session state ────────────────────────────────────────────────── */
    var state = {
      session_id:       uid(),
      started_at:       Date.now(),
      // mouse
      prevX: 0, prevY: 0, prevT: 0,
      distances:        [],
      speeds:           [],
      angles:           [],
      clickCount:       0,
      dblClickCount:    0,
      rightClickCount:  0,
      hoverPauses:      [],
      pauseStart:       0,
      // keyboard
      keyDownTs:        {},
      dwellTimes:       [],
      flightTimes:      [],
      lastKeyUpTs:      0,
      totalKeys:        0,
      backspaceCount:   0,
      deleteCount:      0,
      // clipboard
      pasteCount:       0,
      copyCount:        0,
      cutCount:         0,
      // scroll
      scrollEvents:     0,
      maxScrollDepth:   0,
      // attention
      tabSwitches:      0,
      windowBlurs:      0,
      visibilityTs:     Date.now(),
      hiddenMs:         0,
      // timing
      firstInteraction: 0,
      lastInteraction:  Date.now(),
    };

    /* ── Mouse ────────────────────────────────────────────────────────── */
    function onMouseMove(e) {
      var now = Date.now();
      var dx = e.clientX - state.prevX;
      var dy = e.clientY - state.prevY;
      var dt = now - state.prevT;
      var dist = Math.sqrt(dx * dx + dy * dy);

      if (dt > 0 && dist > 2) {
        state.distances.push(dist);
        state.speeds.push(dist / dt);
        state.angles.push(Math.atan2(dy, dx));
      }

      // Hover pause detection
      if (dist < 3 && dt > 300 && state.pauseStart === 0) {
        state.pauseStart = now;
      } else if (dist > 10 && state.pauseStart > 0) {
        state.hoverPauses.push(now - state.pauseStart);
        state.pauseStart = 0;
      }

      state.prevX = e.clientX;
      state.prevY = e.clientY;
      state.prevT = now;
      if (!state.firstInteraction) state.firstInteraction = now;
      state.lastInteraction = now;
    }

    function onClick() {
      state.clickCount++;
      state.lastInteraction = Date.now();
    }
    function onDblClick() { state.dblClickCount++; }
    function onContextMenu() { state.rightClickCount++; }

    /* ── Keyboard ─────────────────────────────────────────────────────── */
    function onKeyDown(e) {
      if (!container.contains(e.target)) return;
      var now = Date.now();
      state.keyDownTs[e.code] = now;
      state.totalKeys++;
      if (e.key === 'Backspace') state.backspaceCount++;
      if (e.key === 'Delete')    state.deleteCount++;
      if (!state.firstInteraction) state.firstInteraction = now;
      state.lastInteraction = now;

      // Flight time = gap between last key-up and this key-down
      if (state.lastKeyUpTs > 0) {
        var flight = now - state.lastKeyUpTs;
        if (flight < 2000) state.flightTimes.push(flight);
      }
    }

    function onKeyUp(e) {
      if (!container.contains(e.target)) return;
      if (state.keyDownTs[e.code]) {
        var dwell = Date.now() - state.keyDownTs[e.code];
        if (dwell > 0 && dwell < 1000) state.dwellTimes.push(dwell);
        delete state.keyDownTs[e.code];
      }
      state.lastKeyUpTs = Date.now();
    }

    /* ── Clipboard ────────────────────────────────────────────────────── */
    function onPaste() { state.pasteCount++; }
    function onCopy()  { state.copyCount++;  }
    function onCut()   { state.cutCount++;   }

    /* ── Scroll ───────────────────────────────────────────────────────── */
    function onScroll(e) {
      state.scrollEvents++;
      var el = e.target === document ? document.documentElement : e.target;
      var depth = el.scrollTop / ((el.scrollHeight - el.clientHeight) || 1);
      if (depth > state.maxScrollDepth) state.maxScrollDepth = depth;
    }

    /* ── Attention ────────────────────────────────────────────────────── */
    function onVisibilityChange() {
      if (document.hidden) {
        state.tabSwitches++;
        state.visibilityTs = Date.now();
      } else {
        state.hiddenMs += Date.now() - state.visibilityTs;
      }
    }
    function onWindowBlur()  { state.windowBlurs++; }

    /* ── Attach listeners ─────────────────────────────────────────────── */
    container.addEventListener('mousemove',    onMouseMove);
    container.addEventListener('click',        onClick);
    container.addEventListener('dblclick',     onDblClick);
    container.addEventListener('contextmenu',  onContextMenu);
    container.addEventListener('paste',        onPaste);
    container.addEventListener('copy',         onCopy);
    container.addEventListener('cut',          onCut);
    document.addEventListener('keydown',       onKeyDown);
    document.addEventListener('keyup',         onKeyUp);
    document.addEventListener('scroll',        onScroll, true);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur',            onWindowBlur);

    if (debug) {
      console.log('[SW1FT] v0.1.0 initialized | session:', state.session_id, '| selector:', selector);
    }

    /* ── Build snapshot ───────────────────────────────────────────────── */
    function buildSnapshot() {
      var now = Date.now();
      var dur = now - state.started_at;
      var totalDist = state.distances.reduce(function (a, b) { return a + b; }, 0);
      var errorRate = state.totalKeys > 0
        ? (state.backspaceCount + state.deleteCount) / state.totalKeys
        : 0;
      var pasteRatio = state.totalKeys > 0
        ? state.pasteCount / state.totalKeys
        : 0;

      // Direction changes (path efficiency proxy)
      var dirChanges = 0;
      for (var i = 1; i < state.angles.length; i++) {
        var delta = Math.abs(state.angles[i] - state.angles[i - 1]);
        if (delta > Math.PI) delta = 2 * Math.PI - delta;
        if (delta > 0.5) dirChanges++;
      }
      var pathEfficiency = state.distances.length > 0
        ? Math.max(0, 1 - dirChanges / state.distances.length)
        : 1;

      // Keyboard rhythm consistency (lower std/avg = more consistent = possibly bot)
      var flightAvg = avg(state.flightTimes);
      var flightStd = std(state.flightTimes);
      var rhythmConsistency = flightAvg > 0 ? Math.max(0, 1 - flightStd / flightAvg) : 0;

      return {
        session_id:   state.session_id,
        api_key:      apiKey,
        captured_at:  new Date().toISOString(),
        page_url:     location.href,
        total_features: 38,
        metrics: {
          mouse: {
            total_distance_px:    +totalDist.toFixed(1),
            avg_speed_px_ms:      +avg(state.speeds).toFixed(4),
            speed_std:            +std(state.speeds).toFixed(4),
            direction_changes:    dirChanges,
            path_efficiency:      +pathEfficiency.toFixed(4),
            click_count:          state.clickCount,
            double_click_count:   state.dblClickCount,
            right_click_count:    state.rightClickCount,
            avg_hover_pause_ms:   +avg(state.hoverPauses).toFixed(1),
          },
          keyboard: {
            total_keys:           state.totalKeys,
            error_rate:           +errorRate.toFixed(4),
            backspace_count:      state.backspaceCount,
            avg_dwell_ms:         +avg(state.dwellTimes).toFixed(1),
            avg_flight_ms:        +flightAvg.toFixed(1),
            flight_std_ms:        +flightStd.toFixed(1),
            rhythm_consistency:   +rhythmConsistency.toFixed(4),
          },
          clipboard: {
            paste_total:          state.pasteCount,
            copy_total:           state.copyCount,
            cut_total:            state.cutCount,
            paste_vs_type_ratio:  +pasteRatio.toFixed(4),
          },
          attention: {
            tab_switch_count:     state.tabSwitches,
            window_blur_count:    state.windowBlurs,
            hidden_time_ms:       state.hiddenMs,
          },
          scroll: {
            event_count:          state.scrollEvents,
            max_depth:            +state.maxScrollDepth.toFixed(4),
          },
          session: {
            total_duration_ms:    dur,
            time_to_first_input_ms: state.firstInteraction
              ? state.firstInteraction - state.started_at : 0,
            idle_ratio: dur > 0
              ? +((dur - (now - state.lastInteraction)) / dur).toFixed(4) : 0,
          },
          device: {
            screen_w:   screen.width,
            screen_h:   screen.height,
            viewport_w: window.innerWidth,
            viewport_h: window.innerHeight,
            pixel_ratio: window.devicePixelRatio || 1,
            platform:   navigator.platform || 'unknown',
            touch:      'ontouchstart' in window,
          },
        },
      };
    }

    /* ── Send snapshot ────────────────────────────────────────────────── */
    function send(snapshot) {
      if (!endpoint) return;
      try {
        fetch(endpoint, {
          method:    'POST',
          headers:   { 'Content-Type': 'application/json', 'X-SW1FT-Key': apiKey },
          body:      JSON.stringify(snapshot),
          keepalive: true,
        })
          .then(function (r) {
            if (debug) console.log('[SW1FT] Sent | status:', r.status);
          })
          .catch(function (err) {
            if (debug) console.warn('[SW1FT] Send failed:', err.message);
          });
      } catch (e) {
        if (debug) console.warn('[SW1FT] fetch unavailable');
      }
    }

    /* ── Public capture method ────────────────────────────────────────── */
    function capture() {
      var snapshot = buildSnapshot();
      if (debug) console.log('[SW1FT] Snapshot:', JSON.stringify(snapshot, null, 2));
      if (onCapture) onCapture(snapshot);
      send(snapshot);
      return snapshot;
    }

    /* ── Auto-capture on form submit ──────────────────────────────────── */
    var form = container.tagName === 'FORM' ? container : container.querySelector('form');
    if (form) {
      form.addEventListener('submit', function () {
        capture();
      });
      if (debug) console.log('[SW1FT] Auto-capture bound to form submit');
    }

    /* ── Destroy ──────────────────────────────────────────────────────── */
    function destroy() {
      container.removeEventListener('mousemove',    onMouseMove);
      container.removeEventListener('click',        onClick);
      container.removeEventListener('dblclick',     onDblClick);
      container.removeEventListener('contextmenu',  onContextMenu);
      container.removeEventListener('paste',        onPaste);
      container.removeEventListener('copy',         onCopy);
      container.removeEventListener('cut',          onCut);
      document.removeEventListener('keydown',       onKeyDown);
      document.removeEventListener('keyup',         onKeyUp);
      document.removeEventListener('scroll',        onScroll, true);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur',            onWindowBlur);
      if (debug) console.log('[SW1FT] Destroyed | session:', state.session_id);
    }

    return { capture: capture, destroy: destroy, sessionId: state.session_id };
  }

  /* ── Export ─────────────────────────────────────────────────────────────── */
  global.SW1FT = { init: init, version: '0.1.0' };

}(typeof window !== 'undefined' ? window : this));
