import type { BehaviorSnapshot } from './useBehaviorCapture';

export type RiskLevel = 'APPROVE' | 'SOFT_WARNING' | 'STEP_UP' | 'HIGH_RISK';

export interface InterventionRecord {
  id: string;
  session_id: string;
  user_id: string;
  timestamp: string;
  risk_score: number;
  risk_level: RiskLevel;
  recommended_actions: string[];
  user_action: 'cancel' | 'proceed' | 'pending';
  outcome: 'fraud_prevented' | 'monitoring' | 'pending';
  top_risk_factors: string[];
  amount: number;
}

export interface InterventionKPIs {
  total_triggered: number;
  payments_cancelled: number;
  fraud_prevented: number;
  user_override_rate: number;   // % who clicked Proceed anyway
  total_amount_protected: number;
}

const KEY = 'sw1ft_interventions';

export function getInterventions(): InterventionRecord[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); }
  catch { return []; }
}

export function saveIntervention(r: InterventionRecord): void {
  const list = getInterventions();
  const idx = list.findIndex(e => e.id === r.id);
  if (idx >= 0) list[idx] = r; else list.unshift(r);
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 200)));
}

export function getInterventionKPIs(): InterventionKPIs {
  const list = getInterventions();
  const triggered = list.length;
  const cancelled = list.filter(r => r.user_action === 'cancel').length;
  const proceeded = list.filter(r => r.user_action === 'proceed').length;
  const resolved  = list.filter(r => r.user_action !== 'pending').length;
  const total_amount_protected = list
    .filter(r => r.user_action === 'cancel')
    .reduce((s, r) => s + r.amount, 0);

  return {
    total_triggered: triggered,
    payments_cancelled: cancelled,
    fraud_prevented: cancelled,
    user_override_rate: resolved > 0 ? Math.round((proceeded / resolved) * 100) : 0,
    total_amount_protected,
  };
}

// ─── Risk scoring from BehaviorSnapshot ──────────────────────────────────────

export function computeRiskScore(snap: BehaviorSnapshot): number {
  const m = snap.metrics;
  let score = 15;

  // Hesitation before submit — main APP fraud signal
  const hes = m.session.hesitation_before_submit_ms;
  if      (hes > 12_000) score += 30;
  else if (hes >  6_000) score += 18;
  else if (hes >  3_000) score += 8;

  // Paste vs type — card details pasted in (not typed)
  const pvt = m.session.paste_vs_type_ratio;
  if      (pvt > 0.6) score += 20;
  else if (pvt > 0.3) score += 10;
  else if (pvt > 0.1) score += 4;

  // Scroll depth — didn't read confirmation page
  const scroll = m.session.scroll_depth_pct;
  if      (scroll < 15) score += 18;
  else if (scroll < 35) score += 9;
  else if (scroll < 55) score += 3;

  // Tab switches / window blur — on a call?
  const tabs = m.attention.tab_switch_count;
  if      (tabs >= 5) score += 15;
  else if (tabs >= 2) score += 8;
  else if (tabs >= 1) score += 3;

  // Clipboard paste activity
  const pastes = m.clipboard.paste_total;
  if      (pastes >= 4) score += 12;
  else if (pastes >= 2) score += 6;
  else if (pastes >= 1) score += 2;

  // Very fast typing — robotic / script-driven
  if (m.keyboard.typing_speed_cps > 9) score += 10;

  // Very low keyboard activity (user guided step by step)
  if (m.keyboard.total_keys > 0 && m.keyboard.total_keys < 8) score += 8;

  // High error rate or excessive backspaces (uncertain / instructed)
  if (m.keyboard.backspace_count > 10) score += 8;
  else if (m.keyboard.backspace_count > 5) score += 4;

  // Long time away from window during form fill
  if (m.attention.total_time_away_ms > 10_000) score += 10;
  else if (m.attention.total_time_away_ms > 4_000) score += 5;

  return Math.min(100, Math.max(0, Math.round(score)));
}

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 81) return 'HIGH_RISK';
  if (score >= 61) return 'STEP_UP';
  if (score >= 31) return 'SOFT_WARNING';
  return 'APPROVE';
}

export function getRecommendedActions(level: RiskLevel): string[] {
  switch (level) {
    case 'HIGH_RISK':
      return ['Cooling-off delay (2 min)', 'Confirm payment intent', 'Require re-authentication'];
    case 'STEP_UP':
      return ['Request payment purpose confirmation', 'Soft friction challenge'];
    case 'SOFT_WARNING':
      return ['Display soft warning banner', 'Log for analyst review'];
    default:
      return ['Approve — no action required'];
  }
}

export function getTopRiskFactors(snap: BehaviorSnapshot): string[] {
  const m = snap.metrics;
  const factors: { label: string; weight: number }[] = [];

  const hes = m.session.hesitation_before_submit_ms;
  if (hes > 3_000)
    factors.push({ label: `Pre-confirm pause ${(hes / 1000).toFixed(1)}s`, weight: hes / 100 });

  const pvt = m.session.paste_vs_type_ratio;
  if (pvt > 0.1)
    factors.push({ label: `Paste ratio ${(pvt * 100).toFixed(0)}%`, weight: pvt * 100 });

  const scroll = m.session.scroll_depth_pct;
  if (scroll < 55)
    factors.push({ label: `Scroll depth ${scroll.toFixed(0)}%`, weight: 60 - scroll });

  const tabs = m.attention.tab_switch_count;
  if (tabs >= 1)
    factors.push({ label: `Tab switches ×${tabs}`, weight: tabs * 12 });

  const pastes = m.clipboard.paste_total;
  if (pastes >= 1)
    factors.push({ label: `Clipboard pastes ×${pastes}`, weight: pastes * 8 });

  if (m.keyboard.backspace_count > 5)
    factors.push({ label: `Backspaces ×${m.keyboard.backspace_count}`, weight: m.keyboard.backspace_count * 3 });

  return factors
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4)
    .map(f => f.label);
}
