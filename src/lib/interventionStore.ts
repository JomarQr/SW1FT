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
  let score = 0;

  // ── Hesitation before submit (main APP fraud signal) ──────────────────────
  // Normal users confirm in 1–4s. Victims being coached pause 8–20s.
  const hes = m.session.hesitation_before_submit_ms;
  if      (hes > 15_000) score += 35;  // clearly being instructed
  else if (hes > 10_000) score += 22;
  else if (hes >  7_000) score += 12;
  else if (hes >  4_500) score += 4;   // slightly slow — no signal alone

  // ── Paste vs type ratio ────────────────────────────────────────────────────
  // Normal: type card manually (ratio ~0–0.15). Fraud: entire form pasted.
  const pvt = m.session.paste_vs_type_ratio;
  if      (pvt > 0.75) score += 22;
  else if (pvt > 0.50) score += 12;
  else if (pvt > 0.30) score += 5;
  // Ratio ≤ 0.30 → no penalty (one paste = card number = totally normal)

  // ── Scroll depth ──────────────────────────────────────────────────────────
  // Ignoring confirmation screen is suspicious. But most payment forms
  // are above fold so 40–60% scroll is typical — only flag very low.
  const scroll = m.session.scroll_depth_pct;
  if      (scroll < 8)  score += 22;
  else if (scroll < 20) score += 12;
  else if (scroll < 35) score += 5;
  // 35%+ → normal

  // ── Tab switches / window focus loss ──────────────────────────────────────
  // Normal: 0–1 (maybe glance at phone). Guided fraud: 3+ (following caller).
  const tabs = m.attention.tab_switch_count;
  if      (tabs >= 5) score += 22;
  else if (tabs >= 3) score += 14;
  else if (tabs >= 2) score += 6;
  // 0–1 → no penalty

  // ── Clipboard paste count ─────────────────────────────────────────────────
  // 1–2 pastes (card number, name) → completely normal.
  const pastes = m.clipboard.paste_total;
  if      (pastes >= 6) score += 18;
  else if (pastes >= 4) score += 10;
  else if (pastes >= 3) score += 4;
  // ≤ 2 → no penalty

  // ── Extended time away from window ────────────────────────────────────────
  const away = m.attention.total_time_away_ms;
  if      (away > 25_000) score += 18;
  else if (away > 15_000) score += 10;
  else if (away > 8_000)  score += 4;

  // ── Robotic typing speed (>10 chars/s = likely automated) ─────────────────
  if (m.keyboard.typing_speed_cps > 12) score += 12;

  // ── Excessive backspacing (guided entry — told what to type, then corrected) ─
  if      (m.keyboard.backspace_count > 20) score += 10;
  else if (m.keyboard.backspace_count > 12) score += 5;

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
