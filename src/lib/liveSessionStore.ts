import type { BehaviorSnapshot, LiveMetrics } from './useBehaviorCapture';
import type { Session, SessionSignals } from './mockData';
import { computeRiskScore } from './interventionStore';

const KEY = 'sw1ft_live_captured';

export interface CapturedSession extends Session {
  _captured: true;
  _snapshot_id: string;
  _intervention_id?: string;
}

// Sessions received from the worker (sent by the SDK on external sites)
export interface RemoteSession extends Session {
  _remote: true;
  _page_url: string;
  _api_key: string;
  _metrics: import('./useBehaviorCapture').LiveMetrics | null;
}

function statusFromScore(score: number): Session['status'] {
  if (score >= 85) return 'BLOCKED';
  if (score >= 65) return 'ALERT';
  if (score >= 40) return 'WATCH';
  return 'SAFE';
}

function signalsFromSnapshot(snap: BehaviorSnapshot, score: number): SessionSignals {
  const m = snap.metrics;

  const contributions: SessionSignals['signalContributions'] = [];
  if (m.session.hesitation_before_submit_ms > 2000)
    contributions.push({ signal: 'Pre-confirmation pause', weight: Math.min(90, Math.round(m.session.hesitation_before_submit_ms / 200)), value: `${(m.session.hesitation_before_submit_ms / 1000).toFixed(1)}s` });
  if (m.session.paste_vs_type_ratio > 0.05)
    contributions.push({ signal: 'Paste vs type ratio', weight: Math.round(m.session.paste_vs_type_ratio * 100), value: `${(m.session.paste_vs_type_ratio * 100).toFixed(0)}%` });
  if (m.session.scroll_depth_pct < 60)
    contributions.push({ signal: 'Scroll depth', weight: Math.round(60 - m.session.scroll_depth_pct), value: `${m.session.scroll_depth_pct.toFixed(0)}%` });
  if (m.attention.tab_switch_count > 0)
    contributions.push({ signal: 'Tab switches', weight: Math.min(80, m.attention.tab_switch_count * 15), value: `×${m.attention.tab_switch_count}` });
  if (m.clipboard.paste_total > 0)
    contributions.push({ signal: 'Clipboard pastes', weight: Math.min(60, m.clipboard.paste_total * 12), value: `×${m.clipboard.paste_total}` });
  if (m.keyboard.backspace_count > 4)
    contributions.push({ signal: 'Backspace rate', weight: Math.min(50, m.keyboard.backspace_count * 4), value: `×${m.keyboard.backspace_count}` });

  const dur = m.session.total_duration_ms || 30_000;
  const riskTimeline = Array.from({ length: 8 }, (_, i) => ({
    t: Math.round((dur / 7) * i),
    value: Math.max(0, Math.min(100, score - 20 + Math.round((i / 7) * 20) + Math.round(Math.sin(i) * 8))),
  }));

  const typingTimeline = Array.from({ length: 8 }, (_, i) => ({
    t: Math.round((dur / 7) * i),
    value: parseFloat((m.keyboard.dwell_time_mean + Math.sin(i * 1.4) * 0.02).toFixed(3)),
  }));

  const primaryFactor = contributions[0];
  const factorText = primaryFactor
    ? `${primaryFactor.signal} ${primaryFactor.value}`
    : 'Behavioral baseline captured';

  return {
    typingCadenceDeviation: parseFloat((m.keyboard.dwell_time_mean * 10).toFixed(2)),
    preConfirmationPause: parseFloat((m.session.hesitation_before_submit_ms / 1000).toFixed(2)),
    preConfirmationPauseBaseline: 2.1,
    scrollDepth: Math.round(m.session.scroll_depth_pct),
    activeCallDetected: m.attention.tab_switch_count >= 3,
    remoteAccessDetected: false,
    timeSinceLastCall: 0,
    typingCadenceTimeline: typingTimeline,
    riskTimeline,
    interventionLog: score >= 61
      ? [{ id: `INT-${snap.session_id}`, triggeredAt: snap.captured_at, type: score >= 81 ? 'High Risk Intervention' : 'Step-Up Challenge', outcome: 'pending' }]
      : [],
    signalContributions: contributions,
    explainabilityText: `Risk score ${score}/100. ${factorText}.${contributions.length > 1 ? ' Additional signals: ' + contributions.slice(1).map(c => `${c.signal} (${c.value})`).join(', ') + '.' : ''}`,
  };
}

