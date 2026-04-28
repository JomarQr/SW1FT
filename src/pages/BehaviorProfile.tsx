import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, User, TrendingUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getSessions } from '../lib/behaviorStore';
import { computeProfile, getProfileSources } from '../lib/behaviorProfile';
import type { ProfileResult } from '../lib/behaviorProfile';
import { COLORS } from '../lib/mockData';

/* ── Theme ──────────────────────────────────────────────────────────────────── */

const C = {
  bg:      'var(--bg)',
  card:    'var(--card)',
  border:  'var(--bdr)',
  border2: 'var(--bdr2)',
  accent:  'var(--accent)',
  primary: 'var(--t1)',
  muted:   '#6B6B7A',
  safe:    'var(--green)',
  warn:    'var(--yellow)',
  danger:  'var(--red)',
  mono:    'JetBrains Mono' as const,
  sans:    'Inter' as const,
};

function confidenceColor(score: number) {
  if (score >= 81) return C.safe;
  if (score >= 61) return '#4EA8DE';
  if (score >= 41) return C.warn;
  return C.muted;
}

function matchColor(score: number) {
  if (score >= 80) return C.safe;
  if (score >= 60) return C.warn;
  return C.danger;
}

function driftColor(score: number) {
  if (score < 15) return C.safe;
  if (score < 35) return C.warn;
  return C.danger;
}

function severityColor(sev: 'ok' | 'watch' | 'alert') {
  if (sev === 'ok')    return C.safe;
  if (sev === 'watch') return C.warn;
  return C.danger;
}

function SeverityIcon({ sev }: { sev: 'ok' | 'watch' | 'alert' }) {
  const color = severityColor(sev);
  const size = 13;
  if (sev === 'ok')    return <CheckCircle size={size} color={color} />;
  if (sev === 'alert') return <AlertTriangle size={size} color={color} />;
  return <Info size={size} color={color} />;
}

/* ── KPI card ───────────────────────────────────────────────────────────────── */

