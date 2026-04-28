// Deterministic pseudo-random generator seeded by index
function r(seed: number, min = 0, max = 1): number {
  const s = Math.abs(Math.sin(seed * 9301 + 49297) * 233280);
  return min + (s - Math.floor(s)) * (max - min);
}

function ri(seed: number, min: number, max: number): number {
  return Math.floor(r(seed, min, max + 1));
}

const NOW = Date.now();
function minsAgo(m: number): string {
  return new Date(NOW - m * 60 * 1000).toISOString();
}
function hoursAgo(h: number): string {
  return new Date(NOW - h * 60 * 60 * 1000).toISOString();
}
function daysAgo(d: number): string {
  return new Date(NOW - d * 24 * 60 * 60 * 1000).toISOString();
}

export const COLORS = {
  bg: 'var(--bg)',
  surface: 'var(--surface)',
  card: 'var(--card)',
  border: 'var(--bdr)',
  accent: 'var(--accent)',
  primary: 'var(--t1)',
  muted: '#6B6B7A',
  danger: 'var(--red)',
  warning: 'var(--yellow)',
  safe: 'var(--green)',
  orange: 'var(--orange)',
};

// ─── Types ─────────────────────────────────────────────────────────────────

export type SessionStatus = 'SAFE' | 'WATCH' | 'ALERT' | 'BLOCKED';
export type Channel = 'mobile' | 'web';
export type ScamType = 'IMPERSONATION' | 'INVESTMENT' | 'ROMANCE' | 'APP' | 'BEC';
export type AlertStatus = 'PENDING' | 'REVIEWED' | 'ESCALATED' | 'BLOCKED';
export type BaselineHealth = 'HEALTHY' | 'DEGRADING' | 'COLD_START';
export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface TimeSeriesPoint {
  t: number;
  value: number;
}

export interface Intervention {
  id: string;
  triggeredAt: string;
  type: string;
  outcome: string;
}

export interface SignalContribution {
  signal: string;
  weight: number;
  value: string;
}

export interface SessionSignals {
  typingCadenceDeviation: number;
  preConfirmationPause: number;
  preConfirmationPauseBaseline: number;
  scrollDepth: number;
  activeCallDetected: boolean;
  remoteAccessDetected: boolean;
  timeSinceLastCall: number;
  typingCadenceTimeline: TimeSeriesPoint[];
  riskTimeline: TimeSeriesPoint[];
  interventionLog: Intervention[];
  signalContributions: SignalContribution[];
  explainabilityText: string;
}

export interface Session {
  id: string;
  userId: string;
  channel: Channel;
  riskScore: number;
  status: SessionStatus;
  startTime: string;
  transactionAmount: number;
  country: string;
  signals: SessionSignals;
}

export interface Alert {
  id: string;
  sessionId: string;
  userId: string;
  riskScore: number;
  primarySignal: string;
  channel: Channel;
  transactionAmount: number;
  status: AlertStatus;
  time: string;
  scamType: ScamType;
  severity: AlertSeverity;
  signalSummary: SignalContribution[];
}

export interface AnalyticsWeek {
  week: string;
  sessionsMonitored: number;
  alertAccuracy: number;
  falsePositiveRate: number;
  lossPrevented: number;
  baselineLoss: number;
  alertsTriggered: number;
}

