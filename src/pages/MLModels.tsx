import { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ScatterChart, Scatter, Cell,
  LineChart, Line, ReferenceLine, RadarChart, PolarGrid,
  PolarAngleAxis, Radar,
} from 'recharts';
import {
  Brain, Upload, RefreshCw, CheckCircle2, AlertCircle,
  ChevronDown, ChevronUp, Activity, Database, Cpu, FlaskConical,
  Target, TrendingUp, ShieldCheck, Zap,
} from 'lucide-react';
import staticModelsData from '../data/mlModelsStatic.json';
import evalData from '../data/mlEvalData.json';

const API = '/api/ml';

const C = {
  accent: 'var(--accent)',
  accentD: 'var(--accent-d)',
  accentLt: 'var(--accent-lt)',
  green: 'var(--green)',
  red: 'var(--red)',
  orange: 'var(--orange)',
  yellow: 'var(--yellow)',
  blue: '#5B9BD5',
  muted: 'var(--t2)',
  t1: 'var(--t1)',
  t2: 'var(--t3)',
  t3: 'var(--t3)',
  bdr: 'var(--bdr)',
  surface: 'var(--surface)',
  card: 'var(--card)',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModelMeta {
  user_id: string;
  session_count: number;
  is_mature: boolean;
  threshold: number;
  feature_names: string[];
  score_min: number | null;
  score_max: number | null;
}

interface ModelsResponse {
  models: ModelMeta[];
  summary: { total: number; mature: number; immature: number; avg_sessions: number; avg_threshold: number };
  session_histogram: { range: string; count: number }[];
  threshold_histogram: { range: string; count: number }[];
}

interface TrainResult {
  status: string;
  trained: number;
  skipped: number;
  skipped_users: string[];
  feature_columns: string[];
  elapsed_seconds: number;
  total_sessions: number;
  unique_users: number;
  charts?: { risk_distribution?: string; confusion_matrix?: string; threshold_distribution?: string };
  metrics?: {
    roc_auc: number | null;
    precision_fraud: number;
    recall_fraud: number;
    f1_fraud: number;
    precision_legit: number;
    recall_legit: number;
    accuracy: number;
    total_sessions: number;
    fraud_sessions: number;
    legit_sessions: number;
  };
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function Badge({ mature }: { mature: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 7px',
      fontSize: '10px', fontFamily: 'JetBrains Mono', fontWeight: 600, letterSpacing: '0.08em',
      background: mature ? 'rgba(0,204,122,0.1)' : 'rgba(255,184,0,0.1)',
      color: mature ? C.green : C.yellow,
      border: `1px solid ${mature ? 'rgba(0,204,122,0.2)' : 'rgba(255,184,0,0.2)'}`,
    }}>
      {mature ? 'MATURE' : 'BUILDING'}
    </span>
  );
}