// ─── SDK payload (from external sites via sw1ft-sdk.js) ─────────────────────

interface SdkPayload {
  session_id: string;
  api_key: string;
  captured_at: string;
  page_url?: string;
  receivedAt?: string;
  // v0.2+ sends full LiveMetrics
  metrics?: Partial<LiveMetrics> & {
    // v0.1 compat fields (ignored if full metrics present)
    scroll?: { max_depth?: number };
    attention?: { hidden_time_ms?: number; tab_switch_count?: number };
    clipboard?: { paste_total?: number; paste_vs_type_ratio?: number };
  };
}

function sdkToFullMetrics(m: SdkPayload['metrics']): LiveMetrics | null {
  if (!m) return null;
  // Detect v0.2+ by presence of session.hesitation_before_submit_ms
  const sess = m.session as any;
  if (sess && 'hesitation_before_submit_ms' in sess) {
    return m as LiveMetrics;
  }
  // v0.1 fallback — map old fields to new structure as best we can
  const sc  = (m as any).scroll    ?? {};
  const at  = (m as any).attention ?? {};
  const cl  = (m as any).clipboard ?? {};
  const kb  = (m as any).keyboard  ?? {};
  const dv  = (m as any).device    ?? {};
  const mo  = (m as any).mouse     ?? {};
  return {
    device: {
      screen_width: dv.screen_w ?? 0, screen_height: dv.screen_h ?? 0,
      viewport_width: dv.viewport_w ?? 0, viewport_height: dv.viewport_h ?? 0,
      device_pixel_ratio: dv.pixel_ratio ?? 1, color_depth: 24,
      platform: dv.platform ?? 'unknown', vendor: '', touch_points_max: dv.touch ? 1 : 0,
      user_agent: '', language: '', languages: '',
      timezone: 'unknown', timezone_offset: 0, cpu_cores: 0, memory_gb: 0,
      local_hour: new Date().getHours(), local_day_of_week: new Date().getDay(),
      connection_type: 'unknown', connection_speed: 0,
    },
    mouse: {
      move_count: 0, click_count: mo.click_count ?? 0, dbl_click_count: mo.double_click_count ?? 0,
      right_click_count: mo.right_click_count ?? 0,
      velocity_mean: mo.avg_speed_px_ms ?? 0, velocity_max: 0, velocity_std: mo.speed_std ?? 0,
      acceleration_mean: 0, idle_period_count: 0, longest_idle_ms: 0,
      total_distance_px: mo.total_distance_px ?? 0,
      path_efficiency: mo.path_efficiency ?? 1, tremor_index: 0,
      direction_angle_std: 0, curvature_mean: 0, hover_duration_mean: 0,
      last_x: 0, last_y: 0, overshoot_count: 0, correction_count: 0,
    },
    keyboard: {
      total_keys: kb.total_keys ?? 0, backspace_count: kb.backspace_count ?? 0,
      typing_speed_cps: 0, typing_speed_peak: 0,
      dwell_time_mean: kb.avg_dwell_ms ?? 0, dwell_time_std: 0,
      flight_time_mean: kb.avg_flight_ms ?? 0, flight_time_std: kb.flight_std_ms ?? 0,
      error_rate: kb.error_rate ?? 0, rhythm_consistency: kb.rhythm_consistency ?? 0,
      burst_count: 0, modifier_usage_ratio: 0, long_pause_count: 0,
    },
    clipboard: {
      paste_total: cl.paste_total ?? 0, copy_total: cl.copy_total ?? 0,
      cut_total: cl.cut_total ?? 0, paste_fields: [],
    },
    attention: {
      tab_switch_count: at.tab_switch_count ?? 0,
      total_time_away_ms: at.hidden_time_ms ?? 0, longest_absence_ms: 0,
      window_resize_count: 0, blur_events: at.window_blur_count ?? 0,
      focus_events: 0, visibility_changes: 0,
    },
    session: {
      first_interaction_ms: null, field_order: [], field_durations: {}, field_revisions: {},
      paste_vs_type_ratio: cl.paste_vs_type_ratio ?? 0,
      scroll_depth_pct: (sc.max_depth ?? 0) * 100,
      scroll_direction_changes: 0, scroll_speed_mean: 0,
      total_duration_ms: (m as any).session?.total_duration_ms ?? 0,
      hesitation_before_submit_ms: 0, form_navigation_style: 'click',
    },
    events_per_second: 0,
    raw_event_count: 0,
  };
}