export interface UserBaseline {
  userId: string;
  baselineSessions: number;
  confidenceScore: number;
  lastActive: string;
  anomalyCount: number;
  healthStatus: BaselineHealth;
  enrolledDate: string;
  country: string;
  signals: {
    avgPreConfirmationPause: number;
    sdPreConfirmationPause: number;
    avgTypingCadence: number;
    sdTypingCadence: number;
    avgScrollDepth: number;
    sdScrollDepth: number;
    avgSessionDuration: number;
    sdSessionDuration: number;
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function statusFromScore(score: number): SessionStatus {
  if (score >= 85) return 'BLOCKED';
  if (score >= 65) return 'ALERT';
  if (score >= 40) return 'WATCH';
  return 'SAFE';
}

const COUNTRIES = ['DE', 'NL', 'FR', 'PL', 'AT', 'BE', 'IT', 'SE', 'DK', 'FI', 'IE', 'ES'];
const INTERVENTION_TYPES = [
  'Session friction challenge deployed',
  'Call centre warm transfer initiated',
  'Transaction soft-blocked pending review',
  'Real-time analyst alert raised',
  'Step-up authentication triggered',
];
const INTERVENTION_OUTCOMES = [
  'User abandoned session',
  'User completed challenge — transaction blocked',
  'Analyst confirmed fraud — blocked',
  'False positive — transaction released',
  'User disconnected call — escalated',
];

function genTypingTimeline(seed: number, deviation: number): TimeSeriesPoint[] {
  return Array.from({ length: 28 }, (_, i) => ({
    t: i * 15,
    value: parseFloat((deviation + r(seed * 100 + i, -0.8, 0.8)).toFixed(2)),
  }));
}

function genRiskTimeline(seed: number, finalScore: number): TimeSeriesPoint[] {
  const points: TimeSeriesPoint[] = [];
  let score = ri(seed + 1, 5, 20);
  for (let i = 0; i <= 20; i++) {
    const target = (finalScore * i) / 20;
    score = Math.min(100, Math.max(0, score + (target - score) * 0.35 + r(seed * 50 + i, -4, 4)));
    points.push({ t: i * 30, value: Math.round(score) });
  }
  return points;
}

function genExplainability(signals: SessionSignals, score: number): string {
  const parts: string[] = [];
  if (signals.typingCadenceDeviation > 2)
    parts.push(`typing cadence was ${signals.typingCadenceDeviation.toFixed(1)} SD above user baseline`);
  if (signals.preConfirmationPause > signals.preConfirmationPauseBaseline * 1.8)
    parts.push(`pre-confirmation pause was ${((signals.preConfirmationPause - signals.preConfirmationPauseBaseline) / 0.4).toFixed(1)} SD above baseline (${signals.preConfirmationPause.toFixed(1)}s vs ${signals.preConfirmationPauseBaseline.toFixed(1)}s)`);
  if (signals.activeCallDetected)
    parts.push(`active call detected ${signals.timeSinceLastCall}s prior to confirmation`);
  if (signals.remoteAccessDetected)
    parts.push('remote access tool (AnyDesk/TeamViewer) active on device');
  if (signals.scrollDepth < 30)
    parts.push(`scroll depth on confirmation screen was only ${signals.scrollDepth}% — user did not review content`);
  if (parts.length === 0) parts.push('multiple low-severity signals exceeded the composite risk threshold');
  return `Session risk score ${score}/100. Flagged because ${parts.join(', combined with ')}. Pattern consistent with ${score >= 70 ? 'social engineering / authorised push payment fraud' : 'anomalous session behaviour requiring analyst review'}.`;
}

function genSession(i: number): Session {
  const score = ri(i, 0, 100);
  const cadDev = parseFloat(r(i * 7, 0, 5.5).toFixed(2));
  const pause = parseFloat(r(i * 11, 0.5, 12).toFixed(1));
  const pauseBaseline = parseFloat(r(i * 13, 1.2, 3.5).toFixed(1));
  const scroll = ri(i * 3, 5, 100);
  const hasCall = score > 55 ? r(i * 17) > 0.35 : r(i * 17) > 0.8;
  const hasRAT = score > 70 ? r(i * 19) > 0.5 : r(i * 19) > 0.9;
  const timeSinceCall = ri(i * 23, 15, 300);

  const interventions: Intervention[] = [];
  if (score >= 65) {
    interventions.push({
      id: `INT-${String(i * 3 + 1).padStart(4, '0')}`,
      triggeredAt: minsAgo(ri(i, 2, 30)),
      type: INTERVENTION_TYPES[ri(i * 31, 0, INTERVENTION_TYPES.length - 1)],
      outcome: INTERVENTION_OUTCOMES[ri(i * 37, 0, INTERVENTION_OUTCOMES.length - 1)],
    });
  }
  if (score >= 85) {
    interventions.push({
      id: `INT-${String(i * 3 + 2).padStart(4, '0')}`,
      triggeredAt: minsAgo(ri(i, 1, 10)),
      type: INTERVENTION_TYPES[ri(i * 41, 0, INTERVENTION_TYPES.length - 1)],
      outcome: INTERVENTION_OUTCOMES[ri(i * 43, 0, INTERVENTION_OUTCOMES.length - 1)],
    });
  }

  const contributions: SignalContribution[] = [
    { signal: 'Pre-confirmation pause', weight: Math.min(100, Math.round((pause / pauseBaseline - 1) * 40 + 20)), value: `${pause.toFixed(1)}s (baseline ${pauseBaseline.toFixed(1)}s)` },
    { signal: 'Typing cadence deviation', weight: Math.min(100, Math.round(cadDev * 18)), value: `${cadDev.toFixed(2)} SD` },
    { signal: 'Active call detected', weight: hasCall ? 72 : 0, value: hasCall ? `Yes — ${timeSinceCall}s prior` : 'No' },
    { signal: 'Remote access tool', weight: hasRAT ? 88 : 0, value: hasRAT ? 'AnyDesk detected' : 'Clean' },
    { signal: 'Scroll depth', weight: scroll < 40 ? Math.round((40 - scroll) * 1.5) : 0, value: `${scroll}%` },
  ].filter(c => c.weight > 0).sort((a, b) => b.weight - a.weight);

  const signals: SessionSignals = {
    typingCadenceDeviation: cadDev,
    preConfirmationPause: pause,
    preConfirmationPauseBaseline: pauseBaseline,
    scrollDepth: scroll,
    activeCallDetected: hasCall,
    remoteAccessDetected: hasRAT,
    timeSinceLastCall: timeSinceCall,
    typingCadenceTimeline: genTypingTimeline(i, cadDev),
    riskTimeline: genRiskTimeline(i, score),
    interventionLog: interventions,
    signalContributions: contributions,
    explainabilityText: '',
  };
  signals.explainabilityText = genExplainability(signals, score);

  return {
    id: `SES-${String(10000 + i).slice(1)}`,
    userId: `USR-${String(20000 + ri(i * 53, 0, 14999)).slice(1)}`,
    channel: r(i * 61) > 0.45 ? 'mobile' : 'web',
    riskScore: score,
    status: statusFromScore(score),
    startTime: minsAgo(ri(i * 67, 1, 480)),
    transactionAmount: parseFloat(r(i * 71, 100, 49000).toFixed(2)),
    country: COUNTRIES[ri(i * 73, 0, COUNTRIES.length - 1)],
    signals,
  };
}

// ─── Generated Data ────────────────────────────────────────────────────────

export const SESSIONS: Session[] = Array.from({ length: 44 }, (_, i) => genSession(i + 1));

export const ALERTS: Alert[] = [
  { id: 'ALT-0001', sessionId: 'SES-0003', userId: 'USR-4821', riskScore: 94, primarySignal: 'Remote access tool detected', channel: 'web', transactionAmount: 32400.00, status: 'PENDING', time: minsAgo(4), scamType: 'IMPERSONATION', severity: 'CRITICAL', signalSummary: [{ signal: 'Remote access tool', weight: 88, value: 'AnyDesk detected' }, { signal: 'Active call detected', weight: 72, value: 'Yes — 34s prior' }, { signal: 'Pre-confirmation pause', weight: 61, value: '9.2s (baseline 2.1s)' }] },
  { id: 'ALT-0002', sessionId: 'SES-0017', userId: 'USR-2241', riskScore: 88, primarySignal: 'Pre-confirmation pause anomaly', channel: 'mobile', transactionAmount: 14750.00, status: 'ESCALATED', time: minsAgo(12), scamType: 'APP', severity: 'CRITICAL', signalSummary: [{ signal: 'Pre-confirmation pause', weight: 79, value: '11.4s (baseline 1.8s)' }, { signal: 'Active call detected', weight: 72, value: 'Yes — 67s prior' }, { signal: 'Typing cadence deviation', weight: 44, value: '3.8 SD' }] },
  { id: 'ALT-0003', sessionId: 'SES-0024', userId: 'USR-7103', riskScore: 91, primarySignal: 'Active call during session', channel: 'web', transactionAmount: 8200.00, status: 'PENDING', time: minsAgo(7), scamType: 'IMPERSONATION', severity: 'CRITICAL', signalSummary: [{ signal: 'Active call detected', weight: 72, value: 'Yes — 18s prior' }, { signal: 'Remote access tool', weight: 55, value: 'TeamViewer process' }, { signal: 'Scroll depth', weight: 48, value: '11%' }] },
  { id: 'ALT-0004', sessionId: 'SES-0031', userId: 'USR-5599', riskScore: 77, primarySignal: 'Typing cadence deviation', channel: 'mobile', transactionAmount: 3100.00, status: 'REVIEWED', time: minsAgo(28), scamType: 'BEC', severity: 'HIGH', signalSummary: [{ signal: 'Typing cadence deviation', weight: 68, value: '4.9 SD' }, { signal: 'Pre-confirmation pause', weight: 41, value: '6.3s (baseline 2.4s)' }] },
  { id: 'ALT-0005', sessionId: 'SES-0008', userId: 'USR-3318', riskScore: 83, primarySignal: 'Scroll bypass on confirmation', channel: 'web', transactionAmount: 21600.00, status: 'PENDING', time: minsAgo(3), scamType: 'INVESTMENT', severity: 'CRITICAL', signalSummary: [{ signal: 'Scroll depth', weight: 76, value: '7%' }, { signal: 'Active call detected', weight: 72, value: 'Yes — 91s prior' }, { signal: 'Pre-confirmation pause', weight: 38, value: '7.8s (baseline 2.0s)' }] },
  { id: 'ALT-0006', sessionId: 'SES-0039', userId: 'USR-8872', riskScore: 72, primarySignal: 'Pre-confirmation pause anomaly', channel: 'mobile', transactionAmount: 5500.00, status: 'PENDING', time: minsAgo(41), scamType: 'ROMANCE', severity: 'HIGH', signalSummary: [{ signal: 'Pre-confirmation pause', weight: 64, value: '8.1s (baseline 1.5s)' }, { signal: 'Typing cadence deviation', weight: 29, value: '2.7 SD' }] },
  { id: 'ALT-0007', sessionId: 'SES-0011', userId: 'USR-1147', riskScore: 89, primarySignal: 'Remote access tool detected', channel: 'web', transactionAmount: 41000.00, status: 'BLOCKED', time: minsAgo(55), scamType: 'IMPERSONATION', severity: 'CRITICAL', signalSummary: [{ signal: 'Remote access tool', weight: 88, value: 'AnyDesk — session shadowing' }, { signal: 'Active call detected', weight: 72, value: 'Yes — 12s prior' }] },
  { id: 'ALT-0008', sessionId: 'SES-0044', userId: 'USR-6634', riskScore: 68, primarySignal: 'Active call during session', channel: 'mobile', transactionAmount: 1850.00, status: 'REVIEWED', time: minsAgo(78), scamType: 'APP', severity: 'HIGH', signalSummary: [{ signal: 'Active call detected', weight: 72, value: 'Yes — 44s prior' }, { signal: 'Pre-confirmation pause', weight: 31, value: '5.2s (baseline 2.2s)' }] },
  { id: 'ALT-0009', sessionId: 'SES-0019', userId: 'USR-9201', riskScore: 79, primarySignal: 'Typing cadence deviation', channel: 'web', transactionAmount: 9300.00, status: 'ESCALATED', time: hoursAgo(2), scamType: 'BEC', severity: 'HIGH', signalSummary: [{ signal: 'Typing cadence deviation', weight: 71, value: '5.2 SD' }, { signal: 'Scroll depth', weight: 39, value: '22%' }, { signal: 'Pre-confirmation pause', weight: 28, value: '4.9s (baseline 1.9s)' }] },
  { id: 'ALT-0010', sessionId: 'SES-0027', userId: 'USR-4410', riskScore: 66, primarySignal: 'Scroll bypass on confirmation', channel: 'mobile', transactionAmount: 7800.00, status: 'PENDING', time: hoursAgo(3), scamType: 'INVESTMENT', severity: 'HIGH', signalSummary: [{ signal: 'Scroll depth', weight: 61, value: '14%' }, { signal: 'Typing cadence deviation', weight: 22, value: '2.1 SD' }] },
  { id: 'ALT-0011', sessionId: 'SES-0033', userId: 'USR-2887', riskScore: 57, primarySignal: 'Unusual transaction velocity', channel: 'web', transactionAmount: 18200.00, status: 'REVIEWED', time: hoursAgo(4), scamType: 'APP', severity: 'MEDIUM', signalSummary: [{ signal: 'Transaction velocity', weight: 55, value: '3 transfers in 8 min' }, { signal: 'Pre-confirmation pause', weight: 18, value: '3.9s (baseline 2.6s)' }] },
  { id: 'ALT-0012', sessionId: 'SES-0041', userId: 'USR-7765', riskScore: 61, primarySignal: 'Device environment anomaly', channel: 'mobile', transactionAmount: 4200.00, status: 'PENDING', time: hoursAgo(5), scamType: 'ROMANCE', severity: 'MEDIUM', signalSummary: [{ signal: 'Device environment', weight: 58, value: 'VPN + new device' }, { signal: 'Pre-confirmation pause', weight: 24, value: '5.7s (baseline 2.3s)' }] },
];

export const ANALYTICS_DATA: AnalyticsWeek[] = [
  { week: '10 Mar', sessionsMonitored: 12840, alertAccuracy: 81.2, falsePositiveRate: 7.4, lossPrevented: 284000, baselineLoss: 621000, alertsTriggered: 94 },
  { week: '17 Mar', sessionsMonitored: 13210, alertAccuracy: 83.5, falsePositiveRate: 6.9, lossPrevented: 311000, baselineLoss: 658000, alertsTriggered: 101 },
  { week: '24 Mar', sessionsMonitored: 14080, alertAccuracy: 84.1, falsePositiveRate: 6.2, lossPrevented: 338000, baselineLoss: 702000, alertsTriggered: 109 },
  { week: '31 Mar', sessionsMonitored: 13650, alertAccuracy: 85.8, falsePositiveRate: 5.8, lossPrevented: 362000, baselineLoss: 689000, alertsTriggered: 114 },
  { week: '07 Apr', sessionsMonitored: 14920, alertAccuracy: 87.3, falsePositiveRate: 5.1, lossPrevented: 401000, baselineLoss: 741000, alertsTriggered: 121 },
  { week: '14 Apr', sessionsMonitored: 15340, alertAccuracy: 88.9, falsePositiveRate: 4.7, lossPrevented: 447000, baselineLoss: 783000, alertsTriggered: 128 },
];

export const SIGNAL_EFFECTIVENESS = [
  { signal: 'Pre-confirmation pause', catches: 84, falsePositives: 9 },
  { signal: 'Remote access tool', catches: 78, falsePositives: 2 },
  { signal: 'Active call detection', catches: 71, falsePositives: 11 },
  { signal: 'Typing cadence deviation', catches: 63, falsePositives: 18 },
  { signal: 'Scroll depth bypass', catches: 54, falsePositives: 14 },
  { signal: 'Transaction velocity', catches: 41, falsePositives: 22 },
  { signal: 'Device environment', catches: 35, falsePositives: 19 },
];

export const SCAM_BREAKDOWN = [
  { name: 'Impersonation', value: 38, color: 'var(--red)' },
  { name: 'APP Fraud', value: 27, color: 'var(--orange)' },
  { name: 'Investment', value: 18, color: 'var(--yellow)' },
  { name: 'BEC', value: 11, color: 'var(--accent)' },
  { name: 'Romance', value: 6, color: '#6B6B7A' },
];

export const EU_COUNTRY_ALERTS = [
  { code: 'DE', name: 'Germany', alerts: 47 },
  { code: 'NL', name: 'Netherlands', alerts: 31 },
  { code: 'FR', name: 'France', alerts: 28 },
  { code: 'PL', name: 'Poland', alerts: 22 },
  { code: 'IT', name: 'Italy', alerts: 19 },
  { code: 'BE', name: 'Belgium', alerts: 14 },
  { code: 'AT', name: 'Austria', alerts: 11 },
  { code: 'ES', name: 'Spain', alerts: 8 },
  { code: 'SE', name: 'Sweden', alerts: 6 },
  { code: 'DK', name: 'Denmark', alerts: 4 },
  { code: 'IE', name: 'Ireland', alerts: 3 },
  { code: 'FI', name: 'Finland', alerts: 2 },
];

const BASELINE_COUNTRIES = ['DE', 'NL', 'FR', 'PL', 'AT', 'BE', 'IT', 'SE'];

export const BASELINES: UserBaseline[] = Array.from({ length: 15 }, (_, i) => {
  const sessions = ri(i * 11, 2, 220);
  const confidence = sessions < 30 ? ri(i * 13, 10, 38) : sessions < 80 ? ri(i * 17, 40, 74) : ri(i * 19, 72, 96);
  let health: BaselineHealth = 'HEALTHY';
  if (sessions < 30) health = 'COLD_START';
  else if (confidence < 55 || ri(i * 23, 0, 10) < 2) health = 'DEGRADING';

  return {
    userId: `USR-${String(20000 + ri(i * 53, 0, 9999)).slice(1)}`,
    baselineSessions: sessions,
    confidenceScore: confidence,
    lastActive: minsAgo(ri(i * 29, 5, 1440)),
    anomalyCount: ri(i * 31, 0, 12),
    healthStatus: health,
    enrolledDate: daysAgo(ri(i * 37, 14, 180)),
    country: BASELINE_COUNTRIES[ri(i * 41, 0, BASELINE_COUNTRIES.length - 1)],
    signals: {
      avgPreConfirmationPause: parseFloat(r(i * 43, 1.1, 3.8).toFixed(2)),
      sdPreConfirmationPause: parseFloat(r(i * 47, 0.2, 0.9).toFixed(2)),
      avgTypingCadence: parseFloat(r(i * 53, 280, 680).toFixed(0)),
      sdTypingCadence: parseFloat(r(i * 59, 20, 95).toFixed(0)),
      avgScrollDepth: parseFloat(r(i * 61, 42, 94).toFixed(0)),
      sdScrollDepth: parseFloat(r(i * 67, 5, 22).toFixed(0)),
      avgSessionDuration: parseFloat(r(i * 71, 45, 320).toFixed(0)),
      sdSessionDuration: parseFloat(r(i * 73, 8, 55).toFixed(0)),
    },
  };
});

export const DASHBOARD_KPIs = {
  sessionsToday: 15340,
  alertsTriggered: 128,
  interventionsDeployed: 47,
  lossPreventedEUR: 447000,
};

export const RISK_DISTRIBUTION_24H = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, '0')}:00`,
  avgRisk: Math.round(r(i * 7 + 1, 18, 72)),
  sessions: ri(i * 11 + 3, 200, 900),
  alerts: ri(i * 13 + 5, 1, 18),
}));
