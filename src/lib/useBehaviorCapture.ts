import { useRef, useState, useEffect, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DeviceInfo {
  screen_width: number; screen_height: number;
  viewport_width: number; viewport_height: number;
  device_pixel_ratio: number; color_depth: number;
  platform: string; vendor: string; touch_points_max: number;
  user_agent: string; language: string; languages: string;
  timezone: string; timezone_offset: number;
  cpu_cores: number; memory_gb: number;
  local_hour: number; local_day_of_week: number;
  connection_type: string; connection_speed: number;
}

export interface MouseMetrics {
  move_count: number; click_count: number;
  dbl_click_count: number; right_click_count: number;
  velocity_mean: number; velocity_max: number; velocity_std: number;
  acceleration_mean: number;
  idle_period_count: number; longest_idle_ms: number;
  total_distance_px: number; path_efficiency: number;
  tremor_index: number; direction_angle_std: number;
  curvature_mean: number; hover_duration_mean: number;
  last_x: number; last_y: number;
  overshoot_count: number; correction_count: number;
}

export interface KeyboardMetrics {
  total_keys: number; backspace_count: number;
  typing_speed_cps: number; typing_speed_peak: number;
  dwell_time_mean: number; dwell_time_std: number;
  flight_time_mean: number; flight_time_std: number;
  error_rate: number; rhythm_consistency: number;
  burst_count: number; modifier_usage_ratio: number;
  long_pause_count: number;
}

export interface ClipboardMetrics {
  paste_total: number; copy_total: number; cut_total: number;
  paste_fields: string[];
}

export interface AttentionMetrics {
  tab_switch_count: number; total_time_away_ms: number;
  longest_absence_ms: number; window_resize_count: number;
  blur_events: number; focus_events: number; visibility_changes: number;
}

export interface SessionMetrics {
  first_interaction_ms: number | null;
  field_order: string[];
  field_durations: Record<string, number>;
  field_revisions: Record<string, number>;
  paste_vs_type_ratio: number;
  scroll_depth_pct: number; scroll_direction_changes: number;
  scroll_speed_mean: number; total_duration_ms: number;
  hesitation_before_submit_ms: number;
  form_navigation_style: string;
}

export interface LiveMetrics {
  device: DeviceInfo;
  mouse: MouseMetrics;
  keyboard: KeyboardMetrics;
  clipboard: ClipboardMetrics;
  attention: AttentionMetrics;
  session: SessionMetrics;
  events_per_second: number;
  raw_event_count: number;
}

export interface BehaviorSnapshot {
  session_id: string;
  captured_at: string;
  analyst: string;
  metrics: LiveMetrics;
  total_features: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
function sd(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = avg(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}
function d2(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function getDeviceInfo(): DeviceInfo {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { type?: string; downlink?: number } };
  const conn = nav.connection;
  const now = new Date();
  return {
    screen_width: screen.width, screen_height: screen.height,
    viewport_width: window.innerWidth, viewport_height: window.innerHeight,
    device_pixel_ratio: window.devicePixelRatio, color_depth: screen.colorDepth,
    platform: navigator.platform, vendor: navigator.vendor || '',
    touch_points_max: navigator.maxTouchPoints,
    user_agent: navigator.userAgent.slice(0, 90),
    language: navigator.language,
    languages: Array.from(navigator.languages).slice(0, 3).join(', '),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezone_offset: now.getTimezoneOffset(),
    cpu_cores: navigator.hardwareConcurrency, memory_gb: nav.deviceMemory ?? 0,
    local_hour: now.getHours(), local_day_of_week: now.getDay(),
    connection_type: conn?.type ?? 'unknown', connection_speed: conn?.downlink ?? 0,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBehaviorCapture() {
  const startTs = useRef(Date.now());

  // Mouse
  const moveCount = useRef(0);
  const clickCount = useRef(0);
  const dblClickCount = useRef(0);
  const rightClickCount = useRef(0);
  const totalDistPx = useRef(0);
  const overshootCount = useRef(0);
  const correctionCount = useRef(0);
  const lastPos = useRef<{ x: number; y: number; ts: number } | null>(null);
  const lastVelocity = useRef(0);
  const velocitySamples = useRef<number[]>([]);
  const accelSamples = useRef<number[]>([]);
  const angleSamples = useRef<number[]>([]);
  const curvSamples = useRef<number[]>([]);
  const idleDurations = useRef<number[]>([]);
  const tremorSamples = useRef<number[]>([]);
  const idleBuf = useRef<Array<{ x: number; y: number }>>([]);
  const idleStart = useRef<number | null>(null);
  const segStart = useRef<{ x: number; y: number } | null>(null);
  const segActual = useRef(0);
  const pathEfficiencies = useRef<number[]>([]);
  // Track last click for overshoot/correction detection
  const lastClickPos = useRef<{ x: number; y: number } | null>(null);

  // Keyboard
  const totalKeys = useRef(0);
  const backspaceCount = useRef(0);
  const modifierCount = useRef(0);
  const burstCount = useRef(0);
  const longPauseCount = useRef(0);
  const keyDownTs = useRef<Map<string, number>>(new Map());
  const dwellSamples = useRef<number[]>([]);
  const flightSamples = useRef<number[]>([]);
  const lastKeyUpTs = useRef(0);
  const typingSpeedSamples = useRef<number[]>([]);
  const twStart = useRef<number | null>(null);
  const twKeys = useRef(0);

  // Clipboard
  const pasteCount = useRef(0);
  const copyCount = useRef(0);
  const cutCount = useRef(0);
  const pasteFields = useRef<string[]>([]);

  // Attention
  const tabSwitchCount = useRef(0);
  const blurCount = useRef(0);
  const focusCount = useRef(0);
  const visChanges = useRef(0);
  const resizeCount = useRef(0);
  const awayDurations = useRef<number[]>([]);
  const blurTs = useRef<number | null>(null);

  // Session / form
  const firstInteractionTs = useRef<number | null>(null);
  const fieldFocusTs = useRef<Map<string, number>>(new Map());
  const fieldDurations = useRef<Record<string, number>>({});
  const fieldRevisions = useRef<Record<string, number>>({});
  const fieldOrder = useRef<string[]>([]);
  const tabNavCount = useRef(0);
  const clickNavCount = useRef(0);
  const scrollYRef = useRef(0);
  const scrollDirRef = useRef(0);
  const scrollDirChanges = useRef(0);
  const maxScrollPct = useRef(0);
  const scrollSpeedSamples = useRef<number[]>([]);
  const lastScrollTs = useRef(0);
  const submitHoverTs = useRef<number | null>(null);
  const hesitationMs = useRef(0);
  const rawEventCount = useRef(0);
  const evtBucket = useRef<number[]>([]);

  const [metrics, setMetrics] = useState<LiveMetrics>(() => ({
    device: getDeviceInfo(),
    mouse: { move_count: 0, click_count: 0, dbl_click_count: 0, right_click_count: 0, velocity_mean: 0, velocity_max: 0, velocity_std: 0, acceleration_mean: 0, idle_period_count: 0, longest_idle_ms: 0, total_distance_px: 0, path_efficiency: 1, tremor_index: 0, direction_angle_std: 0, curvature_mean: 0, hover_duration_mean: 0, last_x: 0, last_y: 0, overshoot_count: 0, correction_count: 0 },
    keyboard: { total_keys: 0, backspace_count: 0, typing_speed_cps: 0, typing_speed_peak: 0, dwell_time_mean: 0, dwell_time_std: 0, flight_time_mean: 0, flight_time_std: 0, error_rate: 0, rhythm_consistency: 0, burst_count: 0, modifier_usage_ratio: 0, long_pause_count: 0 },
    clipboard: { paste_total: 0, copy_total: 0, cut_total: 0, paste_fields: [] },
    attention: { tab_switch_count: 0, total_time_away_ms: 0, longest_absence_ms: 0, window_resize_count: 0, blur_events: 0, focus_events: 0, visibility_changes: 0 },
    session: { first_interaction_ms: null, field_order: [], field_durations: {}, field_revisions: {}, paste_vs_type_ratio: 0, scroll_depth_pct: 0, scroll_direction_changes: 0, scroll_speed_mean: 0, total_duration_ms: 0, hesitation_before_submit_ms: 0, form_navigation_style: 'click' },
    events_per_second: 0,
    raw_event_count: 0,
  }));

  const onSubmitHoverStart = useCallback(() => { submitHoverTs.current = Date.now(); }, []);
  const onSubmitHoverEnd = useCallback(() => {
    if (submitHoverTs.current !== null) {
      hesitationMs.current += Date.now() - submitHoverTs.current;
      submitHoverTs.current = null;
    }
  }, []);

  useEffect(() => {
    function markFirst() {
      if (firstInteractionTs.current === null) firstInteractionTs.current = Date.now() - startTs.current;
    }
    function stamp() { rawEventCount.current++; evtBucket.current.push(Date.now()); }

    // ── Mouse ──────────────────────────────────────────────────────────────
    const onMouseMove = (e: MouseEvent) => {
      stamp(); markFirst();
      const ts = Date.now();
      const prev = lastPos.current;
      if (prev && ts - prev.ts < 200) {
        const dist = d2(prev.x, prev.y, e.clientX, e.clientY);
        totalDistPx.current += dist;
        segActual.current += dist;
        const dt = ts - prev.ts;
        if (dt > 0) {
          const v = dist / dt;
          accelSamples.current.push(Math.abs(v - lastVelocity.current) / dt);
          lastVelocity.current = v;
          velocitySamples.current.push(v);
          const angle = Math.atan2(e.clientY - prev.y, e.clientX - prev.x);
          if (angleSamples.current.length > 0) {
            const dA = Math.abs(angle - angleSamples.current[angleSamples.current.length - 1]);
            curvSamples.current.push(Math.min(dA, Math.PI * 2 - dA));
          }
          angleSamples.current.push(angle);
          // Idle detection
          if (v < 0.4) {
            if (idleStart.current === null) idleStart.current = ts;
            idleBuf.current.push({ x: e.clientX, y: e.clientY });
          } else if (idleStart.current !== null) {
            const dur = ts - idleStart.current;
            if (dur > 200 && idleBuf.current.length > 5) {
              idleDurations.current.push(dur);
              const xs = idleBuf.current.map(p => p.x);
              const ys = idleBuf.current.map(p => p.y);
              tremorSamples.current.push((sd(xs) + sd(ys)) / 2);
            }
            idleStart.current = null;
            idleBuf.current = [];
          }
        }
      }
      lastPos.current = { x: e.clientX, y: e.clientY, ts };
      moveCount.current++;
    };

    const onMouseDown = (e: MouseEvent) => {
      stamp(); markFirst();
      if (e.button === 0) {
        if (segStart.current) {
          const direct = d2(segStart.current.x, segStart.current.y, e.clientX, e.clientY);
          if (segActual.current > 0 && direct > 10) {
            const eff = Math.min(1, direct / segActual.current);
            pathEfficiencies.current.push(eff);
            // Overshoot detection: when efficiency < 0.6 with correction back
            if (eff < 0.55) overshootCount.current++;
          }
          segActual.current = 0;
        }
        // Correction: clicked near last click position (moved away and came back)
        if (lastClickPos.current) {
          const backDist = d2(lastClickPos.current.x, lastClickPos.current.y, e.clientX, e.clientY);
          if (backDist < 30 && totalDistPx.current > 50) correctionCount.current++;
        }
        segStart.current = { x: e.clientX, y: e.clientY };
        lastClickPos.current = { x: e.clientX, y: e.clientY };
      }
    };

    const onClick = () => { stamp(); clickCount.current++; clickNavCount.current++; };
    const onDblClick = () => { stamp(); dblClickCount.current++; };
    const onContextMenu = () => { stamp(); rightClickCount.current++; };

    // ── Keyboard ───────────────────────────────────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      stamp(); markFirst();
      const ts = Date.now();
      keyDownTs.current.set(e.code, ts);
      if (lastKeyUpTs.current > 0) {
        const flight = ts - lastKeyUpTs.current;
        flightSamples.current.push(flight);
        if (flight > 600) longPauseCount.current++;
        if (flight < 80) burstCount.current++;
      }
      const MODS = ['ShiftLeft','ShiftRight','ControlLeft','ControlRight','AltLeft','AltRight','MetaLeft','MetaRight'];
      if (MODS.includes(e.code)) modifierCount.current++;
      if (e.code === 'Tab') tabNavCount.current++;
      if (e.code === 'Backspace') backspaceCount.current++;
      totalKeys.current++;
      if (twStart.current === null) { twStart.current = ts; twKeys.current = 0; }
      twKeys.current++;
      if (ts - twStart.current >= 3000) {
        typingSpeedSamples.current.push(twKeys.current / 3);
        twStart.current = ts; twKeys.current = 0;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      stamp();
      const ts = Date.now();
      const down = keyDownTs.current.get(e.code);
      if (down !== undefined) { dwellSamples.current.push(ts - down); keyDownTs.current.delete(e.code); }
      lastKeyUpTs.current = ts;
    };

    // ── Clipboard ──────────────────────────────────────────────────────────
    const onPaste = (e: ClipboardEvent) => {
      stamp(); pasteCount.current++;
      const field = (e.target as HTMLElement)?.getAttribute?.('data-field') ?? 'unknown';
      pasteFields.current.push(field);
    };
    const onCopy = () => { stamp(); copyCount.current++; };
    const onCut = () => { stamp(); cutCount.current++; };

    // ── Attention ──────────────────────────────────────────────────────────
    const onVisChange = () => {
      visChanges.current++;
      if (document.hidden) { tabSwitchCount.current++; blurTs.current = Date.now(); }
      else if (blurTs.current !== null) { awayDurations.current.push(Date.now() - blurTs.current); blurTs.current = null; }
    };
    const onWinBlur = () => { blurCount.current++; if (blurTs.current === null) blurTs.current = Date.now(); };
    const onWinFocus = () => { focusCount.current++; if (blurTs.current !== null) { awayDurations.current.push(Date.now() - blurTs.current); blurTs.current = null; } };
    const onResize = () => { stamp(); resizeCount.current++; };

    // ── Scroll ─────────────────────────────────────────────────────────────
    const onScroll = () => {
      stamp();
      const ts = Date.now();
      const y = window.scrollY;
      const totalH = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      maxScrollPct.current = Math.max(maxScrollPct.current, (y / totalH) * 100);
      const dy = y - scrollYRef.current;
      if (dy !== 0) {
        const dir = dy > 0 ? 1 : -1;
        if (scrollDirRef.current !== 0 && dir !== scrollDirRef.current) scrollDirChanges.current++;
        scrollDirRef.current = dir;
        if (lastScrollTs.current > 0 && ts - lastScrollTs.current > 0)
          scrollSpeedSamples.current.push(Math.abs(dy) / (ts - lastScrollTs.current));
      }
      scrollYRef.current = y;
      lastScrollTs.current = ts;
    };

    // ── Field focus/blur ───────────────────────────────────────────────────
    const onFocusIn = (e: FocusEvent) => {
      const field = (e.target as HTMLElement)?.getAttribute?.('data-field');
      if (!field) return;
      fieldFocusTs.current.set(field, Date.now());
      if (!fieldOrder.current.includes(field)) fieldOrder.current.push(field);
    };
    const onFocusOut = (e: FocusEvent) => {
      const field = (e.target as HTMLElement)?.getAttribute?.('data-field');
      if (!field) return;
      const t = fieldFocusTs.current.get(field);
      if (t !== undefined) {
        fieldDurations.current[field] = (fieldDurations.current[field] ?? 0) + (Date.now() - t);
        fieldFocusTs.current.delete(field);
      }
    };
    const onInput = (e: Event) => {
      const field = (e.target as HTMLElement)?.getAttribute?.('data-field');
      if (field) fieldRevisions.current[field] = (fieldRevisions.current[field] ?? 0) + 1;
    };

    document.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mousedown', onMouseDown, { passive: true });
    document.addEventListener('click', onClick, { passive: true });
    document.addEventListener('dblclick', onDblClick, { passive: true });
    document.addEventListener('contextmenu', onContextMenu, { passive: true });
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('paste', onPaste);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    document.addEventListener('visibilitychange', onVisChange);
    document.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('focusin', onFocusIn, { passive: true });
    document.addEventListener('focusout', onFocusOut, { passive: true });
    document.addEventListener('input', onInput, { passive: true });
    window.addEventListener('blur', onWinBlur);
    window.addEventListener('focus', onWinFocus);
    window.addEventListener('resize', onResize);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('click', onClick);
      document.removeEventListener('dblclick', onDblClick);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('visibilitychange', onVisChange);
      document.removeEventListener('scroll', onScroll);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('input', onInput);
      window.removeEventListener('blur', onWinBlur);
      window.removeEventListener('focus', onWinFocus);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // ── Interval: recompute display metrics every 500ms ─────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTs.current;

      const mouse: MouseMetrics = {
        move_count: moveCount.current,
        click_count: clickCount.current,
        dbl_click_count: dblClickCount.current,
        right_click_count: rightClickCount.current,
        velocity_mean: avg(velocitySamples.current),
        velocity_max: velocitySamples.current.length ? Math.max(...velocitySamples.current) : 0,
        velocity_std: sd(velocitySamples.current),
        acceleration_mean: avg(accelSamples.current),
        idle_period_count: idleDurations.current.length,
        longest_idle_ms: idleDurations.current.length ? Math.max(...idleDurations.current) : 0,
        total_distance_px: Math.round(totalDistPx.current),
        path_efficiency: pathEfficiencies.current.length ? avg(pathEfficiencies.current) : 1,
        tremor_index: avg(tremorSamples.current),
        direction_angle_std: sd(angleSamples.current),
        curvature_mean: avg(curvSamples.current),
        hover_duration_mean: 0,
        last_x: lastPos.current?.x ?? 0,
        last_y: lastPos.current?.y ?? 0,
        overshoot_count: overshootCount.current,
        correction_count: correctionCount.current,
      };

      const keyboard: KeyboardMetrics = {
        total_keys: totalKeys.current,
        backspace_count: backspaceCount.current,
        typing_speed_cps: elapsed > 1000 ? totalKeys.current / (elapsed / 1000) : 0,
        typing_speed_peak: typingSpeedSamples.current.length ? Math.max(...typingSpeedSamples.current) : 0,
        dwell_time_mean: avg(dwellSamples.current),
        dwell_time_std: sd(dwellSamples.current),
        flight_time_mean: avg(flightSamples.current),
        flight_time_std: sd(flightSamples.current),
        error_rate: totalKeys.current > 0 ? backspaceCount.current / totalKeys.current : 0,
        rhythm_consistency: flightSamples.current.length > 3
          ? 1 - Math.min(1, sd(flightSamples.current) / (avg(flightSamples.current) + 1))
          : 0,
        burst_count: burstCount.current,
        modifier_usage_ratio: totalKeys.current > 0 ? modifierCount.current / totalKeys.current : 0,
        long_pause_count: longPauseCount.current,
      };

      const totalAway = awayDurations.current.reduce((s, d) => s + d, 0);
      const attention: AttentionMetrics = {
        tab_switch_count: tabSwitchCount.current,
        total_time_away_ms: totalAway,
        longest_absence_ms: awayDurations.current.length ? Math.max(...awayDurations.current) : 0,
        window_resize_count: resizeCount.current,
        blur_events: blurCount.current,
        focus_events: focusCount.current,
        visibility_changes: visChanges.current,
      };

      const session: SessionMetrics = {
        first_interaction_ms: firstInteractionTs.current,
        field_order: [...fieldOrder.current],
        field_durations: { ...fieldDurations.current },
        field_revisions: { ...fieldRevisions.current },
        paste_vs_type_ratio: (totalKeys.current + pasteCount.current) > 0
          ? pasteCount.current / (totalKeys.current + pasteCount.current) : 0,
        scroll_depth_pct: maxScrollPct.current,
        scroll_direction_changes: scrollDirChanges.current,
        scroll_speed_mean: avg(scrollSpeedSamples.current),
        total_duration_ms: elapsed,
        hesitation_before_submit_ms: hesitationMs.current,
        form_navigation_style: tabNavCount.current > clickNavCount.current / 2 ? 'tab'
          : clickNavCount.current > tabNavCount.current ? 'click' : 'mixed',
      };

      const cutoff = now - 5000;
      evtBucket.current = evtBucket.current.filter(t => t > cutoff);

      setMetrics(prev => ({
        device: prev.device,
        mouse, keyboard, attention, session,
        clipboard: {
          paste_total: pasteCount.current, copy_total: copyCount.current,
          cut_total: cutCount.current, paste_fields: [...new Set(pasteFields.current)],
        },
        events_per_second: parseFloat((evtBucket.current.length / 5).toFixed(1)),
        raw_event_count: rawEventCount.current,
      }));
    }, 500);

    return () => clearInterval(timer);
  }, []);

  const finalize = useCallback((analyst: string): BehaviorSnapshot => {
    const m = metrics;
    const featureCount =
      Object.keys(m.device).length +
      Object.keys(m.mouse).length +
      Object.keys(m.keyboard).length +
      Object.keys(m.clipboard).length +
      Object.keys(m.attention).length +
      Object.keys(m.session).length + 2;
    return {
      session_id: `SL-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      captured_at: new Date().toISOString(),
      analyst,
      metrics: JSON.parse(JSON.stringify(m)),
      total_features: featureCount,
    };
  }, [metrics]);

  return { metrics, finalize, onSubmitHoverStart, onSubmitHoverEnd };
}
