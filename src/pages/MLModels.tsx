import { useState, useEffect, useRef } from 'react';
import staticModelsData from '../data/mlModelsStatic.json';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  Brain, Upload, RefreshCw, CheckCircle2, AlertCircle,
  ChevronDown, ChevronUp, Activity, Database, Cpu,
} from 'lucide-react';

const API = '/api/ml';

const C = {
  accent: '#AA55E3',
  accentD: '#9944CC',
  accentLt: '#C890F0',
  green: '#00CC7A',
  red: '#FF3B5C',
  orange: '#FF8C00',
  yellow: '#FFB800',
  muted: '#6B6B7A',
  t1: '#E8E8ED',
  t3: '#4A4A5A',
  bdr: '#1E1E22',
  surface: '#0F0F12',
  card: '#111115',
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
  summary: {
    total: number;
    mature: number;
    immature: number;
    avg_sessions: number;
    avg_threshold: number;
  };
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
  charts?: {
    risk_distribution?: string;
    confusion_matrix?: string;
    threshold_distribution?: string;
  };
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

// ─── Small helpers ────────────────────────────────────────────────────────────

function Badge({ mature }: { mature: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 7px', fontSize: '10px', fontFamily: 'JetBrains Mono',
      fontWeight: 600, letterSpacing: '0.08em',
      background: mature ? 'rgba(0,204,122,0.1)' : 'rgba(255,184,0,0.1)',
      color: mature ? C.green : C.yellow,
      border: `1px solid ${mature ? 'rgba(0,204,122,0.2)' : 'rgba(255,184,0,0.2)'}`,
    }}>
      {mature ? 'MATURE' : 'BUILDING'}
    </span>
  );
}

