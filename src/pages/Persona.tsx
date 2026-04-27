import { useState, useRef, useEffect } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell, ResponsiveContainer,
} from 'recharts';
import { CheckCircle, Clock, AlertTriangle, XCircle, Activity } from 'lucide-react';
import { SCENARIOS, type PersonaResult } from '../lib/personaEngine';

/* ── Constants ──────────────────────────────────────────────────────────── */

const C = {
  bg:     '#0A0A0B',
  card:   '#111115',
  border: '#1E1E22',
  accent: '#AA55E3',
  muted:  '#6B6B7A',
  text:   '#E8E8ED',
  subtle: '#9A9AAA',
};

const RISK_COLOR = {
  Low:      '#00CC7A',
  Medium:   '#FFB800',
  High:     '#FF8C00',
  Critical: '#FF3B5C',
} as const;

const ACTION_CFG = {
  approve:       { color: '#00CC7A', bg: 'rgba(0,204,122,0.07)',   border: 'rgba(0,204,122,0.18)',  Icon: CheckCircle   },
  cooling_off:   { color: '#FFB800', bg: 'rgba(255,184,0,0.07)',   border: 'rgba(255,184,0,0.18)',  Icon: Clock         },
  manual_review: { color: '#FF8C00', bg: 'rgba(255,140,0,0.07)',   border: 'rgba(255,140,0,0.18)',  Icon: AlertTriangle },
  block:         { color: '#FF3B5C', bg: 'rgba(255,59,92,0.07)',   border: 'rgba(255,59,92,0.18)',  Icon: XCircle       },
} as const;

const SCENARIO_BTNS = [
  { key: 'normal',    label: 'Normal Payment',   tag: 'Low risk'       },
  { key: 'stressed',  label: 'Stressed User',     tag: 'High hesitation' },
  { key: 'scam',      label: 'Scam Pressure',     tag: 'Critical risk'  },
  { key: 'traveling', label: 'Traveling User',    tag: 'Medium risk'    },
  { key: 'newuser',   label: 'New User',          tag: 'Cold start'     },
] as const;

/* ── Tiny helpers ───────────────────────────────────────────────────────── */

