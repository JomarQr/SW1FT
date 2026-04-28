import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { ExternalLink, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import GeoRiskMap from '../components/GeoRiskMap';
import {
  SESSIONS, ALERTS, DASHBOARD_KPIs, RISK_DISTRIBUTION_24H, COLORS,
  type Session, type SessionStatus,
} from '../lib/mockData';

/* ── helpers ─────────────────────────────────────────────────────────────── */

function riskColor(score: number) {
  if (score >= 85) return COLORS.danger;
  if (score >= 65) return COLORS.orange;
  if (score >= 40) return COLORS.warning;
  return COLORS.safe;
}

function fmtEur(n: number) {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `€${(n / 1_000).toFixed(0)}K`;
  return `€${n}`;
}

function fmtTime(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

function useCountUp(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  const start = useRef<number | null>(null);
  useEffect(() => {
    start.current = null;
    const animate = (now: number) => {
      if (!start.current) start.current = now;
      const p = Math.min((now - start.current) / duration, 1);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);
  return val;
}

const STATUS_CFG: Record<SessionStatus, { color: string; bg: string }> = {
  SAFE:    { color: 'var(--green)', bg: 'rgba(0,204,122,0.1)'  },
  WATCH:   { color: 'var(--yellow)', bg: 'rgba(255,184,0,0.1)'  },
  ALERT:   { color: 'var(--orange)', bg: 'rgba(255,140,0,0.1)'  },
  BLOCKED: { color: 'var(--red)', bg: 'rgba(255,59,92,0.12)' },
};

/* ── KPI card ────────────────────────────────────────────────────────────── */

function KpiCard({
  label, value, format, sub, subColor, topColor, delta,
}: {
  label: string;
  value: number;
  format: (n: number) => string;
  sub?: string;
  subColor?: string;
  topColor?: string;
  delta?: { value: string; up: boolean | null };
}) {
  const displayed = useCountUp(value);
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--bdr)',
      borderTop: `2px solid ${topColor ?? 'var(--bdr)'}`,
      padding: '12px 14px', flex: 1, minWidth: 0,
    }}>
      <div style={{
        fontFamily: 'JetBrains Mono', fontSize: '8px', fontWeight: 600,
        color: 'var(--t4)', letterSpacing: '0.16em', textTransform: 'uppercase',
        marginBottom: '6px',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'JetBrains Mono', fontSize: '22px', fontWeight: 700,
        color: 'var(--t1)', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
      }}>
        {format(displayed)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '5px' }}>
        {sub && (
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: subColor ?? 'var(--t4)' }}>
            {sub}
          </span>
        )}
        {delta && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontFamily: 'JetBrains Mono', fontSize: '9px', color: delta.up === null ? 'var(--t4)' : delta.up ? COLORS.safe : COLORS.danger }}>
            {delta.up === null ? <Minus size={9} /> : delta.up ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
            {delta.value}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── chart tooltip ────────────────────────────────────────────────────────── */

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0C0C0F', border: '1px solid var(--bdr)', padding: '7px 11px', fontFamily: 'JetBrains Mono', fontSize: '10px' }}>
      <div style={{ color: 'var(--t4)', marginBottom: '3px' }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.stroke ?? p.color, display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--t3)' }}>{p.name}</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

/* ── section header ───────────────────────────────────────────────────────── */

function SectionHeader({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '9px 14px', borderBottom: '1px solid var(--bdr)', background: 'var(--bg)',
    }}>
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', fontWeight: 600, color: 'var(--t4)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
        {label}
      </span>
      {right}
    </div>
  );
}

/* ── main ─────────────────────────────────────────────────────────────────── */

