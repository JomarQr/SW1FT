/*!
 * SW1FT Behavioral Intelligence SDK  v0.2.0
 * https://sw1ft.jevgenij-springis.workers.dev
 *
 * Usage:
 *   <script src="https://sw1ft.jevgenij-springis.workers.dev/sw1ft-sdk.js"></script>
 *   <script>
 *     const tracker = SW1FT.init({
 *       apiKey:   'sw1ft_live_YOUR_KEY',
 *       selector: '#payment-form',
 *       endpoint: 'https://sw1ft.jevgenij-springis.workers.dev/api/sessions',
 *       debug:    false,
 *     });
 *   </script>
 */
(function (global) {
  'use strict';

  /* ── Math helpers ──────────────────────────────────────────────────────────── */
  function avg(a) { return a.length ? a.reduce(function(s,v){return s+v;},0)/a.length : 0; }
  function sd(a) {
    if (a.length < 2) return 0;
    var m = avg(a);
    return Math.sqrt(a.reduce(function(s,v){return s+(v-m)*(v-m);},0)/a.length);
  }
  function dist2(x1,y1,x2,y2) { return Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1)); }
  function uid() { return 'sw_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }

  /* ── Device info ───────────────────────────────────────────────────────────── */
  function getDevice() {
    var nav = navigator;
    var conn = nav.connection || nav.mozConnection || nav.webkitConnection || {};
    var now = new Date();
    return {
      screen_width:       screen.width,
      screen_height:      screen.height,
      viewport_width:     window.innerWidth,
      viewport_height:    window.innerHeight,
      device_pixel_ratio: window.devicePixelRatio || 1,
      color_depth:        screen.colorDepth || 24,
      platform:           nav.platform || 'unknown',
      vendor:             nav.vendor || '',
      touch_points_max:   nav.maxTouchPoints || 0,
      user_agent:         nav.userAgent.slice(0, 120),
      language:           nav.language || '',
      languages:          (nav.languages || [nav.language]).slice(0,3).join(', '),
      timezone:           (Intl && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'unknown',
      timezone_offset:    now.getTimezoneOffset(),
      cpu_cores:          nav.hardwareConcurrency || 0,
      memory_gb:          nav.deviceMemory || 0,
      local_hour:         now.getHours(),
      local_day_of_week:  now.getDay(),
      connection_type:    conn.effectiveType || conn.type || 'unknown',
      connection_speed:   conn.downlink || 0,
    };
  }

  /* ── Main init ─────────────────────────────────────────────────────────────── */
  function init(config) {
    var apiKey    = config.apiKey;
    var selector  = config.selector  || 'form';
    var endpoint  = config.endpoint  || null;
    var debug     = config.debug     || false;
    var onCapture = config.onCapture || null;

    if (!apiKey) { console.warn('[SW1FT] apiKey is required'); return null; }

    var container = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!container) { console.warn('[SW1FT] element not found:', selector); return null; }

    /* ── State ──────────────────────────────────────────────────────────────── */
    var startTs = Date.now();

    // Mouse
    var moveCount = 0, clickCount = 0, dblClickCount = 0, rightClickCount = 0;
    var totalDistPx = 0, overshootCount = 0, correctionCount = 0;
    var lastPos = null, lastVelocity = 0;
    var velocitySamples = [], accelSamples = [], angleSamples = [], curvSamples = [];
    var idleDurations = [], tremorSamples = [], idleBuf = [];
    var idleStart = null;
    var segStart = null, segActual = 0, pathEfficiencies = [];
    var lastClickPos = null;

    // Keyboard
    var totalKeys = 0, backspaceCount = 0, modifierCount = 0;
    var burstCount = 0, longPauseCount = 0;
    var keyDownTs = {}, dwellSamples = [], flightSamples = [], lastKeyUpTs = 0;
    var typingSpeedSamples = [], twStart = null, twKeys = 0;

    // Clipboard
    var pasteCount = 0, copyCount = 0, cutCount = 0, pasteFields = [];

    // Attention
    var tabSwitchCount = 0, blurEvents = 0, focusEvents = 0, visChanges = 0, resizeCount = 0;
    var awayDurations = [], longestAbsence = 0, blurTs = null;

    // Session / scroll
    var firstInteractionTs = null;
    var fieldFocusTs = {}, fieldDurations = {}, fieldRevisions = {}, fieldOrder = [];
    var tabNavCount = 0, clickNavCount = 0;
    var scrollY = 0, scrollDir = 0, scrollDirChanges = 0, maxScrollPct = 0;
    var scrollSpeedSamples = [], lastScrollTs = 0;
    var submitHoverTs = null, hesitationMs = 0;
    var rawEventCount = 0;

    function markFirst() { if (firstInteractionTs === null) firstInteractionTs = Date.now() - startTs; }
    function stamp() { rawEventCount++; }

    /* ── Mouse ──────────────────────────────────────────────────────────────── */
    function onMouseMove(e) {
      stamp(); markFirst();
      var ts = Date.now();
      if (lastPos && ts - lastPos.ts < 200) {
        var d = dist2(lastPos.x, lastPos.y, e.clientX, e.clientY);
        totalDistPx += d;
        segActual += d;
        var dt = ts - lastPos.ts;
        if (dt > 0) {
          var v = d / dt;
          accelSamples.push(Math.abs(v - lastVelocity) / dt);
          lastVelocity = v;
          velocitySamples.push(v);
          var angle = Math.atan2(e.clientY - lastPos.y, e.clientX - lastPos.x);
          if (angleSamples.length > 0) {
            var dA = Math.abs(angle - angleSamples[angleSamples.length - 1]);
            curvSamples.push(Math.min(dA, Math.PI * 2 - dA));
          }
          angleSamples.push(angle);
          if (v < 0.4) {
            if (idleStart === null) idleStart = ts;
            idleBuf.push({ x: e.clientX, y: e.clientY });
          } else if (idleStart !== null) {
            var dur = ts - idleStart;
            if (dur > 200 && idleBuf.length > 5) {
              idleDurations.push(dur);
              var xs = idleBuf.map(function(p){return p.x;}), ys = idleBuf.map(function(p){return p.y;});
              tremorSamples.push((sd(xs) + sd(ys)) / 2);
            }
            idleStart = null; idleBuf = [];
          }
        }
      }
      lastPos = { x: e.clientX, y: e.clientY, ts: ts };
      moveCount++;
    }

    function onMouseDown(e) {
      stamp(); markFirst();
      if (e.button === 0) {
        if (segStart) {
          var direct = dist2(segStart.x, segStart.y, e.clientX, e.clientY);
          if (segActual > 0 && direct > 10) pathEfficiencies.push(Math.min(1, direct / segActual));
          segActual = 0;
        }
        if (lastClickPos) {
          var bd = dist2(lastClickPos.x, lastClickPos.y, e.clientX, e.clientY);
          if (bd < 30 && totalDistPx > 50) correctionCount++;
        }
        segStart = { x: e.clientX, y: e.clientY };
        lastClickPos = { x: e.clientX, y: e.clientY };
      }
    }

    function onClick()       { stamp(); clickCount++;  clickNavCount++; }
    function onDblClick()    { stamp(); dblClickCount++; }
    function onContextMenu() { stamp(); rightClickCount++; }

    /* ── Keyboard ───────────────────────────────────────────────────────────── */
    var MODS = { ShiftLeft:1, ShiftRight:1, ControlLeft:1, ControlRight:1, AltLeft:1, AltRight:1, MetaLeft:1, MetaRight:1 };

    function onKeyDown(e) {
      if (!container.contains(e.target)) return;
      stamp(); markFirst();
      var ts = Date.now();
      keyDownTs[e.code] = ts;
      if (lastKeyUpTs > 0) {
        var flight = ts - lastKeyUpTs;
        flightSamples.push(flight);
        if (flight > 600) longPauseCount++;
        if (flight < 80) burstCount++;
      }
      if (MODS[e.code]) modifierCount++;
      if (e.code === 'Tab') tabNavCount++;
      if (e.code === 'Backspace') backspaceCount++;
      totalKeys++;
      if (twStart === null) { twStart = ts; twKeys = 0; }
      twKeys++;
      if (ts - twStart >= 3000) {
        typingSpeedSamples.push(twKeys / 3);
        twStart = ts; twKeys = 0;
      }
    }

    function onKeyUp(e) {
      if (!container.contains(e.target)) return;
      stamp();
      var ts = Date.now();
      if (keyDownTs[e.code] !== undefined) {
        dwellSamples.push(ts - keyDownTs[e.code]);
        delete keyDownTs[e.code];
      }
      lastKeyUpTs = ts;
    }

    /* ── Clipboard ──────────────────────────────────────────────────────────── */
    function onPaste(e) {
      stamp(); pasteCount++;
      var t = e.target;
      var field = (t && (t.getAttribute('data-field') || t.getAttribute('name') || t.getAttribute('id'))) || 'unknown';
      pasteFields.push(field);
    }
    function onCopy() { stamp(); copyCount++; }
    function onCut()  { stamp(); cutCount++;  }

    /* ── Scroll ─────────────────────────────────────────────────────────────── */
    function onScroll() {
      stamp();
      var ts = Date.now();
      var el = container;
      var totalH = Math.max(1, el.scrollHeight - el.clientHeight);
      var pct = (el.scrollTop / totalH) * 100;
      if (pct > maxScrollPct) maxScrollPct = pct;
      var dy = el.scrollTop - scrollY;
      if (dy !== 0) {
        var dir = dy > 0 ? 1 : -1;
        if (scrollDir !== 0 && dir !== scrollDir) scrollDirChanges++;
        scrollDir = dir;
        if (lastScrollTs > 0 && ts - lastScrollTs > 0)
          scrollSpeedSamples.push(Math.abs(dy) / (ts - lastScrollTs));
      }
      scrollY = el.scrollTop;
      lastScrollTs = ts;
    }

    /* ── Attention ──────────────────────────────────────────────────────────── */
    function onVisChange() {
      visChanges++;
      if (document.hidden) {
        tabSwitchCount++;
        blurTs = Date.now();
      } else if (blurTs !== null) {
        var away = Date.now() - blurTs;
        awayDurations.push(away);
        if (away > longestAbsence) longestAbsence = away;
        blurTs = null;
      }
    }
    function onWinBlur()  {
      blurEvents++;
      if (blurTs === null) blurTs = Date.now();
    }
    function onWinFocus() {
      focusEvents++;
      if (blurTs !== null) {
        var away = Date.now() - blurTs;
        awayDurations.push(away);
        if (away > longestAbsence) longestAbsence = away;
        blurTs = null;
      }
    }
    function onResize() { resizeCount++; }

    /* ── Field tracking ─────────────────────────────────────────────────────── */
    function onFocusIn(e) {
      var t = e.target;
      if (!t || !t.tagName || !(/INPUT|TEXTAREA|SELECT/.test(t.tagName))) return;
      var field = t.getAttribute('data-field') || t.getAttribute('name') || t.getAttribute('id') || t.tagName.toLowerCase();
      fieldFocusTs[field] = Date.now();
      if (fieldOrder.indexOf(field) === -1) fieldOrder.push(field);
      clickNavCount++;
    }
    function onFocusOut(e) {
      var t = e.target;
      if (!t || !t.tagName || !(/INPUT|TEXTAREA|SELECT/.test(t.tagName))) return;
      var field = t.getAttribute('data-field') || t.getAttribute('name') || t.getAttribute('id') || t.tagName.toLowerCase();
      if (fieldFocusTs[field] !== undefined) {
        fieldDurations[field] = (fieldDurations[field] || 0) + (Date.now() - fieldFocusTs[field]);
        delete fieldFocusTs[field];
      }
    }
    function onInput(e) {
      var t = e.target;
      if (!t) return;
      var field = t.getAttribute('data-field') || t.getAttribute('name') || t.getAttribute('id') || t.tagName.toLowerCase();
      fieldRevisions[field] = (fieldRevisions[field] || 0) + 1;
    }

    /* ── Submit button hover (hesitation detection) ─────────────────────────── */
    function wireSubmitHover() {
      var btns = container.querySelectorAll('button[type="submit"], input[type="submit"], button:not([type])');
      for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener('mouseenter', function() { submitHoverTs = Date.now(); });
        btns[i].addEventListener('mouseleave', function() {
          if (submitHoverTs !== null) { hesitationMs += Date.now() - submitHoverTs; submitHoverTs = null; }
        });
      }
    }

    /* ── Attach ─────────────────────────────────────────────────────────────── */
    container.addEventListener('mousemove',    onMouseMove,  { passive: true });
    container.addEventListener('mousedown',    onMouseDown,  { passive: true });
    container.addEventListener('click',        onClick,      { passive: true });
    container.addEventListener('dblclick',     onDblClick,   { passive: true });
    container.addEventListener('contextmenu',  onContextMenu);
    container.addEventListener('paste',        onPaste);
    container.addEventListener('copy',         onCopy);
    container.addEventListener('cut',          onCut);
    container.addEventListener('scroll',       onScroll,     { passive: true });
    container.addEventListener('focusin',      onFocusIn,    { passive: true });
    container.addEventListener('focusout',     onFocusOut,   { passive: true });
    container.addEventListener('input',        onInput,      { passive: true });
    document.addEventListener('keydown',       onKeyDown);
    document.addEventListener('keyup',         onKeyUp);
    document.addEventListener('visibilitychange', onVisChange);
    window.addEventListener('blur',            onWinBlur);
    window.addEventListener('focus',           onWinFocus);
    window.addEventListener('resize',          onResize);

    wireSubmitHover();

    if (debug) console.log('[SW1FT] v0.2.0 init | session:', uid(), '| selector:', selector);

    /* ── Snapshot builder ───────────────────────────────────────────────────── */
    function buildSnapshot() {
      var now = Date.now();
      var elapsed = now - startTs;

      // Finalise any open absence
      if (blurTs !== null) {
        var openAway = now - blurTs;
        awayDurations.push(openAway);
        if (openAway > longestAbsence) longestAbsence = openAway;
      }

      var totalAway = awayDurations.reduce(function(s,v){return s+v;},0);
      var vMax = velocitySamples.length ? Math.max.apply(null, velocitySamples) : 0;
      var flightAvg = avg(flightSamples), flightStd = sd(flightSamples);
      var rhythmConsistency = flightAvg > 0 ? Math.max(0, 1 - flightStd / flightAvg) : 0;
      var peakSpeed = typingSpeedSamples.length ? Math.max.apply(null, typingSpeedSamples) : 0;
      var typingSpeedCps = elapsed > 1000 ? totalKeys / (elapsed / 1000) : 0;
      var pasteVsType = totalKeys > 0 ? pasteCount / totalKeys : 0;
      var navStyle = tabNavCount > clickNavCount ? 'tab' : clickNavCount > 0 ? 'click' : 'unknown';

      return {
        session_id:     uid(),
        captured_at:    new Date().toISOString(),
        api_key:        apiKey,
        page_url:       location.href,
        channel:        'web',
        total_features: 65,
        metrics: {
          device: getDevice(),
          mouse: {
            move_count:          moveCount,
            click_count:         clickCount,
            dbl_click_count:     dblClickCount,
            right_click_count:   rightClickCount,
            velocity_mean:       +avg(velocitySamples).toFixed(4),
            velocity_max:        +vMax.toFixed(4),
            velocity_std:        +sd(velocitySamples).toFixed(4),
            acceleration_mean:   +avg(accelSamples).toFixed(6),
            idle_period_count:   idleDurations.length,
            longest_idle_ms:     idleDurations.length ? Math.max.apply(null, idleDurations) : 0,
            total_distance_px:   Math.round(totalDistPx),
            path_efficiency:     pathEfficiencies.length ? +avg(pathEfficiencies).toFixed(4) : 1,
            tremor_index:        +avg(tremorSamples).toFixed(4),
            direction_angle_std: +sd(angleSamples).toFixed(4),
            curvature_mean:      +avg(curvSamples).toFixed(6),
            hover_duration_mean: 0,
            last_x:              lastPos ? lastPos.x : 0,
            last_y:              lastPos ? lastPos.y : 0,
            overshoot_count:     overshootCount,
            correction_count:    correctionCount,
          },
          keyboard: {
            total_keys:           totalKeys,
            backspace_count:      backspaceCount,
            typing_speed_cps:     +typingSpeedCps.toFixed(3),
            typing_speed_peak:    +peakSpeed.toFixed(3),
            dwell_time_mean:      +avg(dwellSamples).toFixed(3),
            dwell_time_std:       +sd(dwellSamples).toFixed(3),
            flight_time_mean:     +flightAvg.toFixed(3),
            flight_time_std:      +flightStd.toFixed(3),
            error_rate:           totalKeys > 0 ? +(backspaceCount / totalKeys).toFixed(4) : 0,
            rhythm_consistency:   +rhythmConsistency.toFixed(4),
            burst_count:          burstCount,
            modifier_usage_ratio: totalKeys > 0 ? +(modifierCount / totalKeys).toFixed(4) : 0,
            long_pause_count:     longPauseCount,
          },
          clipboard: {
            paste_total:  pasteCount,
            copy_total:   copyCount,
            cut_total:    cutCount,
            paste_fields: pasteFields.slice(),
          },
          attention: {
            tab_switch_count:    tabSwitchCount,
            total_time_away_ms:  totalAway,
            longest_absence_ms:  longestAbsence,
            window_resize_count: resizeCount,
            blur_events:         blurEvents,
            focus_events:        focusEvents,
            visibility_changes:  visChanges,
          },
          session: {
            first_interaction_ms:       firstInteractionTs,
            field_order:                fieldOrder.slice(),
            field_durations:            Object.assign({}, fieldDurations),
            field_revisions:            Object.assign({}, fieldRevisions),
            paste_vs_type_ratio:        +pasteVsType.toFixed(4),
            scroll_depth_pct:           +maxScrollPct.toFixed(2),
            scroll_direction_changes:   scrollDirChanges,
            scroll_speed_mean:          +avg(scrollSpeedSamples).toFixed(4),
            total_duration_ms:          elapsed,
            hesitation_before_submit_ms: hesitationMs,
            form_navigation_style:       navStyle,
          },
          events_per_second: elapsed > 1000 ? +(rawEventCount / (elapsed / 1000)).toFixed(2) : 0,
          raw_event_count:   rawEventCount,
        },
      };
    }

    /* ── Send ───────────────────────────────────────────────────────────────── */
    function send(snapshot) {
      if (!endpoint) return;
      try {
        fetch(endpoint, {
          method:    'POST',
          headers:   { 'Content-Type': 'application/json', 'X-SW1FT-Key': apiKey },
          body:      JSON.stringify(snapshot),
          keepalive: true,
        }).then(function(r) {
          if (debug) console.log('[SW1FT] sent | status:', r.status);
        }).catch(function(err) {
          if (debug) console.warn('[SW1FT] send error:', err.message);
        });
      } catch(e) {
        if (debug) console.warn('[SW1FT] fetch unavailable');
      }
    }

    /* ── Public capture ─────────────────────────────────────────────────────── */
    function capture() {
      var snapshot = buildSnapshot();
      if (debug) console.log('[SW1FT] snapshot:', JSON.stringify(snapshot, null, 2));
      if (onCapture) onCapture(snapshot);
      send(snapshot);
      return snapshot;
    }

    /* ── Auto-capture on form submit ────────────────────────────────────────── */
    var form = container.tagName === 'FORM' ? container : container.querySelector('form');
    if (form) {
      form.addEventListener('submit', function() { capture(); });
      if (debug) console.log('[SW1FT] auto-capture bound to form submit');
    }

    /* ── Destroy ────────────────────────────────────────────────────────────── */
    function destroy() {
      container.removeEventListener('mousemove',   onMouseMove);
      container.removeEventListener('mousedown',   onMouseDown);
      container.removeEventListener('click',       onClick);
      container.removeEventListener('dblclick',    onDblClick);
      container.removeEventListener('contextmenu', onContextMenu);
      container.removeEventListener('paste',       onPaste);
      container.removeEventListener('copy',        onCopy);
      container.removeEventListener('cut',         onCut);
      container.removeEventListener('scroll',      onScroll);
      container.removeEventListener('focusin',     onFocusIn);
      container.removeEventListener('focusout',    onFocusOut);
      container.removeEventListener('input',       onInput);
      document.removeEventListener('keydown',      onKeyDown);
      document.removeEventListener('keyup',        onKeyUp);
      document.removeEventListener('visibilitychange', onVisChange);
      window.removeEventListener('blur',           onWinBlur);
      window.removeEventListener('focus',          onWinFocus);
      window.removeEventListener('resize',         onResize);
    }

    return { capture: capture, destroy: destroy };
  }

  /* ── Export ─────────────────────────────────────────────────────────────────── */
  global.SW1FT = { init: init, version: '0.2.0' };

}(typeof window !== 'undefined' ? window : this));