function KpiCard({
  label, value, sub, accentColor, accent,
}: { label: string; value: string | number; sub?: string; accentColor?: string; accent?: boolean }) {
  const col = accentColor ?? C.accent;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
      {accent && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: col }} />
      )}
      <div style={{ fontFamily: C.mono, fontSize: '9px', color: C.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>
        {label}
      </div>
      <div style={{ fontFamily: C.mono, fontSize: '22px', fontWeight: 700, color: col, lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: C.mono, fontSize: '9px', color: C.muted, marginTop: '5px', letterSpacing: '0.05em' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

/* ── Radar tooltip ───────────────────────────────────────────────────────────── */

function RadarTip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; fill: string }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bdr)', border: `1px solid ${C.border2}`, padding: '8px 12px', fontFamily: C.mono, fontSize: '10px' }}>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.fill ?? C.primary }}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
}

/* ── Dimension table row ─────────────────────────────────────────────────────── */

function DimRow({ d }: { d: { name: string; baseline: number; current: number; rawBaseline: string; rawCurrent: string; zScore: number } }) {
  const deviation = Math.abs(d.zScore);
  const rowColor = deviation > 2.5 ? C.danger : deviation > 1.5 ? C.warn : C.primary;
  return (
    <tr>
      <td style={{ fontFamily: C.mono, fontSize: '11px', color: C.muted, paddingRight: '16px', paddingBottom: '10px' }}>{d.name}</td>
      <td style={{ fontFamily: C.mono, fontSize: '11px', color: C.primary, paddingRight: '16px', paddingBottom: '10px' }}>{d.rawBaseline}</td>
      <td style={{ fontFamily: C.mono, fontSize: '11px', color: rowColor, paddingRight: '16px', paddingBottom: '10px' }}>{d.rawCurrent}</td>
      <td style={{ paddingBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '80px', height: '4px', background: C.border, borderRadius: '2px', overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${d.baseline}%`, background: C.muted, opacity: 0.5 }} />
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${d.current}%`, background: rowColor }} />
          </div>
          <span style={{ fontFamily: C.mono, fontSize: '10px', color: rowColor, minWidth: '40px' }}>
            z{d.zScore > 0 ? '+' : ''}{d.zScore.toFixed(1)}
          </span>
        </div>
      </td>
    </tr>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────────── */

export default function BehaviorProfile() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initUser = searchParams.get('user') ?? '';

  const sources = useMemo(() => getProfileSources(getSessions()), []);
  const [selectedId, setSelectedId] = useState<string>(() => {
    if (initUser && sources.find(s => s.userId === initUser)) return initUser;
    return sources[0]?.userId ?? '';
  });

  const selectedSource = sources.find(s => s.userId === selectedId);
  const profile: ProfileResult | null = useMemo(() => {
    if (!selectedSource) return null;
    return computeProfile(selectedSource.sessions, selectedSource.userId);
  }, [selectedSource]);

  function selectUser(uid: string) {
    setSelectedId(uid);
    setSearchParams({ user: uid }, { replace: true });
  }

  if (sources.length === 0) {
    return (
      <div style={{ padding: '32px', minHeight: '100vh', background: C.bg }}>
        <div style={{ textAlign: 'center', paddingTop: '80px' }}>
          <div style={{ fontFamily: C.mono, fontSize: '11px', color: C.muted, marginBottom: '12px' }}>No sessions available</div>
          <button onClick={() => navigate('/dashboard/payment-capture')} style={{ background: 'transparent', border: `1px solid ${C.accent}`, color: C.accent, fontFamily: C.mono, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '9px 20px', cursor: 'pointer' }}>
            Start Capturing
          </button>
        </div>
      </div>
    );
  }

  const conf = profile?.confidenceScore ?? 0;
  const confColor = confidenceColor(conf);

  // Radar data — 8 dimensions mapped to short labels
  const radarData = profile ? profile.dimensions.map(d => ({
    subject: d.name.split(' ').map(w => w.slice(0, 4)).join(' '),
    fullName: d.name,
    baseline: d.baseline,
    current:  d.current,
  })) : [];

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: C.bg }}>

      {/* Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontFamily: C.mono, fontSize: '11px', padding: 0 }}>
            <ArrowLeft size={13} /> Back
          </button>
          <div style={{ width: '1px', height: '16px', background: C.border }} />
          <div>
            <div style={{ fontFamily: C.sans, fontSize: '15px', fontWeight: 600, color: C.primary }}>Behavioral Profiling Engine</div>
            <div style={{ fontFamily: C.mono, fontSize: '10px', color: C.muted }}>Per-user statistical profile · {sources.length} user{sources.length !== 1 ? 's' : ''} tracked</div>
          </div>
        </div>

        {/* User selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={13} color={C.muted} />
          <select
            value={selectedId}
            onChange={e => selectUser(e.target.value)}
            style={{ background: C.card, border: `1px solid ${C.border2}`, color: C.primary, fontFamily: C.mono, fontSize: '11px', padding: '7px 12px', cursor: 'pointer', outline: 'none', minWidth: '220px' }}
          >
            {sources.map(s => (
              <option key={s.userId} value={s.userId}>
                {s.displayName ? `${s.displayName} (${s.userId})` : s.userId}
              </option>
            ))}
          </select>
        </div>
      </div>

      {profile && (
        <>
          {/* Sessions needed banner */}
          {profile.sessionsNeeded && (
            <div style={{ background: 'rgba(240,165,0,0.06)', border: `1px solid rgba(240,165,0,0.2)`, padding: '10px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <TrendingUp size={13} color={C.warn} />
              <span style={{ fontFamily: C.mono, fontSize: '10px', color: C.warn }}>
                Profile building: {profile.sessionsNeeded.forBasic > 0 ? `${profile.sessionsNeeded.forBasic} more session${profile.sessionsNeeded.forBasic > 1 ? 's' : ''} for basic baseline · ` : ''}{profile.sessionsNeeded.forReliable > 0 ? `${profile.sessionsNeeded.forReliable} for reliable · ` : ''}{profile.sessionsNeeded.forMature > 0 ? `${profile.sessionsNeeded.forMature} for mature` : ''}
              </span>
            </div>
          )}

          {/* KPI strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', marginBottom: '16px' }}>
            <KpiCard
              label="Persona Status"
              value={profile.personaLabel.split(' — ')[0]}
              sub={profile.personaLabel.includes(' — ') ? profile.personaLabel.split(' — ')[1] : undefined}
              accentColor={confColor}
              accent
            />
            <KpiCard
              label="Sessions Collected"
              value={profile.sessionCount}
              sub={profile.confidenceLabel}
              accentColor={C.accent}
              accent
            />
            <KpiCard
              label="Persona Confidence"
              value={`${profile.confidenceScore}%`}
              sub={profile.confidenceLabel}
              accentColor={confColor}
              accent
            />
            <KpiCard
              label="Session Match"
              value={`${profile.matchScore}%`}
              sub={profile.matchScore >= 80 ? 'Within baseline' : profile.matchScore >= 60 ? 'Slight deviation' : 'Anomaly detected'}
              accentColor={matchColor(profile.matchScore)}
              accent
            />
            <KpiCard
              label="Behavioral Drift"
              value={`${profile.driftScore}%`}
              sub={profile.driftLabel}
              accentColor={driftColor(profile.driftScore)}
              accent
            />
            <KpiCard
              label="Sessions for Mature"
              value={profile.sessionsNeeded?.forMature ?? '—'}
              sub={profile.sessionsNeeded ? 'sessions remaining' : 'Mature profile reached'}
              accentColor={profile.sessionsNeeded ? C.muted : C.safe}
              accent
            />
          </div>

          {/* Row 2: radar + insights */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>

            {/* Radar chart */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, padding: '18px' }}>
              <div style={{ fontFamily: C.mono, fontSize: '10px', color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
                Behavioral Dimensions
              </div>
              <div style={{ fontFamily: C.sans, fontSize: '13px', color: C.primary, marginBottom: '14px' }}>
                Baseline vs Current Session
              </div>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '24px', height: '2px', background: C.muted, borderRadius: '1px', opacity: 0.5 }} />
                  <span style={{ fontFamily: C.mono, fontSize: '9px', color: C.muted }}>Baseline</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '24px', height: '2px', background: C.accent, borderRadius: '1px' }} />
                  <span style={{ fontFamily: C.mono, fontSize: '9px', color: C.muted }}>Current</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData} margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
                  <PolarGrid stroke={C.border} />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: C.muted, fontFamily: C.mono, fontSize: 9 }}
                  />
                  <Radar name="Baseline" dataKey="baseline" stroke={C.muted} fill={C.muted} fillOpacity={0.08} strokeWidth={1.5} strokeDasharray="4 3" />
                  <Radar name="Current"  dataKey="current"  stroke={C.accent} fill={C.accent} fillOpacity={0.15} strokeWidth={2} />
                  <Tooltip content={<RadarTip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Insights + dimension table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* Text insights */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, padding: '18px', flex: '0 0 auto' }}>
                <div style={{ fontFamily: C.mono, fontSize: '10px', color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Behavioral Insights
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                  {profile.insights.map((ins, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '9px' }}>
                      <div style={{ flexShrink: 0, marginTop: '1px' }}><SeverityIcon sev={ins.severity} /></div>
                      <span style={{ fontFamily: C.sans, fontSize: '12px', color: ins.severity === 'alert' ? C.danger : ins.severity === 'watch' ? C.warn : C.primary, lineHeight: 1.5 }}>{ins.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Persona description */}
              <div style={{ background: 'rgba(170,85,227,0.04)', border: `1px solid rgba(170,85,227,0.15)`, padding: '14px 18px' }}>
                <div style={{ fontFamily: C.mono, fontSize: '9px', color: C.accent, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Profile Assessment
                </div>
                <div style={{ fontFamily: C.sans, fontSize: '12px', color: C.primary, lineHeight: 1.6 }}>
                  {profile.personaDescription}
                </div>
              </div>
            </div>
          </div>

          {/* Dimension detail table */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, padding: '18px', marginBottom: '12px' }}>
            <div style={{ fontFamily: C.mono, fontSize: '10px', color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>
              Dimension Breakdown
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Dimension', 'Baseline', 'Current Session', 'Deviation'].map(h => (
                    <th key={h} style={{ fontFamily: C.mono, fontSize: '9px', color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'left', paddingBottom: '10px', borderBottom: `1px solid ${C.border}`, paddingRight: '16px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profile.dimensions.map(d => (
                  <DimRow key={d.name} d={d} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Charts row: confidence growth + stability trend */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

            {/* Confidence growth */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, padding: '18px' }}>
              <div style={{ fontFamily: C.mono, fontSize: '10px', color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
                Confidence Growth
              </div>
              <div style={{ fontFamily: C.sans, fontSize: '13px', color: C.primary, marginBottom: '14px' }}>
                Model maturity over sessions
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={profile.confidenceHistory} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="cgGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={confColor} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={confColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fill: C.muted, fontFamily: C.mono, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: C.muted, fontFamily: C.mono, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bdr)', border: `1px solid ${C.border2}`, fontFamily: C.mono, fontSize: '10px' }} />
                  <Area type="monotone" dataKey="confidence" stroke={confColor} fill="url(#cgGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Stability trend */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, padding: '18px' }}>
              <div style={{ fontFamily: C.mono, fontSize: '10px', color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
                Session Stability
              </div>
              <div style={{ fontFamily: C.sans, fontSize: '13px', color: C.primary, marginBottom: '14px' }}>
                Match score per session vs running baseline
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={profile.stabilityHistory.slice(-10)} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="stGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.accent} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fill: C.muted, fontFamily: C.mono, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: C.muted, fontFamily: C.mono, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bdr)', border: `1px solid ${C.border2}`, fontFamily: C.mono, fontSize: '10px' }} />
                  <Area type="monotone" dataKey="match" stroke={C.accent} fill="url(#stGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