function KpiCard({ label, children, accentColor }: { label: string; children: React.ReactNode; accentColor?: string }) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${accentColor ? `${accentColor}44` : C.border}`,
      padding: '18px 20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {accentColor && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: accentColor }} />}
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: C.muted, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '12px' }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function Bar2({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: '3px', background: C.border, borderRadius: '2px', marginTop: '10px' }}>
      <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: '2px', transition: 'width 0.5s ease' }} />
    </div>
  );
}

/* ── Custom radar label ─────────────────────────────────────────────────── */

function RadarLabel(props: { x?: number; y?: number; payload?: { value: string } }) {
  const { x = 0, y = 0, payload } = props;
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
      style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', fill: '#6B6B7A' }}>
      {payload?.value}
    </text>
  );
}

/* ── Scanning animation ─────────────────────────────────────────────────── */

function AnalyzingOverlay() {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 260);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '420px', flexDirection: 'column', gap: '14px' }}>
      <Activity size={22} color={C.accent} />
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: C.accent, letterSpacing: '0.18em' }}>
        ANALYZING SESSION{dots}
      </span>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */

export default function Persona() {
  const [active, setActive]       = useState('normal');
  const [analyzing, setAnalyzing] = useState(false);
  const [data, setData]           = useState<PersonaResult>(SCENARIOS.normal);
  const sessionRef = useRef(Date.now().toString(36).toUpperCase());

  function switchScenario(key: string) {
    if (key === active || analyzing) return;
    setAnalyzing(true);
    setTimeout(() => {
      setActive(key);
      setData(SCENARIOS[key]);
      sessionRef.current = Date.now().toString(36).toUpperCase();
      setAnalyzing(false);
    }, 700);
  }

  const riskColor  = RISK_COLOR[data.deviationLevel];
  const actionCfg  = ACTION_CFG[data.action];
  const ActionIcon = actionCfg.Icon;

  return (
    <div style={{ padding: '32px', maxWidth: '1200px' }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
          Behavioral Persona Engine
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontFamily: 'Inter', fontSize: '22px', fontWeight: 700, color: C.text, margin: '0 0 6px' }}>
              Adaptive Session Analysis
            </h1>
            <p style={{ fontFamily: 'Inter', fontSize: '13px', color: C.muted, margin: 0 }}>
              Historical pattern matching &nbsp;·&nbsp; Contextual risk scoring &nbsp;·&nbsp; Real-time session anomaly detection
            </p>
          </div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted, textAlign: 'right', lineHeight: 1.7 }}>
            <div>SES-{sessionRef.current}</div>
            <div>Baseline: {data.sessionCount} session{data.sessionCount !== 1 ? 's' : ''} · Rolling 20</div>
          </div>
        </div>
      </div>

      {/* ── Scenario Simulator ──────────────────────────────────────── */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: C.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>
          Scenario Simulator
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {SCENARIO_BTNS.map(btn => {
            const scenColor = RISK_COLOR[SCENARIOS[btn.key].deviationLevel];
            const isActive  = active === btn.key;
            return (
              <button
                key={btn.key}
                onClick={() => switchScenario(btn.key)}
                style={{
                  padding: '10px 16px',
                  background:  isActive ? `${scenColor}12` : 'transparent',
                  border:      `1px solid ${isActive ? scenColor : C.border}`,
                  color:       isActive ? scenColor : C.muted,
                  fontFamily:  'JetBrains Mono',
                  fontSize:    '11px',
                  cursor:      analyzing ? 'not-allowed' : 'pointer',
                  transition:  'all 0.15s',
                  textAlign:   'left',
                  opacity:     analyzing && !isActive ? 0.4 : 1,
                }}
              >
                <div style={{ fontWeight: isActive ? 600 : 400 }}>{btn.label}</div>
                <div style={{ fontSize: '9px', letterSpacing: '0.08em', marginTop: '3px', opacity: 0.65 }}>{btn.tag}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Analyzing state ─────────────────────────────────────────── */}
      {analyzing && <AnalyzingOverlay />}

      {!analyzing && (
        <>
          {/* ── KPI row ─────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>

            <KpiCard label="Persona Mode">
              <div style={{ fontFamily: 'Inter', fontSize: '14px', fontWeight: 700, color: C.text, lineHeight: 1.3, marginBottom: '6px' }}>
                {data.personaLabel}
              </div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted }}>
                {data.sessionCount} session{data.sessionCount !== 1 ? 's' : ''} analysed
              </div>
            </KpiCard>

            <KpiCard label="Persona Confidence">
              <div style={{ fontFamily: 'Inter', fontSize: '36px', fontWeight: 800, color: C.text, lineHeight: 1 }}>
                {data.personaConfidence}<span style={{ fontSize: '18px', fontWeight: 400, color: C.muted }}>%</span>
              </div>
              <Bar2 value={data.personaConfidence} color={C.accent} />
            </KpiCard>

            <KpiCard label="Behavior Match">
              <div style={{ fontFamily: 'Inter', fontSize: '36px', fontWeight: 800, color: C.text, lineHeight: 1 }}>
                {data.matchScore}<span style={{ fontSize: '18px', fontWeight: 400, color: C.muted }}>%</span>
              </div>
              <Bar2 value={data.matchScore} color={riskColor} />
            </KpiCard>

            <KpiCard label="Risk Score" accentColor={riskColor}>
              <div style={{ fontFamily: 'Inter', fontSize: '44px', fontWeight: 800, color: riskColor, lineHeight: 1, marginBottom: '4px' }}>
                {data.finalScore}
              </div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: riskColor, letterSpacing: '0.12em' }}>
                {data.deviationLevel} deviation
              </div>
            </KpiCard>
          </div>

          {/* ── Persona description strip ────────────────────────────── */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, padding: '14px 20px', marginBottom: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: riskColor, flexShrink: 0 }} />
            <span style={{ fontFamily: 'Inter', fontSize: '13px', color: C.subtle, lineHeight: 1.5 }}>
              {data.personaDescription}
            </span>
          </div>

          {/* ── Radar + Risk Factors ─────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

            {/* Radar */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontFamily: 'Inter', fontSize: '13px', fontWeight: 600, color: C.text }}>Session vs Baseline</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted, marginTop: '2px' }}>Behavioral dimension comparison</div>
                </div>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke={C.accent} strokeWidth="1.5" strokeDasharray="4 3" /></svg>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: C.muted }}>Baseline</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke={riskColor} strokeWidth="2" /></svg>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: C.muted }}>Current</span>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={data.radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <PolarGrid stroke="#1E1E22" />
                  <PolarAngleAxis dataKey="metric" tick={<RadarLabel />} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Baseline" dataKey="baseline"
                    stroke={C.accent} strokeWidth={1.5} strokeDasharray="4 3"
                    fill={C.accent} fillOpacity={0.07} />
                  <Radar name="Current" dataKey="current"
                    stroke={riskColor} strokeWidth={2}
                    fill={riskColor} fillOpacity={0.18} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Risk Factors + Action */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              <div style={{ background: C.card, border: `1px solid ${C.border}`, padding: '20px', flex: 1, overflowY: 'auto' }}>
                <div style={{ fontFamily: 'Inter', fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '2px' }}>Risk Factors</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted, marginBottom: '16px' }}>Detected anomalies this session</div>

                {data.riskFactors.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0' }}>
                    <CheckCircle size={13} color="#00CC7A" />
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#00CC7A' }}>No anomalies detected</span>
                  </div>
                ) : data.riskFactors.map((rf, i) => {
                  const sc = rf.severity === 'high' ? '#FF3B5C' : rf.severity === 'medium' ? '#FFB800' : '#00CC7A';
                  return (
                    <div key={i} style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: sc, flexShrink: 0, marginTop: '5px' }} />
                      <div>
                        <div style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 500, color: C.text, marginBottom: '3px' }}>{rf.label}</div>
                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted, lineHeight: 1.5 }}>{rf.detail}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ background: actionCfg.bg, border: `1px solid ${actionCfg.border}`, padding: '18px 20px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <ActionIcon size={15} color={actionCfg.color} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: actionCfg.color, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Recommended Action
                    </div>
                    <div style={{ fontFamily: 'Inter', fontSize: '14px', fontWeight: 700, color: actionCfg.color, marginBottom: '6px' }}>
                      {data.actionLabel}
                    </div>
                    <div style={{ fontFamily: 'Inter', fontSize: '12px', color: C.subtle, lineHeight: 1.55 }}>
                      {data.actionDescription}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ── Session History + Distribution ───────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '16px' }}>

            {/* History */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, padding: '24px' }}>
              <div style={{ fontFamily: 'Inter', fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '2px' }}>Session Risk History</div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted, marginBottom: '20px' }}>
                Last {data.history.length} sessions &nbsp;·&nbsp; Higher score = more anomalous
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={data.history} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={riskColor} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={riskColor} stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fontFamily: 'JetBrains Mono', fill: '#6B6B7A' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9, fontFamily: 'JetBrains Mono', fill: '#6B6B7A' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#111115', border: '1px solid #1E1E22', fontFamily: 'JetBrains Mono', fontSize: '11px', borderRadius: 0 }}
                    labelStyle={{ color: C.muted }}
                    itemStyle={{ color: riskColor }}
                    formatter={(v: number) => [`${v}`, 'Risk Score']}
                  />
                  <Area type="monotone" dataKey="score" stroke={riskColor} strokeWidth={2}
                    fill="url(#histGrad)"
                    dot={(p) => {
                      const isLast = p.index === data.history.length - 1;
                      return <circle key={p.index} cx={p.cx} cy={p.cy} r={isLast ? 5 : 3} fill={riskColor} stroke={isLast ? '#0A0A0B' : 'none'} strokeWidth={2} />;
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Distribution */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, padding: '24px' }}>
              <div style={{ fontFamily: 'Inter', fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '2px' }}>Persona Mode Distribution</div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted, marginBottom: '20px' }}>Sessions by detected mode</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.distribution} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 8, fontFamily: 'JetBrains Mono', fill: '#6B6B7A' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fontFamily: 'JetBrains Mono', fill: '#6B6B7A' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#111115', border: '1px solid #1E1E22', fontFamily: 'JetBrains Mono', fontSize: '11px', borderRadius: 0 }}
                    labelStyle={{ color: C.muted }}
                    formatter={(v: number) => [`${v} sessions`, 'Count']}
                  />
                  <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                    {data.distribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
