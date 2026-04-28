import type { BehaviorSnapshot } from './useBehaviorCapture';
import type { Session, SessionSignals } from './mockData';
import { computeRiskScore } from './interventionStore';

const KEY = 'sw1ft_live_captured';

export interface CapturedSession extends Session {
  _captured: true;
  _snapshot_id: string;
  _intervention_id?: string;
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

  // Build synthetic risk timeline (score interpolated over session duration)
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
    channel: 'web',
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