export default function Dashboard() {
  const navigate = useNavigate();
  const [liveSessions, setLiveSessions] = useState<Session[]>(() => [...SESSIONS].slice(0, 20));
  const [flashedId, setFlashedId] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setLiveSessions(prev => {
        const i = Math.floor(Math.random() * prev.length);
        const delta = Math.floor(Math.random() * 9) - 4;
        const updated = { ...prev[i], riskScore: Math.min(100, Math.max(0, prev[i].riskScore + delta)) };
        const next = [...prev]; next[i] = updated;
        setFlashedId(updated.id);
        setTimeout(() => setFlashedId(null), 500);
        return next;
      });
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const kpis = DASHBOARD_KPIs;
  const topAlerts = [...ALERTS].sort((a, b) => b.riskScore - a.riskScore).slice(0, 8);
  const highRiskCount = liveSessions.filter(s => s.riskScore >= 65).length;
  const blockedCount  = liveSessions.filter(s => s.status === 'BLOCKED').length;

  return (
    <div style={{ padding: '16px', minHeight: '100%', background: 'var(--bg)' }}>

      {/* KPI strip — 6 cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', marginBottom: '12px' }}>
        <KpiCard
          label="Sessions Today"
          value={kpis.sessionsToday}
          format={n => n.toLocaleString()}
          sub="monitored"
          delta={{ value: '+12.3% 24h', up: true }}
          topColor="var(--bdr2)"
        />
        <KpiCard
          label="Active Now"
          value={liveSessions.length}
          format={n => String(n)}
          sub="live sessions"
          delta={{ value: '↑ 12/min', up: true }}
          topColor={COLORS.accent}
        />
        <KpiCard
          label="Alerts Triggered"
          value={kpis.alertsTriggered}
          format={n => String(n)}
          sub={`${ALERTS.filter(a => a.status === 'PENDING').length} pending`}
          subColor={COLORS.warning}
          topColor={COLORS.warning}
        />
        <KpiCard
          label="Interventions"
          value={kpis.interventionsDeployed}
          format={n => String(n)}
          sub="3 active"
          subColor={COLORS.orange}
          topColor={COLORS.orange}
        />
        <KpiCard
          label="High Risk / Blocked"
          value={blockedCount}
          format={n => String(n)}
          sub={`${highRiskCount} high risk`}
          subColor={COLORS.danger}
          topColor={COLORS.danger}
        />
        <KpiCard
          label="Loss Prevented"
          value={kpis.lossPreventedEUR}
          format={fmtEur}
          sub="this week"
          subColor={COLORS.safe}
          topColor={COLORS.safe}
          delta={{ value: 'est.', up: null }}
        />
      </div>

      {/* Main content: feed + alerts panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '8px', marginBottom: '8px' }}>

        {/* Live session feed */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--bdr)', overflow: 'hidden' }}>
          <SectionHeader
            label="Active Session Feed"
            right={
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div className="animate-pulse-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: COLORS.accent }} />
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--t4)' }}>refresh 4s · {liveSessions.length} sessions</span>
              </div>
            }
          />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr style={{ background: 'var(--bg)' }}>
                  {['Session ID', 'User', 'Channel', 'Risk', '', 'Status', 'Amount', ''].map((h, i) => (
                    <th key={i} style={{
                      padding: '5px 10px', fontFamily: 'JetBrains Mono', fontSize: '8px', fontWeight: 600,
                      letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--bdr2)',
                      borderBottom: '1px solid var(--bdr)', textAlign: i >= 6 ? 'right' : 'left', whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {liveSessions.map(s => {
                  const scfg = STATUS_CFG[s.status];
                  return (
                    <tr
                      key={s.id}
                      className={flashedId === s.id ? 'row-flash' : ''}
                      style={{ cursor: 'pointer', borderBottom: '1px solid var(--card)' }}
                      onClick={() => navigate(`/dashboard/session/${s.id}`)}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.015)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '6px 10px', fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.accent, whiteSpace: 'nowrap' }}>{s.id}</td>
                      <td style={{ padding: '6px 10px', fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--t3)', whiteSpace: 'nowrap' }}>{s.userId}</td>
                      <td style={{ padding: '6px 10px', fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.channel}</td>
                      <td style={{ padding: '6px 4px 6px 10px' }}>
                        <div style={{ width: '36px', height: '2px', background: 'var(--bdr)' }}>
                          <div style={{ width: `${s.riskScore}%`, height: '100%', background: riskColor(s.riskScore), transition: 'width 0.5s ease' }} />
                        </div>
                      </td>
                      <td style={{ padding: '6px 10px 6px 4px', fontFamily: 'JetBrains Mono', fontSize: '11px', color: riskColor(s.riskScore), fontVariantNumeric: 'tabular-nums', minWidth: '28px' }}>
                        {s.riskScore}
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: scfg.color, background: scfg.bg, padding: '2px 6px', letterSpacing: '0.06em' }}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ padding: '6px 10px', fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--t2)', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        €{s.transactionAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <ExternalLink size={10} color="var(--bdr2)" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alert summary panel */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--bdr)', overflow: 'hidden' }}>
          <SectionHeader
            label="Active Alerts"
            right={
              <span
                onClick={() => navigate('/dashboard/alerts')}
                style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--t4)', cursor: 'pointer', letterSpacing: '0.06em' }}
                onMouseEnter={e => (e.currentTarget.style.color = COLORS.accent)}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--t4)')}
              >
                view all →
              </span>
            }
          />

          {/* Alert table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr auto auto', gap: '0', padding: '5px 12px', borderBottom: '1px solid var(--card)', background: 'var(--bg)' }}>
            {['RISK', 'SIGNAL', 'AMT', 'AGO'].map(h => (
              <div key={h} style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', fontWeight: 600, color: 'var(--bdr2)', letterSpacing: '0.12em' }}>{h}</div>
            ))}
          </div>

          <div style={{ overflowY: 'auto', maxHeight: 'calc(100% - 62px)' }}>
            {topAlerts.map(a => (
              <div
                key={a.id}
                onClick={() => navigate('/dashboard/alerts')}
                style={{
                  display: 'grid', gridTemplateColumns: '32px 1fr auto auto', gap: '0',
                  padding: '7px 12px', borderBottom: '1px solid var(--card)',
                  cursor: 'pointer', alignItems: 'center',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.015)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{
                  fontFamily: 'JetBrains Mono', fontSize: '11px', fontWeight: 700,
                  color: riskColor(a.riskScore), fontVariantNumeric: 'tabular-nums',
                }}>
                  {a.riskScore}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '1px' }}>
                    {a.primarySignal}
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {a.scamType} · {a.userId}
                  </div>
                </div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--t3)', textAlign: 'right', paddingLeft: '8px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {fmtEur(a.transactionAmount)}
                </div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--t4)', textAlign: 'right', paddingLeft: '8px', whiteSpace: 'nowrap' }}>
                  {fmtTime(a.time)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Geo risk map */}
      <div style={{ marginBottom: '8px' }}>
        <GeoRiskMap />
      </div>

      {/* Risk distribution chart */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--bdr)' }}>
        <SectionHeader
          label="Risk Score Distribution — Last 24h"
          right={
            <div style={{ display: 'flex', gap: '16px' }}>
              {[
                { label: 'Avg Risk', color: COLORS.accent },
                { label: 'Alerts', color: COLORS.danger },
              ].map(({ label, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '16px', height: '1px', background: color }} />
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'var(--t4)', letterSpacing: '0.08em' }}>{label}</span>
                </div>
              ))}
            </div>
          }
        />
        <div style={{ padding: '12px 16px 8px', height: '180px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={RISK_DISTRIBUTION_24H} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="rG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={COLORS.accent} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={COLORS.accent} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="aG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={COLORS.danger} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={COLORS.danger} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--bdr)" vertical={false} />
              <XAxis dataKey="hour" tick={{ fill: 'var(--bdr2)', fontFamily: 'JetBrains Mono', fontSize: 9 }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={{ fill: 'var(--bdr2)', fontFamily: 'JetBrains Mono', fontSize: 9 }} axisLine={false} tickLine={false} />
              <ReferenceLine y={60} stroke="var(--bdr2)" strokeDasharray="3 4" label={{ value: 'threshold', position: 'insideTopRight', fill: 'var(--bdr2)', fontFamily: 'JetBrains Mono', fontSize: 8 }} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="avgRisk" name="Avg Risk" stroke={COLORS.accent} strokeWidth={1.5} fill="url(#rG)" dot={false} />
              <Area type="monotone" dataKey="alerts"  name="Alerts"   stroke={COLORS.danger} strokeWidth={1.5} fill="url(#aG)"  dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
