export type PersonaMode = 'workday_desktop' | 'fast_routine' | 'careful_highvalue' | 'mobile_casual' | 'cold_start';
export type DeviationLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type ActionType = 'approve' | 'cooling_off' | 'manual_review' | 'block';

export interface RiskFactor {
  label: string;
  detail: string;
  severity: 'low' | 'medium' | 'high';
}

export interface RadarPoint {
  metric: string;
  baseline: number;
  current: number;
}

export interface HistoryPoint {
  label: string;
  score: number;
}

export interface DistributionPoint {
  label: string;
  count: number;
  color: string;
}

export interface PersonaResult {
  scenario: string;
  personaMode: PersonaMode;
  personaLabel: string;
  personaDescription: string;
  personaConfidence: number;
  sessionCount: number;
  matchScore: number;
  deviationLevel: DeviationLevel;
  riskLevel: RiskLevel;
  finalScore: number;
  riskFactors: RiskFactor[];
  action: ActionType;
  actionLabel: string;
  actionDescription: string;
  radarData: RadarPoint[];
  history: HistoryPoint[];
  distribution: DistributionPoint[];
}

const STABLE_HISTORY: HistoryPoint[] = [
  { label: 'S-19', score: 11 },
  { label: 'S-18', score: 8  },
  { label: 'S-17', score: 14 },
  { label: 'S-16', score: 9  },
  { label: 'S-15', score: 12 },
  { label: 'S-14', score: 7  },
  { label: 'S-13', score: 15 },
  { label: 'S-12', score: 11 },
  { label: 'S-11', score: 9  },
];

const STANDARD_DISTRIBUTION: DistributionPoint[] = [
  { label: 'Workday Desktop',   count: 12, color: '#AA55E3' },
  { label: 'Fast Routine',      count: 5,  color: '#6B7FD4' },
  { label: 'Careful High-Value', count: 2, color: '#55C3E3' },
  { label: 'Mobile Casual',     count: 1,  color: '#55E3AA' },
];