function KPI({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.bdr}`, padding: '14px 18px', flex: 1, minWidth: 120,
    }}>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '22px', fontWeight: 700, color: C.t1 }}>{value}</div>
      {sub && <div style={{ fontFamily: 'Inter', fontSize: '11px', color: C.muted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function ChartTooltipCustom({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.bdr}`, padding: '8px 12px', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>
      <div style={{ color: C.muted, marginBottom: 4 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: C.t1 }}>{p.value} users</div>
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
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
          borderBottom: open ? `1px solid ${C.bdr}` : 'none',
        }}
      >
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function MLModels() {
  const [tab, setTab] = useState<'registry' | 'train' | 'charts'>('registry');
  const [data, setData] = useState<ModelsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

  const [trainFile, setTrainFile] = useState<File | null>(null);
  const [contamination, setContamination] = useState(0.05);
  const [minSessions, setMinSessions] = useState(5);
  const [training, setTraining] = useState(false);
  const [trainResult, setTrainResult] = useState<TrainResult | null>(null);
  const [trainError, setTrainError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'user_id' | 'session_count' | 'threshold'>('user_id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const [evalCharts, setEvalCharts] = useState<Record<string, string>>({});

  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // ── Check server + load models ─────────────────────────────────────────────
  async function fetchStatus() {
    try {
      const r = await fetch(`${API}/status`);
      setServerOnline(r.ok);
    } catch {
      setServerOnline(false);
    }
  }

  async function fetchModels() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API}/models`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch (e: any) {
      // Fall back to static snapshot embedded at build time
      setData(staticModelsData as ModelsResponse);
      setError('ml_offline');
    } finally {
      setLoading(false);
    }
  }

  async function fetchEvalCharts() {
    try {
      const r = await fetch(`${API}/charts/eval`);
      if (r.ok) {
        setEvalCharts(await r.json());
        return;
      }
    } catch {/* fall through to static */}
    // Fallback: use pre-committed static PNGs in /public
    setEvalCharts({ _static: 'true' });
  }

  useEffect(() => {
    fetchStatus();
    fetchModels();
    fetchEvalCharts();
  }, []);

  // ── Training ───────────────────────────────────────────────────────────────
  async function runTraining() {
    if (!trainFile) return;
    setTraining(true);
    setTrainError(null);
    setTrainResult(null);
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

  // ── Drag & drop ────────────────────────────────────────────────────────────
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) setTrainFile(f);
  }

  // ── Sorted/filtered models ─────────────────────────────────────────────────
  const filteredModels = (data?.models ?? [])
    .filter(m => m.user_id.includes(search) || search === '')
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'user_id') return a.user_id.localeCompare(b.user_id) * dir;
      if (sortBy === 'session_count') return (a.session_count - b.session_count) * dir;
      return (a.threshold - b.threshold) * dir;
    });

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '20px 24px', maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Brain size={18} color={C.accent} />
          <div>
            <h1 style={{ fontFamily: 'Inter', fontSize: '16px', fontWeight: 600, color: C.t1, margin: 0 }}>
              ML Model Registry
            </h1>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted, marginTop: 2 }}>
              Behavioural Isolation Forest · per-user anomaly detection
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {serverOnline !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: serverOnline ? C.green : C.red,
                boxShadow: `0 0 6px ${serverOnline ? C.green : C.red}`,
              }} />
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted }}>
                {serverOnline ? 'SERVER ONLINE' : 'SERVER OFFLINE — run start-server.sh'}
              </span>
            </div>
          )}
          <button
            onClick={() => { fetchModels(); fetchStatus(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
              background: 'none', border: `1px solid ${C.bdr}`, cursor: 'pointer',
              color: C.muted, fontFamily: 'Inter', fontSize: '12px',
            }}
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: `1px solid ${C.bdr}` }}>
        {(['registry', 'train', 'charts'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Inter', fontSize: '12px', fontWeight: tab === t ? 500 : 400,
              color: tab === t ? C.accentLt : C.muted,
              borderBottom: tab === t ? `2px solid ${C.accentD}` : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t === 'registry' ? 'Model Registry' : t === 'train' ? 'Train / Upload' : 'Evaluation Charts'}
          </button>
        ))}
      </div>

      {/* ── REGISTRY TAB ────────────────────────────────────────────────────── */}
      {tab === 'registry' && (
        <div>
          {loading && (
            <div style={{ textAlign: 'center', padding: 40, color: C.muted, fontFamily: 'JetBrains Mono', fontSize: '12px' }}>
              Loading models…
            </div>
          )}
          {error === 'ml_offline' && (
            <div style={{ background: 'rgba(255,184,0,0.07)', border: `1px solid rgba(255,184,0,0.2)`, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={13} color={C.yellow} />
              <span style={{ fontFamily: 'Inter', fontSize: '12px', color: C.yellow }}>
                ML server offline — showing static snapshot (88 models). Run <code style={{ fontFamily: 'JetBrains Mono' }}>./start-server.sh</code> locally for live data &amp; training.
              </span>
            </div>
          )}

          {data && (
            <>
              {/* KPI row */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <KPI label="Total Models" value={data.summary.total} sub="per-user IF models" />
                <KPI label="Mature" value={data.summary.mature} sub={`≥${minSessions} sessions`} />
                <KPI label="Building" value={data.summary.immature} sub="need more data" />
                <KPI label="Avg Sessions" value={data.summary.avg_sessions} sub="per model" />
                <KPI label="Avg Threshold" value={data.summary.avg_threshold} sub="anomaly boundary" />
              </div>

              {/* Charts row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ background: C.card, border: `1px solid ${C.bdr}`, padding: '14px 16px' }}>
                  <div style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 500, color: C.t1, marginBottom: 12 }}>
                    Sessions per Model
                  </div>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={data.session_histogram} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.bdr} vertical={false} />
                      <XAxis dataKey="range" tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: C.muted }} />
                      <YAxis tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: C.muted }} />
                      <Tooltip content={<ChartTooltipCustom />} />
                      <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                        {data.session_histogram.map((_, i) => (
                          <Cell key={i} fill={C.accent} fillOpacity={0.75} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ background: C.card, border: `1px solid ${C.bdr}`, padding: '14px 16px' }}>
                  <div style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 500, color: C.t1, marginBottom: 12 }}>
                    Threshold Distribution
                  </div>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={data.threshold_histogram} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.bdr} vertical={false} />
                      <XAxis dataKey="range" tick={{ fontFamily: 'JetBrains Mono', fontSize: 8, fill: C.muted }} />
                      <YAxis tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: C.muted }} />
                      <Tooltip content={<ChartTooltipCustom />} />
                      <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                        {data.threshold_histogram.map((_, i) => (
                          <Cell key={i} fill={C.accentLt} fillOpacity={0.7} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Search + model table */}
              <div style={{ background: C.card, border: `1px solid ${C.bdr}` }}>
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.bdr}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    placeholder="Search user ID…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                      background: C.surface, border: `1px solid ${C.bdr}`, color: C.t1,
                      padding: '6px 10px', fontFamily: 'JetBrains Mono', fontSize: '11px',
                      outline: 'none', width: 180,
                    }}
                  />
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted }}>
                    {filteredModels.length} of {data.models.length} models
                  </span>
                </div>

                {/* Table header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '100px 80px 80px 90px 1fr 80px',
                  padding: '8px 16px', borderBottom: `1px solid ${C.bdr}`,
                  fontFamily: 'JetBrains Mono', fontSize: '9px', color: C.muted, letterSpacing: '0.1em',
                }}>
                  {(['USER ID', 'SESSIONS', 'THRESHOLD', 'STATUS', 'FEATURES', 'SCORE RANGE'] as const).map((col, i) => (
                    <div
                      key={col}
                      onClick={() => {
                        if (i === 0) toggleSort('user_id');
                        if (i === 1) toggleSort('session_count');
                        if (i === 2) toggleSort('threshold');
                      }}
                      style={{ cursor: i <= 2 ? 'pointer' : 'default', userSelect: 'none' }}
                    >
                      {col} {i === 0 && sortBy === 'user_id' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                      {i === 1 && sortBy === 'session_count' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                      {i === 2 && sortBy === 'threshold' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </div>
                  ))}
                </div>

                {/* Table rows */}
                <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                  {filteredModels.map(m => (
                    <div key={m.user_id}>
                      <div
                        onClick={() => setExpandedUser(expandedUser === m.user_id ? null : m.user_id)}
                        style={{
                          display: 'grid', gridTemplateColumns: '100px 80px 80px 90px 1fr 80px',
                          padding: '10px 16px', borderBottom: `1px solid ${C.bdr}`,
                          cursor: 'pointer', transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: C.accentLt }}>
                          {m.user_id}
                        </div>
                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: C.t1 }}>
                          {m.session_count}
                        </div>
                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: C.t1 }}>
                          {m.threshold}
                        </div>
                        <div><Badge mature={m.is_mature} /></div>
                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted }}>
                          {m.feature_names.join(', ')}
                        </div>
                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted }}>
                          {m.score_min !== null ? `${m.score_min} – ${m.score_max}` : '—'}
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {expandedUser === m.user_id && (
                        <div style={{
                          padding: '12px 16px', background: 'rgba(170,85,227,0.04)',
                          borderBottom: `1px solid ${C.bdr}`,
                        }}>
                          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                            {[
                              ['User ID', m.user_id],
                              ['Sessions trained', m.session_count],
                              ['Anomaly threshold', m.threshold],
                              ['Status', m.is_mature ? 'Mature' : 'Building'],
                              ['Features', m.feature_names.join(', ')],
                              ['Score range', m.score_min !== null ? `${m.score_min} → ${m.score_max}` : 'N/A'],
                            ].map(([k, v]) => (
                              <div key={k as string}>
                                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>{k}</div>
                                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: C.t1 }}>{v}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TRAIN TAB ───────────────────────────────────────────────────────── */}
      {tab === 'train' && (
        <div style={{ maxWidth: 720 }}>
          <Section title="Dataset Upload" icon={Database}>
            <div style={{ marginBottom: 12, fontFamily: 'Inter', fontSize: '12px', color: C.muted, lineHeight: 1.6 }}>
              Upload a <strong style={{ color: C.t1 }}>CSV</strong>, <strong style={{ color: C.t1 }}>XLSX</strong>, or <strong style={{ color: C.t1 }}>JSON</strong> file.
              Required columns: <code style={{ fontFamily: 'JetBrains Mono', color: C.accentLt }}>user_id</code>,{' '}
              <code style={{ fontFamily: 'JetBrains Mono', color: C.accentLt }}>label</code> (1=legit, 0=fraud),
              plus any numeric feature columns (e.g. <code style={{ fontFamily: 'JetBrains Mono', color: C.accentLt }}>dwell_avg, flight_avg, traj_avg</code>).
            </div>

            {/* Drop zone */}
            <div
              ref={dropRef}
              onDragOver={e => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${trainFile ? C.accent : C.bdr}`,
                background: trainFile ? 'rgba(170,85,227,0.05)' : 'transparent',
                padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
                transition: 'border 0.15s, background 0.15s', marginBottom: 16,
              }}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls,.json"
                style={{ display: 'none' }}
                onChange={e => setTrainFile(e.target.files?.[0] ?? null)}
              />
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
                  <div style={{ fontFamily: 'Inter', fontSize: '13px', color: C.muted }}>
                    Drag & drop or click to select file
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.t3, marginTop: 4 }}>
                    CSV · XLSX · JSON
                  </div>
                </div>
              )}
            </div>

            {/* Config */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted, letterSpacing: '0.1em', marginBottom: 4 }}>
                  CONTAMINATION
                </label>
                <input
                  type="number" min={0.01} max={0.5} step={0.01}
                  value={contamination}
                  onChange={e => setContamination(parseFloat(e.target.value))}
                  style={{
                    background: C.surface, border: `1px solid ${C.bdr}`, color: C.t1,
                    padding: '6px 10px', fontFamily: 'JetBrains Mono', fontSize: '12px',
                    outline: 'none', width: 90,
                  }}
                />
                <div style={{ fontFamily: 'Inter', fontSize: '10px', color: C.muted, marginTop: 3 }}>
                  Expected fraud ratio (0.01–0.5)
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted, letterSpacing: '0.1em', marginBottom: 4 }}>
                  MIN SESSIONS
                </label>
                <input
                  type="number" min={1} max={50} step={1}
                  value={minSessions}
                  onChange={e => setMinSessions(parseInt(e.target.value))}
                  style={{
                    background: C.surface, border: `1px solid ${C.bdr}`, color: C.t1,
                    padding: '6px 10px', fontFamily: 'JetBrains Mono', fontSize: '12px',
                    outline: 'none', width: 90,
                  }}
                />
                <div style={{ fontFamily: 'Inter', fontSize: '10px', color: C.muted, marginTop: 3 }}>
                  Min legit sessions to train
                </div>
              </div>
            </div>

            <button
              onClick={runTraining}
              disabled={!trainFile || training || !serverOnline}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                background: trainFile && !training && serverOnline ? C.accent : C.t3,
                color: '#fff', border: 'none', cursor: trainFile && !training && serverOnline ? 'pointer' : 'not-allowed',
                fontFamily: 'Inter', fontSize: '13px', fontWeight: 500, transition: 'background 0.15s',
              }}
            >
              {training ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Cpu size={14} />}
              {training ? 'Training…' : 'Train Models'}
            </button>

            {!serverOnline && (
              <div style={{ marginTop: 10, fontFamily: 'Inter', fontSize: '11px', color: C.orange }}>
                ML server must be running. Start it with: <code style={{ fontFamily: 'JetBrains Mono' }}>./start-server.sh</code>
              </div>
            )}
          </Section>

          {/* Train error */}
          {trainError && (
            <div style={{ background: 'rgba(255,59,92,0.08)', border: `1px solid rgba(255,59,92,0.2)`, padding: '12px 16px', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={14} color={C.red} />
                <span style={{ color: C.red, fontFamily: 'Inter', fontSize: '12px' }}>{trainError}</span>
              </div>
            </div>
          )}

          {/* Train results */}
          {trainResult && (
            <Section title="Training Results" icon={Activity}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {[
                  ['Models Trained', trainResult.trained],
                  ['Skipped', trainResult.skipped],
                  ['Total Sessions', trainResult.total_sessions],
                  ['Unique Users', trainResult.unique_users],
                  ['Elapsed', `${trainResult.elapsed_seconds}s`],
                ].map(([l, v]) => (
                  <KPI key={l as string} label={l as string} value={v as string | number} />
                ))}
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted, marginBottom: 6, letterSpacing: '0.1em' }}>
                  FEATURE COLUMNS DETECTED
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {trainResult.feature_columns.map(f => (
                    <span key={f} style={{
                      padding: '3px 8px', background: 'rgba(170,85,227,0.1)',
                      border: `1px solid rgba(170,85,227,0.2)`, color: C.accentLt,
                      fontFamily: 'JetBrains Mono', fontSize: '11px',
                    }}>{f}</span>
                  ))}
                </div>
              </div>

              {trainResult.metrics && (
                <div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted, marginBottom: 8, letterSpacing: '0.1em' }}>
                    EVALUATION METRICS
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {[
                      ['ROC-AUC', trainResult.metrics.roc_auc?.toFixed(4) ?? 'N/A'],
                      ['Accuracy', (trainResult.metrics.accuracy * 100).toFixed(1) + '%'],
                      ['Fraud Recall', (trainResult.metrics.recall_fraud * 100).toFixed(1) + '%'],
                      ['Fraud Precision', (trainResult.metrics.precision_fraud * 100).toFixed(1) + '%'],
                      ['Fraud F1', trainResult.metrics.f1_fraud.toFixed(4)],
                      ['Legit Recall', (trainResult.metrics.recall_legit * 100).toFixed(1) + '%'],
                      ['Sessions (legit)', trainResult.metrics.legit_sessions],
                      ['Sessions (fraud)', trainResult.metrics.fraud_sessions],
                    ].map(([l, v]) => (
                      <div key={l as string} style={{ background: C.surface, border: `1px solid ${C.bdr}`, padding: '10px 12px' }}>
                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: C.muted, letterSpacing: '0.1em', marginBottom: 4 }}>{l}</div>
                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '14px', fontWeight: 600, color: C.t1 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Training charts */}
              {trainResult.charts && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted, marginBottom: 10, letterSpacing: '0.1em' }}>
                    TRAINING CHARTS
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
                    {trainResult.charts.threshold_distribution && (
                      <div style={{ background: C.surface, border: `1px solid ${C.bdr}`, padding: 8, gridColumn: '1 / -1' }}>
                        <div style={{ fontFamily: 'Inter', fontSize: '11px', color: C.muted, marginBottom: 6 }}>Per-User Threshold Distribution</div>
                        <img src={`data:image/png;base64,${trainResult.charts.threshold_distribution}`} style={{ width: '100%', maxWidth: 600 }} alt="Threshold distribution" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Section>
          )}
        </div>
      )}

      {/* ── CHARTS TAB ──────────────────────────────────────────────────────── */}
      {tab === 'charts' && (
        <div>
          <div style={{ fontFamily: 'Inter', fontSize: '12px', color: C.muted, marginBottom: 16 }}>
            Pre-generated evaluation charts from the initial training run on the Behaviour Biometrics Dataset (88 users).
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Evaluation results — served from server (b64) or static /public */}
            <div style={{ background: C.card, border: `1px solid ${C.bdr}`, padding: '16px' }}>
              <div style={{ fontFamily: 'Inter', fontSize: '13px', fontWeight: 500, color: C.t1, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={14} color={C.accent} />
                Evaluation Results — Risk Distribution &amp; Confusion Matrix
              </div>
              <img
                src={evalCharts.evaluation_results
                  ? `data:image/png;base64,${evalCharts.evaluation_results}`
                  : '/ml_eval_results.png'}
                style={{ width: '100%', maxWidth: 900 }}
                alt="Evaluation results"
              />
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.bdr}`, padding: '16px' }}>
              <div style={{ fontFamily: 'Inter', fontSize: '13px', fontWeight: 500, color: C.t1, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Brain size={14} color={C.accent} />
                Feature Importance — Fusion Model (XGBoost + Behavioural Score)
              </div>
              <img
                src={evalCharts.feature_importance
                  ? `data:image/png;base64,${evalCharts.feature_importance}`
                  : '/ml_feature_importance.png'}
                style={{ width: '100%', maxWidth: 900 }}
                alt="Feature importance"
              />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