function sdkPayloadToSession(p: SdkPayload): RemoteSession {
  const fullMetrics = sdkToFullMetrics(p.metrics ?? null);

  // Build a minimal BehaviorSnapshot so computeRiskScore works unchanged
  let score = 0;
  if (fullMetrics) {
    const snap: BehaviorSnapshot = {
      session_id:     p.session_id,
      captured_at:    p.captured_at,
      analyst:        'sdk',
      channel:        'web',
      metrics:        fullMetrics,
      total_features: 65,
    };
    score = computeRiskScore(snap);
  }

  let domain = 'external';
  try { domain = new URL(p.page_url ?? '').hostname; } catch (_) {}

  // Re-use signalsFromSnapshot for rich signal breakdown
  const signals = fullMetrics
    ? signalsFromSnapshot(
        { session_id: p.session_id, captured_at: p.captured_at, analyst: 'sdk', channel: 'web', metrics: fullMetrics, total_features: 65 },
        score,
      )
    : {
        typingCadenceDeviation: 0, preConfirmationPause: 0, preConfirmationPauseBaseline: 2.1,
        scrollDepth: 0, activeCallDetected: false, remoteAccessDetected: false,
        timeSinceLastCall: 0, typingCadenceTimeline: [], riskTimeline: [],
        interventionLog: [], signalContributions: [],
        explainabilityText: `SDK session from ${domain}`,
      };

  return {
    _remote:   true,
    _page_url: p.page_url ?? '',
    _api_key:  p.api_key,
    _metrics:  fullMetrics,
    id:               p.session_id,
    userId:           domain,
    channel:          'web',
    riskScore:        score,
    status:           statusFromScore(score),
    startTime:        p.receivedAt ?? p.captured_at,
    transactionAmount: 0,
    country:          'GB',
    signals,
  };
}

// ─── Remote fetch ────────────────────────────────────────────────────────────

export async function fetchRemoteSessions(): Promise<RemoteSession[]> {
  try {
    const r = await fetch('/api/sessions?limit=50', { credentials: 'same-origin' });
    if (!r.ok) return [];
    const data = await r.json() as { sessions: SdkPayload[] };
    return (data.sessions ?? []).map(sdkPayloadToSession);
  } catch {
    return [];
  }
}

// ─── Local captured sessions ─────────────────────────────────────────────────

export function snapshotToSession(
  snap: BehaviorSnapshot,
  amount: number,
  interventionId?: string,
): CapturedSession {
  const score = computeRiskScore(snap);
  return {
    _captured: true,
    _snapshot_id: snap.session_id,
    _intervention_id: interventionId,
    id: snap.session_id,
    userId: snap.user_id ?? snap.analyst,
    channel: snap.channel,
    riskScore: score,
    status: statusFromScore(score),
    startTime: snap.captured_at,
    transactionAmount: amount,
    country: 'GB',
    signals: signalsFromSnapshot(snap, score),
  };
}

export function saveLiveSession(s: CapturedSession): void {
  const list = getLiveSessions();
  const idx = list.findIndex(e => e.id === s.id);
  if (idx >= 0) list[idx] = s; else list.unshift(s);
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)));
  window.dispatchEvent(new CustomEvent('sw1ft_new_session', { detail: s }));
}

export function getLiveSessions(): CapturedSession[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); }
  catch { return []; }
}

export function clearLiveSessions(): void {
  localStorage.removeItem(KEY);
}