function KPI({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.bdr}`, padding: '14px 18px', flex: 1, minWidth: 110 }}>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: C.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '20px', fontWeight: 700, color: accent ?? C.t1 }}>{value}</div>
      {sub && <div style={{ fontFamily: 'Inter', fontSize: '10px', color: C.muted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function ChartCard({ title, subtitle, icon: Icon, children, span2 }: {
  title: string; subtitle?: string; icon?: React.ElementType; children: React.ReactNode; span2?: boolean;
}) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.bdr}`, padding: '14px 16px',
      gridColumn: span2 ? '1 / -1' : undefined,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
        {Icon && <Icon size={13} color={C.accent} />}
        <span style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 500, color: C.t1 }}>{title}</span>
        {subtitle && <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: C.muted, marginLeft: 4 }}>{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.bdr}`, padding: '8px 12px', fontFamily: 'JetBrains Mono', fontSize: '11px', minWidth: 130 }}>
      {label !== undefined && <div style={{ color: C.muted, marginBottom: 5, fontSize: '10px' }}>{label}</div>}
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 2 }}>
          <span style={{ color: p.color ?? p.fill ?? C.accent }}>{p.name}</span>
          <span style={{ color: C.t1 }}>{formatter ? formatter(p.value, p.name) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

function Section({ title, icon: Icon, children, defaultOpen = true }: {
  title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: C.card, border: `1px solid ${C.bdr}`, marginBottom: 12 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
        borderBottom: open ? `1px solid ${C.bdr}` : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={14} color={C.accent} />
          <span style={{ fontFamily: 'Inter', fontSize: '13px', fontWeight: 500, color: C.t1 }}>{title}</span>
        </div>
        {open ? <ChevronUp size={13} color={C.muted} /> : <ChevronDown size={13} color={C.muted} />}
      </button>
      {open && <div style={{ padding: '16px' }}>{children}</div>}
    </div>
  );
}

// ─── Confusion Matrix component ───────────────────────────────────────────────

function ConfusionMatrix({ cm }: { cm: number[][] }) {
  const [[tn, fp], [fn, tp]] = cm;
  const total = tn + fp + fn + tp;
  const CM = {
    green:  { hex: '#00CC7A', bg: 'rgba(0,204,122,0.07)',   bdr: 'rgba(0,204,122,0.2)'  },
    red:    { hex: '#FF3B5C', bg: 'rgba(255,59,92,0.07)',   bdr: 'rgba(255,59,92,0.2)'  },
    orange: { hex: '#FF8C00', bg: 'rgba(255,140,0,0.07)',   bdr: 'rgba(255,140,0,0.2)'  },
    blue:   { hex: '#5B9BD5', bg: 'rgba(91,155,213,0.07)',  bdr: 'rgba(91,155,213,0.2)' },
  };
  const cells = [
    { label: 'True Neg',  value: tn, pct: tn / total, cm: CM.green  },
    { label: 'False Pos', value: fp, pct: fp / total, cm: CM.red    },
    { label: 'False Neg', value: fn, pct: fn / total, cm: CM.orange },
    { label: 'True Pos',  value: tp, pct: tp / total, cm: CM.blue   },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      {/* Axis labels */}
      <div style={{ display: 'flex', gap: 4, fontFamily: 'JetBrains Mono', fontSize: '9px', color: C.muted, letterSpacing: '0.1em', marginLeft: 60 }}>
        <div style={{ width: 120, textAlign: 'center' }}>PREDICTED LEGIT</div>
        <div style={{ width: 120, textAlign: 'center' }}>PREDICTED FRAUD</div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {/* Row labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center', width: 56 }}>
          <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8 }}>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: C.muted, letterSpacing: '0.1em', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>TRUE LEGIT</span>
          </div>
          <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8 }}>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: C.muted, letterSpacing: '0.1em', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>TRUE FRAUD</span>
          </div>
        </div>
        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '120px 120px', gap: 4 }}>
          {cells.map(cell => (
            <div key={cell.label} style={{
              height: 100, background: cell.cm.bg,
              border: `1px solid ${cell.cm.bdr}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '24px', fontWeight: 700, color: cell.cm.hex }}>{cell.value.toLocaleString()}</div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted }}>{(cell.pct * 100).toFixed(1)}%</div>
              <div style={{ fontFamily: 'Inter', fontSize: '10px', color: C.t2 }}>{cell.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ROC curve approximation from risk score distribution ─────────────────────

function buildROCPoints(dist: { bin: string; legitimate: number; fraud: number }[]) {
  const pts: { fpr: number; tpr: number }[] = [];
  const totalLeg = dist.reduce((s, d) => s + d.legitimate, 0);
  const totalFrd = dist.reduce((s, d) => s + d.fraud, 0);
  // sweep threshold from high to low
  for (let i = dist.length; i >= 0; i--) {
    const fp = dist.slice(i).reduce((s, d) => s + d.legitimate, 0);
    const tp = dist.slice(i).reduce((s, d) => s + d.fraud, 0);
    pts.push({ fpr: parseFloat((fp / totalLeg).toFixed(4)), tpr: parseFloat((tp / totalFrd).toFixed(4)) });
  }
  return pts;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MLModels() {
  const [tab, setTab] = useState<'registry' | 'train' | 'charts'>('registry');
  const [data, setData] = useState<ModelsResponse>(staticModelsData as ModelsResponse);
  const [loading, setLoading] = useState(false);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [offlineBanner, setOfflineBanner] = useState(false);

  const [trainFile, setTrainFile] = useState<File | null>(null);
  const [contamination, setContamination] = useState(0.05);
  const [minSessions, setMinSessions] = useState(5);
  const [training, setTraining] = useState(false);
  const [trainResult, setTrainResult] = useState<TrainResult | null>(null);
  const [trainError, setTrainError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'user_id' | 'session_count' | 'threshold' | 'accuracy'>('user_id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  // ── Chart data from embedded JSON ──────────────────────────────────────────
  const gm = evalData.global_metrics;
  const rocPoints = buildROCPoints(evalData.risk_distribution);

  // Per-user accuracy bar data (bottom 20 + top 20)
  const perUserSorted = [...evalData.per_user_stats].sort((a, b) => a.accuracy - b.accuracy);
  const perUserChart = perUserSorted.map(u => ({
    id: u.user_id,
    accuracy: Math.round(u.accuracy * 100),
    threshold: u.threshold,
  }));

  // Feature comparison radar
  const featureRadar = Object.entries(evalData.feature_stats as Record<string, { legit_mean: number; fraud_mean: number; legit_std: number; fraud_std: number }>).map(([feat, stats]) => ({
    feature: feat.replace('_avg', '').toUpperCase(),
    legitimate: parseFloat((stats.legit_mean / (stats.legit_mean + stats.fraud_mean + 1e-9) * 100).toFixed(1)),
    fraud: parseFloat((stats.fraud_mean / (stats.legit_mean + stats.fraud_mean + 1e-9) * 100).toFixed(1)),
  }));

  // Risk separation per user (top 15 best separated)
  const separation = evalData.per_user_stats
    .filter((u: any) => u.avg_legit_risk !== null && u.avg_fraud_risk !== null)
    .map((u: any) => ({ id: u.user_id, legit: u.avg_legit_risk, fraud: u.avg_fraud_risk, gap: parseFloat((u.avg_fraud_risk - u.avg_legit_risk).toFixed(3)) }))
    .sort((a: any, b: any) => b.gap - a.gap)
    .slice(0, 20);

  // Accuracy distribution histogram
  const accHist = Array.from({ length: 10 }, (_, i) => {
    const lo = i * 10, hi = lo + 10;
    return { range: `${lo}–${hi}%`, count: evalData.per_user_stats.filter((u: any) => u.accuracy * 100 >= lo && u.accuracy * 100 < hi).length };
  });

  // ── Server check ───────────────────────────────────────────────────────────
  async function checkServer() {
    try {
      const r = await fetch(`${API}/status`);
      setServerOnline(r.ok);
    } catch {
      setServerOnline(false);
    }
  }

  async function fetchModels() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/models`);
      if (!r.ok) throw new Error('offline');
      setData(await r.json());
      setOfflineBanner(false);
    } catch {
      setData(staticModelsData as ModelsResponse);
      setOfflineBanner(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkServer();
    fetchModels();
  }, []);

  // ── Training ───────────────────────────────────────────────────────────────
  async function runTraining() {
    if (!trainFile) return;
    setTraining(true); setTrainError(null); setTrainResult(null);
    const form = new FormData();
    form.append('file', trainFile);
    form.append('contamination', String(contamination));
    form.append('min_sessions', String(minSessions));
    try {
      const r = await fetch(`${API}/train`, { method: 'POST', body: form });
      const json = await r.json();
      if (!r.ok) throw new Error(json.detail || `HTTP ${r.status}`);
      setTrainResult(json);
      await fetchModels();
    } catch (e: any) {
      setTrainError(e.message);
    } finally {
      setTraining(false);
    }
  }

  // ── Sort / filter ──────────────────────────────────────────────────────────
  const perUserWithAcc = data.models.map(m => {
    const stat = (evalData.per_user_stats as any[]).find((s: any) => s.user_id === m.user_id);
    return { ...m, accuracy: stat?.accuracy ?? null };
  });

  const filteredModels = perUserWithAcc
    .filter(m => m.user_id.includes(search) || search === '')
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'user_id') return a.user_id.localeCompare(b.user_id) * dir;
      if (sortBy === 'session_count') return (a.session_count - b.session_count) * dir;
      if (sortBy === 'threshold') return (a.threshold - b.threshold) * dir;
      if (sortBy === 'accuracy') return ((a.accuracy ?? 0) - (b.accuracy ?? 0)) * dir;
      return 0;
    });

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  }

  const TH = ({ col, label }: { col: typeof sortBy; label: string }) => (
    <div onClick={() => toggleSort(col)} style={{ cursor: 'pointer', userSelect: 'none' }}>
      {label}{sortBy === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '20px 24px', maxWidth: 1140 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Brain size={18} color={C.accent} />
          <div>
            <h1 style={{ fontFamily: 'Inter', fontSize: '16px', fontWeight: 600, color: C.t1, margin: 0 }}>ML Model Registry</h1>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted, marginTop: 2 }}>
              Isolation Forest · per-user behavioural anomaly detection · 88 users · 1 760 sessions
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: serverOnline ? C.green : (serverOnline === null ? C.muted : C.red),
              boxShadow: serverOnline ? `0 0 6px ${C.green}` : 'none',
            }} />
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: C.muted }}>
              {serverOnline === null ? 'CHECKING…' : serverOnline ? 'SERVER LIVE' : 'SERVER OFFLINE'}
            </span>
          </div>
          <button onClick={() => { fetchModels(); checkServer(); }} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
            background: 'none', border: `1px solid ${C.bdr}`, cursor: 'pointer',
            color: C.muted, fontFamily: 'Inter', fontSize: '12px',
          }}>
            <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {offlineBanner && (
        <div style={{ background: 'rgba(255,184,0,0.07)', border: `1px solid rgba(255,184,0,0.2)`, padding: '9px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={13} color={C.yellow} />
          <span style={{ fontFamily: 'Inter', fontSize: '12px', color: C.yellow }}>
            ML server offline — showing static snapshot. Run <code style={{ fontFamily: 'JetBrains Mono' }}>./start-server.sh</code> locally to enable live training.
          </span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: `1px solid ${C.bdr}` }}>
        {(['registry', 'charts', 'train'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'Inter', fontSize: '12px', fontWeight: tab === t ? 500 : 400,
            color: tab === t ? C.accentLt : C.muted,
            borderBottom: tab === t ? `2px solid ${C.accentD}` : '2px solid transparent',
            marginBottom: -1,
          }}>
            {t === 'registry' ? 'Model Registry' : t === 'charts' ? 'Evaluation Charts' : 'Train / Upload'}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          REGISTRY TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'registry' && (
        <div>
          {/* KPIs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <KPI label="Total Models" value={data.summary.total} sub="per-user IF" />
            <KPI label="Mature" value={data.summary.mature} accent={C.green} sub="≥5 sessions" />
            <KPI label="Avg Sessions" value={data.summary.avg_sessions} sub="per model" />
            <KPI label="Avg Threshold" value={data.summary.avg_threshold} sub="anomaly boundary" />
            <KPI label="ROC-AUC" value={gm.roc_auc} accent={C.accent} sub="on 1760 sessions" />
            <KPI label="F1 Fraud" value={gm.f1_fraud} accent={C.blue} sub="fraud detection" />
          </div>

          {/* Mini charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <ChartCard title="Sessions per Model" icon={Database}>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={data.session_histogram} margin={{ top: 0, right: 0, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.bdr} vertical={false} />
                  <XAxis dataKey="range" tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: C.muted }} />
                  <YAxis tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: C.muted }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="models" radius={[2, 2, 0, 0]}>
                    {data.session_histogram.map((_, i) => <Cell key={i} fill={C.accent} fillOpacity={0.75} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Threshold Distribution" icon={Target}>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={data.threshold_histogram} margin={{ top: 0, right: 0, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.bdr} vertical={false} />
                  <XAxis dataKey="range" tick={{ fontFamily: 'JetBrains Mono', fontSize: 8, fill: C.muted }} />
                  <YAxis tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: C.muted }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="models" radius={[2, 2, 0, 0]}>
                    {data.threshold_histogram.map((_, i) => <Cell key={i} fill={C.accentLt} fillOpacity={0.7} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Model table */}
          <div style={{ background: C.card, border: `1px solid ${C.bdr}` }}>
            <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.bdr}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                placeholder="Search user ID…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  background: C.surface, border: `1px solid ${C.bdr}`, color: C.t1,
                  padding: '5px 10px', fontFamily: 'JetBrains Mono', fontSize: '11px', outline: 'none', width: 180,
                }}
              />
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted }}>
                {filteredModels.length} of {data.models.length}
              </span>
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: '90px 80px 80px 80px 80px 1fr',
              padding: '7px 16px', borderBottom: `1px solid ${C.bdr}`,
              fontFamily: 'JetBrains Mono', fontSize: '9px', color: C.muted, letterSpacing: '0.08em',
            }}>
              <TH col="user_id" label="USER ID" />
              <TH col="session_count" label="SESSIONS" />
              <TH col="threshold" label="THRESHOLD" />
              <TH col="accuracy" label="ACCURACY" />
              <div>STATUS</div>
              <div>FEATURES</div>
            </div>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {filteredModels.map(m => (
                <div key={m.user_id}>
                  <div
                    onClick={() => setExpandedUser(expandedUser === m.user_id ? null : m.user_id)}
                    style={{ display: 'grid', gridTemplateColumns: '90px 80px 80px 80px 80px 1fr', padding: '9px 16px', borderBottom: `1px solid ${C.bdr}`, cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: C.accentLt }}>{m.user_id}</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: C.t1 }}>{m.session_count}</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: C.t1 }}>{m.threshold}</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: m.accuracy !== null && m.accuracy >= 0.8 ? C.green : m.accuracy !== null && m.accuracy >= 0.6 ? C.yellow : C.red }}>
                      {m.accuracy !== null ? (m.accuracy * 100).toFixed(1) + '%' : '—'}
                    </div>
                    <div><Badge mature={m.is_mature} /></div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted }}>{m.feature_names.join(', ')}</div>
                  </div>
                  {expandedUser === m.user_id && (() => {
                    const stat = (evalData.per_user_stats as any[]).find((s: any) => s.user_id === m.user_id);
                    return (
                      <div style={{ padding: '12px 16px 14px', background: 'rgba(170,85,227,0.03)', borderBottom: `1px solid ${C.bdr}` }}>
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                          {[
                            ['Sessions', m.session_count],
                            ['Threshold', m.threshold],
                            ['Accuracy', stat ? (stat.accuracy * 100).toFixed(1) + '%' : '—'],
                            ['True Pos', stat?.tp ?? '—'],
                            ['True Neg', stat?.tn ?? '—'],
                            ['False Pos', stat?.fp ?? '—'],
                            ['False Neg', stat?.fn ?? '—'],
                            ['Avg Legit Risk', stat?.avg_legit_risk ?? '—'],
                            ['Avg Fraud Risk', stat?.avg_fraud_risk ?? '—'],
                          ].map(([k, v]) => (
                            <div key={k as string}>
                              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>{k}</div>
                              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: C.t1 }}>{v}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          EVALUATION CHARTS TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'charts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Row 1: Global metrics */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { label: 'ROC-AUC', value: gm.roc_auc, icon: TrendingUp, accent: C.accent },
              { label: 'Accuracy', value: (gm.accuracy * 100).toFixed(1) + '%', icon: ShieldCheck, accent: C.green },
              { label: 'Fraud Recall', value: (gm.recall_fraud * 100).toFixed(1) + '%', icon: Target, accent: C.blue },
              { label: 'Fraud Precision', value: (gm.precision_fraud * 100).toFixed(1) + '%', icon: Zap, accent: C.accentLt },
              { label: 'F1 Score', value: gm.f1_fraud, icon: Activity, accent: C.yellow },
              { label: 'Total Sessions', value: gm.total_sessions.toLocaleString(), icon: Database, accent: C.muted },
              { label: 'Users', value: gm.total_users, icon: Brain, accent: C.muted },
            ].map(({ label, value, icon: Icon, accent }) => (
              <div key={label} style={{ background: C.card, border: `1px solid ${C.bdr}`, padding: '12px 16px', flex: 1, minWidth: 110 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <Icon size={11} color={accent} />
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
                </div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '18px', fontWeight: 700, color: accent }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Row 2: Risk Distribution + Confusion Matrix */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 12 }}>
            <ChartCard title="Risk Score Distribution" subtitle="legitimate vs fraud · 1760 sessions" icon={Activity}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={evalData.risk_distribution} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barCategoryGap="10%">
                  <CartesianGrid strokeDasharray="3 3" stroke={C.bdr} vertical={false} />
                  <XAxis dataKey="bin" tick={{ fontFamily: 'JetBrains Mono', fontSize: 8, fill: C.muted }} interval={3} />
                  <YAxis tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: C.muted }} />
                  <Tooltip content={<CustomTooltip label="Risk ≥" />} />
                  <Legend wrapperStyle={{ fontFamily: 'Inter', fontSize: '11px', paddingTop: 8 }} />
                  <ReferenceLine x="0.65" stroke={C.yellow} strokeDasharray="4 3" strokeWidth={1.5} label={{ value: 'threshold', fill: C.yellow, fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                  <Bar dataKey="legitimate" name="Legitimate" fill={C.blue} fillOpacity={0.75} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="fraud" name="Fraud" fill={C.red} fillOpacity={0.75} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Confusion Matrix" subtitle="global · all 88 users" icon={Target}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 8 }}>
                <ConfusionMatrix cm={gm.confusion_matrix as number[][]} />
              </div>
            </ChartCard>
          </div>

          {/* Row 3: ROC Curve + Accuracy Distribution */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <ChartCard title="ROC Curve" subtitle={`AUC = ${gm.roc_auc}`} icon={TrendingUp}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={rocPoints} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.bdr} />
                  <XAxis dataKey="fpr" type="number" domain={[0, 1]} tickCount={6}
                    tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: C.muted }}
                    label={{ value: 'False Positive Rate', position: 'insideBottom', offset: -2, fill: C.muted, fontSize: 10, fontFamily: 'Inter' }} />
                  <YAxis type="number" domain={[0, 1]} tickCount={6}
                    tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: C.muted }}
                    label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft', offset: 12, fill: C.muted, fontSize: 10, fontFamily: 'Inter' }} />
                  <Tooltip content={<CustomTooltip formatter={(v: number) => v.toFixed(3)} />} />
                  {/* Diagonal baseline */}
                  <Line data={[{ fpr: 0, tpr: 0 }, { fpr: 1, tpr: 1 }]} dataKey="tpr" stroke={C.t3} strokeDasharray="4 3" dot={false} strokeWidth={1} name="Random" />
                  <Line dataKey="tpr" stroke={C.accent} strokeWidth={2} dot={false} name="Model" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Accuracy Distribution" subtitle="across 88 users" icon={ShieldCheck}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={accHist} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.bdr} vertical={false} />
                  <XAxis dataKey="range" tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: C.muted }} />
                  <YAxis tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: C.muted }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="users" radius={[2, 2, 0, 0]}>
                    {accHist.map((d, i) => (
                      <Cell key={i} fill={
                        parseInt(d.range) >= 80 ? C.green :
                        parseInt(d.range) >= 60 ? C.yellow : C.red
                      } fillOpacity={0.78} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Row 4: Per-user accuracy bar + Risk separation */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <ChartCard title="Per-User Accuracy" subtitle="all 88 users sorted" icon={ShieldCheck}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={perUserChart} margin={{ top: 4, right: 8, left: -22, bottom: 0 }} barSize={5}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.bdr} vertical={false} />
                  <XAxis dataKey="id" tick={false} />
                  <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: C.muted }} />
                  <Tooltip content={<CustomTooltip formatter={(v: number, n: string) => n === 'accuracy' ? v + '%' : v} />} />
                  <ReferenceLine y={76} stroke={C.yellow} strokeDasharray="4 3" label={{ value: 'avg 76%', fill: C.yellow, fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                  <Bar dataKey="accuracy" name="accuracy" radius={[2, 2, 0, 0]}>
                    {perUserChart.map((d, i) => (
                      <Cell key={i} fill={d.accuracy >= 80 ? C.green : d.accuracy >= 60 ? C.yellow : C.red} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Risk Separation — Top 20 Users" subtitle="avg legitimate vs fraud risk score" icon={Zap}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={separation} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }} barSize={7}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.bdr} horizontal={false} />
                  <XAxis type="number" domain={[0, 1]} tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: C.muted }} />
                  <YAxis type="category" dataKey="id" tick={{ fontFamily: 'JetBrains Mono', fontSize: 8, fill: C.muted }} width={36} />
                  <Tooltip content={<CustomTooltip formatter={(v: number) => v.toFixed(3)} />} />
                  <Legend wrapperStyle={{ fontFamily: 'Inter', fontSize: '10px' }} />
                  <Bar dataKey="legit" name="Legit risk" fill={C.blue} fillOpacity={0.8} radius={[0, 2, 2, 0]} />
                  <Bar dataKey="fraud" name="Fraud risk" fill={C.red} fillOpacity={0.8} radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Row 5: Feature comparison radar + Threshold vs Accuracy scatter */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 12 }}>
            <ChartCard title="Feature Profile" subtitle="legit vs fraud (normalised)" icon={Brain}>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={featureRadar} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke={C.bdr} />
                  <PolarAngleAxis dataKey="feature" tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: C.muted }} />
                  <Radar name="Legitimate" dataKey="legitimate" stroke={C.blue} fill={C.blue} fillOpacity={0.25} />
                  <Radar name="Fraud" dataKey="fraud" stroke={C.red} fill={C.red} fillOpacity={0.25} />
                  <Legend wrapperStyle={{ fontFamily: 'Inter', fontSize: '11px' }} />
                  <Tooltip content={<CustomTooltip formatter={(v: number) => v.toFixed(1) + '%'} />} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Threshold vs Accuracy — Scatter" subtitle="each dot = 1 user" icon={Target}>
              <ResponsiveContainer width="100%" height={220}>
                <ScatterChart margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.bdr} />
                  <XAxis type="number" dataKey="threshold" name="Threshold" domain={[0.4, 0.9]}
                    tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: C.muted }}
                    label={{ value: 'Threshold', position: 'insideBottom', offset: -2, fill: C.muted, fontSize: 10, fontFamily: 'Inter' }} />
                  <YAxis type="number" dataKey="accuracy" name="Accuracy" domain={[0, 1]}
                    tickFormatter={v => `${Math.round(v * 100)}%`}
                    tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: C.muted }} />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3', stroke: C.bdr }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div style={{ background: C.surface, border: `1px solid ${C.bdr}`, padding: '8px 12px', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>
                          <div style={{ color: C.accentLt, marginBottom: 4 }}>user {d?.user_id}</div>
                          <div style={{ color: C.muted }}>threshold: <span style={{ color: C.t1 }}>{d?.threshold}</span></div>
                          <div style={{ color: C.muted }}>accuracy: <span style={{ color: C.t1 }}>{(d?.accuracy * 100).toFixed(1)}%</span></div>
                        </div>
                      );
                    }}
                  />
                  <Scatter
                    data={evalData.threshold_vs_accuracy as any[]}
                    fill={C.accent}
                    fillOpacity={0.7}
                    r={4}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Row 6: Per-user threshold bar chart */}
          <ChartCard title="Per-User Anomaly Thresholds" subtitle="auto-calibrated · mean + 0.5×std of training risk" icon={Target}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={evalData.per_user_stats.map((u: any) => ({ id: u.user_id, threshold: u.threshold }))}
                margin={{ top: 4, right: 8, left: -22, bottom: 0 }}
                barSize={6}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={C.bdr} vertical={false} />
                <XAxis dataKey="id" tick={false} />
                <YAxis domain={[0.3, 0.9]} tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: C.muted }} />
                <Tooltip content={<CustomTooltip formatter={(v: number) => v.toFixed(3)} />} />
                <ReferenceLine y={gm.roc_auc > 0 ? data.summary.avg_threshold : 0.65} stroke={C.yellow} strokeDasharray="4 3"
                  label={{ value: `avg ${data.summary.avg_threshold}`, fill: C.yellow, fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                <Bar dataKey="threshold" name="threshold" radius={[2, 2, 0, 0]}>
                  {evalData.per_user_stats.map((_: any, i: number) => (
                    <Cell key={i} fill={C.accentLt} fillOpacity={0.65} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TRAIN TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'train' && (
        <div style={{ maxWidth: 720 }}>
          <Section title="Dataset Upload" icon={Database}>
            <div style={{ marginBottom: 12, fontFamily: 'Inter', fontSize: '12px', color: C.muted, lineHeight: 1.7 }}>
              Upload <strong style={{ color: C.t1 }}>CSV</strong>, <strong style={{ color: C.t1 }}>XLSX</strong>, or <strong style={{ color: C.t1 }}>JSON</strong>.
              Required: <code style={{ fontFamily: 'JetBrains Mono', color: C.accentLt }}>user_id</code>,{' '}
              <code style={{ fontFamily: 'JetBrains Mono', color: C.accentLt }}>label</code> (1=legit, 0=fraud) + numeric feature columns.
            </div>
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); setTrainFile(e.dataTransfer.files[0] ?? null); }}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${trainFile ? C.accent : C.bdr}`,
                background: trainFile ? 'rgba(170,85,227,0.05)' : 'transparent',
                padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
                transition: 'border 0.15s, background 0.15s', marginBottom: 16,
              }}
            >
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.json" style={{ display: 'none' }}
                onChange={e => setTrainFile(e.target.files?.[0] ?? null)} />
              {trainFile ? (
                <div>
                  <CheckCircle2 size={20} color={C.green} style={{ marginBottom: 6 }} />
                  <div style={{ fontFamily: 'Inter', fontSize: '13px', color: C.t1, fontWeight: 500 }}>{trainFile.name}</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted, marginTop: 4 }}>
                    {(trainFile.size / 1024).toFixed(1)} KB · click to replace
                  </div>
                </div>
              ) : (
                <div>
                  <Upload size={20} color={C.muted} style={{ marginBottom: 6 }} />
                  <div style={{ fontFamily: 'Inter', fontSize: '13px', color: C.muted }}>Drag & drop or click to select</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.t3, marginTop: 4 }}>CSV · XLSX · JSON</div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              {[
                { label: 'CONTAMINATION', val: contamination, set: setContamination, min: 0.01, max: 0.5, step: 0.01, hint: 'Expected fraud ratio' },
                { label: 'MIN SESSIONS', val: minSessions, set: (v: number) => setMinSessions(v), min: 1, max: 50, step: 1, hint: 'Min legit sessions to train' },
              ].map(({ label, val, set, min, max, step, hint }) => (
                <div key={label}>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted, letterSpacing: '0.1em', marginBottom: 4 }}>{label}</div>
                  <input type="number" min={min} max={max} step={step} value={val}
                    onChange={e => set(parseFloat(e.target.value) as any)}
                    style={{ background: C.surface, border: `1px solid ${C.bdr}`, color: C.t1, padding: '6px 10px', fontFamily: 'JetBrains Mono', fontSize: '12px', outline: 'none', width: 90 }} />
                  <div style={{ fontFamily: 'Inter', fontSize: '10px', color: C.muted, marginTop: 3 }}>{hint}</div>
                </div>
              ))}
            </div>

            <button onClick={runTraining} disabled={!trainFile || training || !serverOnline} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
              background: trainFile && !training && serverOnline ? C.accent : C.t3,
              color: '#fff', border: 'none', cursor: trainFile && !training && serverOnline ? 'pointer' : 'not-allowed',
              fontFamily: 'Inter', fontSize: '13px', fontWeight: 500,
            }}>
              {training ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Cpu size={14} />}
              {training ? 'Training…' : 'Train Models'}
            </button>
            {!serverOnline && (
              <div style={{ marginTop: 10, fontFamily: 'Inter', fontSize: '11px', color: C.orange }}>
                Start ML server: <code style={{ fontFamily: 'JetBrains Mono' }}>./start-server.sh</code>
              </div>
            )}
          </Section>

          {trainError && (
            <div style={{ background: 'rgba(255,59,92,0.08)', border: `1px solid rgba(255,59,92,0.2)`, padding: '10px 16px', marginBottom: 12 }}>
              <AlertCircle size={13} color={C.red} style={{ marginRight: 8, verticalAlign: 'middle' }} />
              <span style={{ color: C.red, fontFamily: 'Inter', fontSize: '12px' }}>{trainError}</span>
            </div>
          )}

          {trainResult && (
            <Section title="Training Results" icon={FlaskConical}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {[['Models Trained', trainResult.trained], ['Skipped', trainResult.skipped],
                  ['Sessions', trainResult.total_sessions], ['Users', trainResult.unique_users],
                  ['Time', `${trainResult.elapsed_seconds}s`]].map(([l, v]) => (
                  <KPI key={l as string} label={l as string} value={v as string | number} />
                ))}
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Features detected</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {trainResult.feature_columns.map(f => (
                    <span key={f} style={{ padding: '3px 8px', background: 'rgba(170,85,227,0.1)', border: `1px solid rgba(170,85,227,0.2)`, color: C.accentLt, fontFamily: 'JetBrains Mono', fontSize: '11px' }}>{f}</span>
                  ))}
                </div>
              </div>

              {trainResult.metrics && (
                <div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Evaluation metrics</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                    {[
                      ['ROC-AUC', trainResult.metrics.roc_auc?.toFixed(4) ?? 'N/A'],
                      ['Accuracy', (trainResult.metrics.accuracy * 100).toFixed(1) + '%'],
                      ['Fraud Recall', (trainResult.metrics.recall_fraud * 100).toFixed(1) + '%'],
                      ['Fraud F1', trainResult.metrics.f1_fraud.toFixed(4)],
                    ].map(([l, v]) => (
                      <div key={l as string} style={{ background: C.surface, border: `1px solid ${C.bdr}`, padding: '10px 12px' }}>
                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: C.muted, letterSpacing: '0.1em', marginBottom: 4 }}>{l}</div>
                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '16px', fontWeight: 700, color: C.t1 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {trainResult.charts && (
                <div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Training charts</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {trainResult.charts.risk_distribution && (
                      <div style={{ background: C.surface, border: `1px solid ${C.bdr}`, padding: 8 }}>
                        <div style={{ fontFamily: 'Inter', fontSize: '11px', color: C.muted, marginBottom: 6 }}>Risk Score Distribution</div>
                        <img src={`data:image/png;base64,${trainResult.charts.risk_distribution}`} style={{ width: '100%' }} alt="Risk distribution" />
                      </div>
                    )}
                    {trainResult.charts.confusion_matrix && (
                      <div style={{ background: C.surface, border: `1px solid ${C.bdr}`, padding: 8 }}>
                        <div style={{ fontFamily: 'Inter', fontSize: '11px', color: C.muted, marginBottom: 6 }}>Confusion Matrix</div>
                        <img src={`data:image/png;base64,${trainResult.charts.confusion_matrix}`} style={{ width: '100%' }} alt="Confusion matrix" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Section>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
