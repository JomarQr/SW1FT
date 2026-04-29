import type { BehaviorSnapshot } from './useBehaviorCapture';

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface ProfileDimension {
  name: string;
  baseline: number;   // median of historical sessions (0-100 normalised)
  current: number;    // latest session value (0-100 normalised)
  rawBaseline: string;
  rawCurrent: string;
  unit: string;
  zScore: number;
}

export interface TextInsight {
  text: string;
  severity: 'ok' | 'watch' | 'alert';
}

export interface ProfileResult {
  userId: string;
  sessionCount: number;
  confidenceScore: number;
  confidenceLabel: string;
  matchScore: number;
  driftScore: number;
  driftLabel: string;
  sessionsNeeded: { forBasic: number; forReliable: number; forMature: number } | null;
  dimensions: ProfileDimension[];
  confidenceHistory: { label: string; confidence: number }[];
  stabilityHistory:  { label: string; match: number }[];
  insights: TextInsight[];
  personaLabel: string;
  personaDescription: string;
}

/* ── Maths helpers ──────────────────────────────────────────────────────── */

function median(arr: number[]): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

function zScore(value: number, arr: number[]): number {
  const sd = stddev(arr);
  if (sd === 0) return 0;
  return (value - median(arr)) / sd;
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

/* ── Confidence from session count ─────────────────────────────────────── */

export function confidenceFromCount(n: number): { score: number; label: string } {
  if (n <= 2)  return { score: Math.round(n * 9 + 2),   label: 'Very Low'       };
  if (n <= 5)  return { score: Math.round(21 + (n - 3) * 7), label: 'Early Learning' };
  if (n <= 10) return { score: Math.round(41 + (n - 6) * 4), label: 'Developing'     };
  if (n <= 19) return { score: Math.round(61 + (n - 11) * 2.2), label: 'Reliable'    };
  return { score: Math.min(97, Math.round(81 + (n - 20) * 0.8)), label: 'Mature'      };
}

function sessionsNeeded(n: number) {
  return {
    forBasic:    Math.max(0, 5  - n),
    forReliable: Math.max(0, 10 - n),
    forMature:   Math.max(0, 20 - n),
  };
}

/* ── Extract normalised dims from a real BehaviorSnapshot ───────────────── */

interface RawDims {
  typingSpeed:    number;   // cps
  hesitation:     number;   // ms
  errorRate:      number;   // 0-1
  focusStability: number;   // 0-1
  sessionDuration: number;  // ms
  mouseSmoothing: number;   // 0-1  path_efficiency
  correctionRate: number;   // 0-1
  scrollDepth:    number;   // 0-100
}

function extractRaw(s: BehaviorSnapshot): RawDims {
  const kb = s.metrics.keyboard;
  const ms = s.metrics.mouse;
  const se = s.metrics.session;
  const at = s.metrics.attention;
  return {
    typingSpeed:     kb.typing_speed_cps,
    hesitation:      se.hesitation_before_submit_ms,
    errorRate:       kb.error_rate,
    focusStability:  clamp(1 - at.tab_switch_count / 8, 0, 1),
    sessionDuration: se.total_duration_ms,
    mouseSmoothing:  ms.path_efficiency,
    correctionRate:  kb.total_keys > 0 ? kb.backspace_count / kb.total_keys : 0,
    scrollDepth:     se.scroll_depth_pct,
  };
}

/* normalise each dim to 0-100 "health" scale (100 = looks like normal user) */
function normalise(raw: RawDims): Record<keyof RawDims, number> {
  return {
    typingSpeed:     clamp(raw.typingSpeed * 20, 0, 100),               // 5 cps → 100
    hesitation:      clamp(100 - raw.hesitation / 200, 0, 100),         // 0ms → 100, 20s → 0
    errorRate:       clamp((1 - raw.errorRate) * 100, 0, 100),
    focusStability:  raw.focusStability * 100,
    sessionDuration: clamp(100 - raw.sessionDuration / 1200, 0, 100),   // 0ms → 100, 2min → 0
    mouseSmoothing:  raw.mouseSmoothing * 100,
    correctionRate:  clamp((1 - raw.correctionRate * 4) * 100, 0, 100),
    scrollDepth:     clamp(raw.scrollDepth, 0, 100),
  };
}

/* ── Compute profile from real BehaviorSnapshot array ───────────────────── */

export function computeProfile(snapshots: BehaviorSnapshot[], userId: string): ProfileResult {
  const sorted = [...snapshots].sort((a, b) =>
    new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime());

  const allRaw  = sorted.map(extractRaw);
  const allNorm = sorted.map(s => normalise(extractRaw(s)));

  const n = sorted.length;
  const { score: confidenceScore, label: confidenceLabel } = confidenceFromCount(n);
  const needed = sessionsNeeded(n);

  const dimKeys: (keyof RawDims)[] = [
    'typingSpeed', 'hesitation', 'errorRate',
    'focusStability', 'sessionDuration', 'mouseSmoothing',
    'correctionRate', 'scrollDepth',
  ];
  const dimNames: Record<keyof RawDims, string> = {
    typingSpeed:     'Typing Speed',
    hesitation:      'Submit Hesitation',
    errorRate:       'Error Rate',
    focusStability:  'Focus Stability',
    sessionDuration: 'Session Duration',
    mouseSmoothing:  'Mouse Smoothness',
    correctionRate:  'Correction Rate',
    scrollDepth:     'Scroll Depth',
  };
  const dimUnits: Record<keyof RawDims, string> = {
    typingSpeed:     'cps',
    hesitation:      'ms',
    errorRate:       '%',
    focusStability:  '%',
    sessionDuration: 'ms',
    mouseSmoothing:  '0-1',
    correctionRate:  '%',
    scrollDepth:     '%',
  };

  const histNorm = n > 1 ? allNorm.slice(0, -1) : allNorm;
  const currentNorm = allNorm[n - 1] ?? allNorm[0];
  const currentRaw  = allRaw[n - 1] ?? allRaw[0];

  const dimensions: ProfileDimension[] = dimKeys.map(k => {
    const historical = histNorm.map(d => d[k]);
    const base  = median(historical.length ? historical : [currentNorm[k]]);
    const curr  = currentNorm[k];
    const z     = zScore(curr, historical.length >= 2 ? historical : [base, base + 0.1]);
    const raw   = allRaw.map(d => d[k]);
    return {
      name:         dimNames[k],
      baseline:     Math.round(base),
      current:      Math.round(curr),
      rawBaseline:  fmtRaw(k, median(raw), dimUnits[k]),
      rawCurrent:   fmtRaw(k, currentRaw[k], dimUnits[k]),
      unit:         dimUnits[k],
      zScore:       parseFloat(z.toFixed(2)),
    };
  });

  const avgAbsZ  = dimensions.reduce((s, d) => s + Math.abs(d.zScore), 0) / dimensions.length;
  const matchScore = Math.round(clamp(100 - avgAbsZ * 28, 0, 100));

  // Drift: compare last 5 sessions average vs all-time average
  const last5  = allNorm.slice(-5);
  const driftVals = dimKeys.map(k => {
    const allAvg  = allNorm.reduce((s, d) => s + d[k], 0) / allNorm.length;
    const last5Avg = last5.reduce((s, d) => s + d[k], 0) / last5.length;
    return Math.abs(last5Avg - allAvg);
  });
  const driftScore = Math.round(clamp(driftVals.reduce((s, v) => s + v, 0) / driftVals.length, 0, 100));
  const driftLabel = driftScore < 15 ? 'Low Drift' : driftScore < 35 ? 'Moderate Drift' : 'High Drift';

  // Confidence history (one point per session)
  const confidenceHistory = sorted.map((_, i) => ({
    label: i === n - 1 ? 'NOW' : `S-${n - i}`,
    confidence: confidenceFromCount(i + 1).score,
  }));

  // Stability history (match score per session vs preceding baseline)
  const stabilityHistory = sorted.map((_, i) => {
    if (i === 0) return { label: 'S-1', match: 80 };
    const prevNorms = allNorm.slice(0, i);
    const curr2 = allNorm[i];
    const avgZ = dimKeys.reduce((s, k) => {
      const prev = prevNorms.map(d => d[k]);
      return s + Math.abs(zScore(curr2[k], prev.length >= 2 ? prev : [curr2[k], curr2[k]]));
    }, 0) / dimKeys.length;
    return {
      label: i === n - 1 ? 'NOW' : `S-${n - i}`,
      match: Math.round(clamp(100 - avgZ * 28, 0, 100)),
    };
  });

  const insights = buildInsights(dimensions, confidenceScore, driftScore, n);
  const { personaLabel, personaDescription } = buildPersona(confidenceScore, matchScore, driftScore);

  return {
    userId, sessionCount: n, confidenceScore, confidenceLabel, matchScore,
    driftScore, driftLabel,
    sessionsNeeded: needed.forMature > 0 ? needed : null,
    dimensions, confidenceHistory, stabilityHistory,
    insights, personaLabel, personaDescription,
  };
}

function fmtRaw(k: keyof RawDims, v: number, unit: string): string {
  if (k === 'hesitation') return `${(v / 1000).toFixed(1)} s`;
  if (k === 'sessionDuration') return `${(v / 1000).toFixed(0)} s`;
  if (unit === '%') return `${(v * 100).toFixed(0)} %`;
  if (unit === 'cps') return `${v.toFixed(2)} cps`;
  return `${v.toFixed(2)}`;
}

function buildInsights(dims: ProfileDimension[], conf: number, drift: number, n: number): TextInsight[] {
  const out: TextInsight[] = [];
  if (n < 5) {
    out.push({ text: `Behavioral profile still learning. ${5 - n} more session${5 - n > 1 ? 's' : ''} needed for a basic baseline.`, severity: 'watch' });
  }
  for (const d of dims) {
    const az = Math.abs(d.zScore);
    if (d.name === 'Typing Speed' && az > 1.8)
      out.push({ text: `Typing speed ${d.current < d.baseline ? 'lower' : 'higher'} than usual (${d.rawCurrent} vs ${d.rawBaseline} baseline).`, severity: az > 2.5 ? 'alert' : 'watch' });
    if (d.name === 'Submit Hesitation' && az > 1.5)
      out.push({ text: `Confirmation hesitation elevated — ${d.rawCurrent} vs normal ${d.rawBaseline}.`, severity: az > 2.5 ? 'alert' : 'watch' });
    if (d.name === 'Focus Stability' && az > 1.5)
      out.push({ text: `Focus interruptions above typical baseline for this user.`, severity: 'watch' });
    if (d.name === 'Error Rate' && az > 1.8)
      out.push({ text: `Error rate higher than established norm — potential input difficulty.`, severity: 'watch' });
    if (d.name === 'Mouse Smoothness' && d.current < 30)
      out.push({ text: `Mouse path efficiency low — possible remote control or unusual device context.`, severity: 'alert' });
    if (d.name === 'Correction Rate' && az > 2)
      out.push({ text: `High correction rate — significantly more backspace use than normal.`, severity: 'watch' });
  }
  if (drift > 30)
    out.push({ text: 'Behavioral drift detected — recent session patterns diverging from historical norms.', severity: 'watch' });
  if (out.length === 0)
    out.push({ text: 'All behavioral signals within established normal range for this user.', severity: 'ok' });
  if (conf >= 61)
    out.push({ text: 'Device usage consistent with historical profile.', severity: 'ok' });
  return out;
}

function buildPersona(conf: number, match: number, drift: number): { personaLabel: string; personaDescription: string } {
  if (conf < 21) return {
    personaLabel: 'Cold Start',
    personaDescription: 'Insufficient data to establish a behavioral baseline. Profile will mature with more sessions.',
  };
  if (conf < 41) return {
    personaLabel: 'Emerging Profile',
    personaDescription: 'Basic behavioral patterns visible. Model refining normal ranges across interaction dimensions.',
  };
  if (conf < 61) return {
    personaLabel: 'Developing Profile',
    personaDescription: 'Consistent patterns detected across several sessions. Normal ranges stabilising.',
  };
  if (conf < 81) return {
    personaLabel: match > 70 ? 'Reliable — Within Baseline' : 'Reliable — Anomaly Detected',
    personaDescription: match > 70
      ? 'Profile sufficiently mature for reliable comparison. Current session consistent with established norms.'
      : 'Reliable baseline exists. Current session shows measurable deviation from established behavior.',
  };
  return {
    personaLabel: match > 75 ? 'Mature Profile — Consistent' : drift > 25 ? 'Mature Profile — Drift Detected' : 'Mature Profile — Anomaly Flagged',
    personaDescription: match > 75
      ? 'High-confidence behavioral model active. Session closely matches established normal patterns.'
      : 'High-confidence baseline. Current session deviates from long-term behavioral norms.',
  };
}

/* ── Demo users ─────────────────────────────────────────────────────────── */

function seed(n: number, s: number) { return ((Math.sin(n * 127.1 + s * 311.7) * 43758.5453) % 1 + 1) % 1; }
function rng(s: number, min: number, max: number) { return min + seed(s, 1) * (max - min); }

interface SessionVec {
  typingSpeed: number;
  hesitation: number;
  errorRate: number;
  focusStability: number;
  sessionDuration: number;
  mouseSmoothing: number;
  correctionRate: number;
  scrollDepth: number;
}

function makeSessions(
  count: number,
  base: SessionVec,
  variance: SessionVec,
  anomalyLastSession?: Partial<SessionVec>,
): BehaviorSnapshot[] {
  return Array.from({ length: count }, (_, i) => {
    const isLast = i === count - 1;
    const anom = isLast && anomalyLastSession ? anomalyLastSession : {};
    const v = (key: keyof SessionVec, def: number) => {
      const b = (anom[key] !== undefined ? anom[key] : base[key]) as number;
      const va = (variance[key] as number);
      return Math.max(0, b + (seed(i * 7 + Object.keys(base).indexOf(key), 2) - 0.5) * 2 * va);
    };
    const ts = v('typingSpeed', 3.5);
    const he = v('hesitation', 2800);
    const er = v('errorRate', 0.08);
    const fo = v('focusStability', 0.92);
    const sd2 = v('sessionDuration', 42000);
    const ms2 = v('mouseSmoothing', 0.72);
    const cr = v('correctionRate', 0.08);
    const sc = v('scrollDepth', 72);
    const bk = Math.round(cr * 40);
    const tk = Math.max(bk + 5, 40);

    const daysAgo = (count - i) * 2;
    const ts2 = new Date(Date.now() - daysAgo * 86400000 + rng(i * 13, 0, 3600000));

    return {
      session_id: `SL-DEMO-${String(1000 + i).slice(1)}`,
      captured_at: ts2.toISOString(),
      analyst: 'demo',
      user_id: undefined,
      channel: 'web' as const,
      total_features: 62,
      metrics: {
        device: {
          screen_width: 1920, screen_height: 1080,
          viewport_width: 1440, viewport_height: 900,
          device_pixel_ratio: 2, color_depth: 24,
          platform: 'Win32', vendor: 'Google Inc.',
          touch_points_max: 0, user_agent: 'Mozilla/5.0',
          language: 'en-GB', languages: 'en-GB,en',
          timezone: 'Europe/Berlin', timezone_offset: -60,
          cpu_cores: 8, memory_gb: 16,
          local_hour: Math.round(rng(i, 9, 17)),
          local_day_of_week: Math.round(rng(i * 3, 1, 5)),
          connection_type: 'wifi', connection_speed: 50,
        },
        mouse: {
          move_count: Math.round(rng(i * 5, 80, 300)),
          click_count: Math.round(rng(i * 7, 4, 12)),
          dbl_click_count: 0, right_click_count: 0,
          velocity_mean: rng(i * 9, 200, 600),
          velocity_max: rng(i * 11, 800, 2000),
          velocity_std: rng(i * 13, 50, 200),
          acceleration_mean: rng(i * 15, 20, 80),
          idle_period_count: Math.round(rng(i * 17, 1, 6)),
          longest_idle_ms: rng(i * 19, 500, 3000),
          total_distance_px: rng(i * 21, 2000, 8000),
          path_efficiency: Math.max(0.1, Math.min(1, ms2)),
          tremor_index: rng(i * 23, 5, 25),
          direction_angle_std: rng(i * 25, 0.3, 1.2),
          curvature_mean: rng(i * 27, 0.1, 0.5),
          hover_duration_mean: rng(i * 29, 100, 500),
          last_x: 640, last_y: 400,
          overshoot_count: Math.round(rng(i * 31, 0, 4)),
          correction_count: Math.round(rng(i * 33, 0, 5)),
        },
        keyboard: {
          total_keys: tk,
          backspace_count: bk,
          typing_speed_cps: Math.max(0.3, ts),
          typing_speed_peak: Math.max(ts + 0.5, ts * 1.4),
          dwell_time_mean: rng(i * 37, 80, 200),
          dwell_time_std: rng(i * 39, 10, 50),
          flight_time_mean: rng(i * 41, 80, 300),
          flight_time_std: rng(i * 43, 20, 80),
          error_rate: Math.max(0, Math.min(1, er)),
          rhythm_consistency: Math.max(0.1, Math.min(1, 1 - er * 2)),
          burst_count: Math.round(rng(i * 45, 2, 8)),
          modifier_usage_ratio: rng(i * 47, 0.02, 0.12),
          long_pause_count: Math.round(rng(i * 49, 0, 5)),
        },
        clipboard: {
          paste_total: Math.round(rng(i * 51, 0, 2)),
          copy_total: 0, cut_total: 0, paste_fields: [],
        },
        attention: {
          tab_switch_count: Math.round(Math.max(0, (1 - fo) * 8)),
          total_time_away_ms: Math.round((1 - fo) * 8000),
          longest_absence_ms: Math.round((1 - fo) * 4000),
          window_resize_count: 0,
          blur_events: Math.round((1 - fo) * 5),
          focus_events: Math.round((1 - fo) * 5),
          visibility_changes: Math.round((1 - fo) * 3),
        },
        session: {
          first_interaction_ms: rng(i * 53, 800, 3000),
          field_order: ['amount', 'recipient', 'reference'],
          field_durations: { amount: 5000, recipient: 8000, reference: 4000 },
          field_revisions: { amount: 0, recipient: 0, reference: 0 },
          paste_vs_type_ratio: rng(i * 55, 0, 0.15),
          scroll_depth_pct: Math.max(0, Math.min(100, sc)),
          scroll_direction_changes: Math.round(rng(i * 57, 1, 6)),
          scroll_speed_mean: rng(i * 59, 100, 400),
          total_duration_ms: Math.max(5000, sd2),
          hesitation_before_submit_ms: Math.max(200, he),
          form_navigation_style: 'sequential',
        },
        events_per_second: rng(i * 61, 3, 12),
        raw_event_count: Math.round(rng(i * 63, 200, 1200)),
      },
    } satisfies BehaviorSnapshot;
  });
}

export const DEMO_USERS: { userId: string; displayName: string; sessions: BehaviorSnapshot[] }[] = [
  {
    userId: 'USR-DEMO-01',
    displayName: 'Sarah Kovacs',
    sessions: makeSessions(
      20,
      { typingSpeed: 4.1, hesitation: 2600, errorRate: 0.07, focusStability: 0.94, sessionDuration: 40000, mouseSmoothing: 0.78, correctionRate: 0.07, scrollDepth: 78 },
      { typingSpeed: 0.3, hesitation: 400,  errorRate: 0.03, focusStability: 0.04, sessionDuration: 5000,  mouseSmoothing: 0.06, correctionRate: 0.03, scrollDepth: 10 },
    ),
  },
  {
    userId: 'USR-DEMO-02',
    displayName: 'Thomas Vrabel',
    sessions: makeSessions(
      12,
      { typingSpeed: 3.2, hesitation: 3100, errorRate: 0.11, focusStability: 0.87, sessionDuration: 55000, mouseSmoothing: 0.65, correctionRate: 0.11, scrollDepth: 62 },
      { typingSpeed: 0.5, hesitation: 600,  errorRate: 0.05, focusStability: 0.07, sessionDuration: 8000,  mouseSmoothing: 0.09, correctionRate: 0.05, scrollDepth: 14 },
      // last session: elevated hesitation + slower typing (stressed)
      { typingSpeed: 2.1, hesitation: 9800, errorRate: 0.22, focusStability: 0.70, correctionRate: 0.24 },
    ),
  },
  {
    userId: 'USR-DEMO-03',
    displayName: 'Ingrid Hoffmann',
    sessions: makeSessions(
      5,
      { typingSpeed: 2.8, hesitation: 2200, errorRate: 0.14, focusStability: 0.80, sessionDuration: 35000, mouseSmoothing: 0.55, correctionRate: 0.13, scrollDepth: 55 },
      { typingSpeed: 0.7, hesitation: 800,  errorRate: 0.07, focusStability: 0.12, sessionDuration: 9000,  mouseSmoothing: 0.14, correctionRate: 0.07, scrollDepth: 18 },
    ),
  },
  {
    userId: 'USR-DEMO-04',
    displayName: 'Kai Nielsen',
    sessions: makeSessions(
      2,
      { typingSpeed: 3.5, hesitation: 2900, errorRate: 0.10, focusStability: 0.88, sessionDuration: 48000, mouseSmoothing: 0.70, correctionRate: 0.09, scrollDepth: 68 },
      { typingSpeed: 0.6, hesitation: 700,  errorRate: 0.05, focusStability: 0.10, sessionDuration: 7000,  mouseSmoothing: 0.10, correctionRate: 0.05, scrollDepth: 15 },
    ),
  },
];

/* ── Get profile for a userId from real + demo sources ──────────────────── */

export function getProfileSources(realSnapshots: BehaviorSnapshot[]): {
  userId: string; displayName?: string; sessions: BehaviorSnapshot[];
}[] {
  // Real captured sessions grouped by user_id
  const byUser = new Map<string, BehaviorSnapshot[]>();
  for (const s of realSnapshots) {
    const uid = s.user_id || 'USR-UNKNOWN';
    if (!byUser.has(uid)) byUser.set(uid, []);
    byUser.get(uid)!.push(s);
  }
  const real = Array.from(byUser.entries()).map(([uid, sessions]) => ({ userId: uid, sessions }));

  // Demo users
  const demo = DEMO_USERS.map(u => ({ userId: u.userId, displayName: u.displayName, sessions: u.sessions }));

  // Merge: real users first, then demo users not already in real
  const realIds = new Set(real.map(r => r.userId));
  return [...real, ...demo.filter(d => !realIds.has(d.userId))];
}