export const SCENARIOS: Record<string, PersonaResult> = {

  normal: {
    scenario: 'normal',
    personaMode: 'workday_desktop',
    personaLabel: 'Workday Desktop Operator',
    personaDescription: 'Consistent desktop user. Regular payment cadence. All signals within established baseline.',
    personaConfidence: 91,
    sessionCount: 20,
    matchScore: 94,
    deviationLevel: 'Low',
    riskLevel: 'Low',
    finalScore: 11,
    riskFactors: [
      { label: 'Typing speed', detail: 'Within normal range — 4.1 ch/s vs 4.2 ch/s baseline', severity: 'low' },
    ],
    action: 'approve',
    actionLabel: 'Approve payment',
    actionDescription: 'Session matches established behavioral profile across all dimensions. No intervention required.',
    radarData: [
      { metric: 'Typing Rhythm',    baseline: 86, current: 88 },
      { metric: 'Hesitation',       baseline: 80, current: 77 },
      { metric: 'Navigation',       baseline: 88, current: 85 },
      { metric: 'Session Duration', baseline: 82, current: 84 },
      { metric: 'Amount Profile',   baseline: 90, current: 87 },
      { metric: 'Input Smoothness', baseline: 85, current: 82 },
      { metric: 'Device Match',     baseline: 95, current: 95 },
      { metric: 'Temporal Pattern', baseline: 88, current: 84 },
    ],
    history: [...STABLE_HISTORY, { label: 'NOW', score: 11 }],
    distribution: STANDARD_DISTRIBUTION,
  },

  stressed: {
    scenario: 'stressed',
    personaMode: 'careful_highvalue',
    personaLabel: 'Careful High-Value Mode',
    personaDescription: 'Elevated caution signals. Multiple correction events. Confirm hesitation well above personal baseline.',
    personaConfidence: 64,
    sessionCount: 20,
    matchScore: 58,
    deviationLevel: 'High',
    riskLevel: 'Medium',
    finalScore: 67,
    riskFactors: [
      { label: 'Extended confirm hesitation', detail: '+193% above personal baseline — 8.2 s vs 2.8 s average',          severity: 'high'   },
      { label: 'Elevated correction rate',    detail: '6 corrections vs 1.2 session average',                             severity: 'high'   },
      { label: 'Typing speed reduction',      detail: '33% below established baseline — consistent with hesitant input', severity: 'medium' },
      { label: 'Backspace event spike',       detail: '12 backspace events vs 3.1 session average',                       severity: 'medium' },
    ],
    action: 'cooling_off',
    actionLabel: 'Apply cooling-off delay',
    actionDescription: 'Behavioral signals indicate elevated stress state. A short delay prompt before confirmation is recommended.',
    radarData: [
      { metric: 'Typing Rhythm',    baseline: 86, current: 48 },
      { metric: 'Hesitation',       baseline: 80, current: 22 },
      { metric: 'Navigation',       baseline: 88, current: 41 },
      { metric: 'Session Duration', baseline: 82, current: 55 },
      { metric: 'Amount Profile',   baseline: 90, current: 76 },
      { metric: 'Input Smoothness', baseline: 85, current: 62 },
      { metric: 'Device Match',     baseline: 95, current: 95 },
      { metric: 'Temporal Pattern', baseline: 88, current: 80 },
    ],
    history: [...STABLE_HISTORY, { label: 'NOW', score: 67 }],
    distribution: STANDARD_DISTRIBUTION,
  },

  scam: {
    scenario: 'scam',
    personaMode: 'workday_desktop',
    personaLabel: 'Workday Desktop Operator',
    personaDescription: 'Critical deviation from established profile. Five simultaneous high-severity anomalies. Pattern consistent with coached authorised push payment.',
    personaConfidence: 31,
    sessionCount: 20,
    matchScore: 18,
    deviationLevel: 'Critical',
    riskLevel: 'Critical',
    finalScore: 94,
    riskFactors: [
      { label: 'Unrecognised recipient',       detail: 'No match in 20-session recipient history',                                    severity: 'high' },
      { label: 'Extreme amount anomaly',        detail: 'Amount is 27x above personal average — €12,500 vs €450 baseline',            severity: 'high' },
      { label: 'Extreme confirm hesitation',    detail: '+543% above baseline — 18 s vs 2.8 s average',                              severity: 'high' },
      { label: 'Severe typing speed reduction', detail: '43% below baseline — pattern consistent with externally coached input',      severity: 'high' },
      { label: 'Tab switch events during session', detail: '3 tab switches detected — possible concurrent communication channel',    severity: 'medium' },
    ],
    action: 'block',
    actionLabel: 'Block — manual review required',
    actionDescription: 'Session anomaly profile matches authorised push payment scam pattern. Human review is required before this transaction can proceed.',
    radarData: [
      { metric: 'Typing Rhythm',    baseline: 86, current: 18 },
      { metric: 'Hesitation',       baseline: 80, current:  5 },
      { metric: 'Navigation',       baseline: 88, current: 30 },
      { metric: 'Session Duration', baseline: 82, current: 15 },
      { metric: 'Amount Profile',   baseline: 90, current:  8 },
      { metric: 'Input Smoothness', baseline: 85, current: 42 },
      { metric: 'Device Match',     baseline: 95, current: 95 },
      { metric: 'Temporal Pattern', baseline: 88, current: 64 },
    ],
    history: [...STABLE_HISTORY, { label: 'NOW', score: 94 }],
    distribution: STANDARD_DISTRIBUTION,
  },

  traveling: {
    scenario: 'traveling',
    personaMode: 'mobile_casual',
    personaLabel: 'Mobile Casual',
    personaDescription: 'Atypical device and temporal context. Off-hours session on unrecognised device class. Behavioral signals otherwise within range.',
    personaConfidence: 55,
    sessionCount: 20,
    matchScore: 62,
    deviationLevel: 'Medium',
    riskLevel: 'Medium',
    finalScore: 48,
    riskFactors: [
      { label: 'Unrecognised device type',   detail: 'Mobile detected — 95% of prior sessions used desktop',              severity: 'medium' },
      { label: 'Off-hours session',          detail: '23:14 local time — outside normal activity window (09:00–18:00)',   severity: 'medium' },
      { label: 'Reduced input smoothness',   detail: 'Touch jitter score elevated vs desktop baseline',                   severity: 'low'    },
      { label: 'Slightly elevated amount',   detail: '€520 vs €450 average — within two standard deviations',            severity: 'low'    },
    ],
    action: 'cooling_off',
    actionLabel: 'Soft challenge recommended',
    actionDescription: 'Device and temporal context fall outside normal profile. A lightweight verification step is suggested before confirmation.',
    radarData: [
      { metric: 'Typing Rhythm',    baseline: 86, current: 70 },
      { metric: 'Hesitation',       baseline: 80, current: 72 },
      { metric: 'Navigation',       baseline: 88, current: 68 },
      { metric: 'Session Duration', baseline: 82, current: 74 },
      { metric: 'Amount Profile',   baseline: 90, current: 82 },
      { metric: 'Input Smoothness', baseline: 85, current: 52 },
      { metric: 'Device Match',     baseline: 95, current: 30 },
      { metric: 'Temporal Pattern', baseline: 88, current: 35 },
    ],
    history: [...STABLE_HISTORY, { label: 'NOW', score: 48 }],
    distribution: STANDARD_DISTRIBUTION,
  },

  newuser: {
    scenario: 'newuser',
    personaMode: 'cold_start',
    personaLabel: 'Cold Start — No Baseline',
    personaDescription: 'Insufficient session history to establish a behavioral profile. Population-level defaults applied. Model will mature after 5–10 sessions.',
    personaConfidence: 22,
    sessionCount: 1,
    matchScore: 50,
    deviationLevel: 'Medium',
    riskLevel: 'Medium',
    finalScore: 55,
    riskFactors: [
      { label: 'No behavioral baseline',           detail: 'First session — model operating on population-level defaults', severity: 'medium' },
      { label: 'Persona mode unresolvable',         detail: 'Minimum 5 sessions required for mode classification',         severity: 'medium' },
      { label: 'No historical amount context',      detail: 'No prior transaction data available for comparison',          severity: 'low'    },
    ],
    action: 'manual_review',
    actionLabel: 'Enhanced monitoring active',
    actionDescription: 'Cold start profile. Standard monitoring applies. Persona model will reach operational confidence after 5 to 10 sessions.',
    radarData: [
      { metric: 'Typing Rhythm',    baseline: 70, current: 55 },
      { metric: 'Hesitation',       baseline: 70, current: 60 },
      { metric: 'Navigation',       baseline: 70, current: 65 },
      { metric: 'Session Duration', baseline: 70, current: 58 },
      { metric: 'Amount Profile',   baseline: 70, current: 50 },
      { metric: 'Input Smoothness', baseline: 70, current: 63 },
      { metric: 'Device Match',     baseline: 70, current: 70 },
      { metric: 'Temporal Pattern', baseline: 70, current: 55 },
    ],
    history: [{ label: 'NOW', score: 55 }],
    distribution: [
      { label: 'Cold Start', count: 1, color: '#6B6B7A' },
    ],
  },
};
