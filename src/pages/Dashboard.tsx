import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, Shield, Activity, TrendingUp, ExternalLink, Clock } from 'lucide-react';
import {
  SESSIONS, ALERTS, DASHBOARD_KPIs, RISK_DISTRIBUTION_24H, COLORS,
  type Session, type SessionStatus,
} from '../lib/mockData';

// ─── Helpers ───────────────────────────────────────────────────────────────

function riskColor(score: number): string {
  if (score >= 85) return COLORS.danger;
  if (score >= 65) return COLORS.orange;
  if (score >= 40) return COLORS.warning;
  return COLORS.safe;
}

const STATUS_CONFIG: Record<SessionStatus, { bg: string; text: string }> = {
  SAFE:    { bg: 'rgba(0,204,122,0.12)',  text: '#00CC7A' },
  WATCH:   { bg: 'rgba(255,184,0,0.12)',  text: '#FFB800' },
  ALERT:   { bg: 'rgba(255,140,0,0.12)',  text: '#FF8C00' },
  BLOCKED: { bg: 'rgba(255,59,92,0.14)',  text: '#FF3B5C' },
};

function StatusBadge({ status }: { status: SessionStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span style={{
      background: cfg.bg, color: cfg.text,
      fontFamily: 'IBM Plex Mono', fontSize: '10px', fontWeight: 500,
      padding: '2px 7px', letterSpacing: '0.08em',
      border: `1px solid ${cfg.text}33`,
    }}>
      {status}
    </span>
  );
}

function useCountUp(target: number, duration = 1400): number {
  const [val, setVal] = useState(0);
  const start = useRef<number | null>(null);
  useEffect(() => {
    start.current = null;
    const animate = (now: number) => {
      if (!start.current) start.current = now;
      const progress = Math.min((now - start.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);
  return val;
}

function fmtEur(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}K`;
  return `€${n}`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// ─── KPI Card ──────────────────────────────────────────────────────────────

function KPICard({ icon: Icon, label, value, format, sub, accent = false }: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  value: number;
  format: (n: number) => string;
  sub?: string;
  accent?: boolean;
}) {
  const displayed = useCountUp(value);
  return (
    <div style={{
      background: '#111115',
      border: `1px solid ${accent ? 'rgba(0,229,204,0.2)' : '#1E1E22'}`,
      padding: '20px',
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontFamily: 'DM Sans', fontSize: '12px', color: '#6B6B7A', letterSpacing: '0.02em' }}>{label}</span>
        <Icon size={15} color={accent ? COLORS.accent : COLORS.muted} />
      </div>
      <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '28px', fontWeight: 600, color: accent ? COLORS.accent : COLORS.primary, lineHeight: 1 }}>
        {format(displayed)}
      </div>
      {sub && <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '10px', color: COLORS.muted, marginTop: '6px' }}>{sub}</div>}
    </div>
  );
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0F0F12', border: '1px solid #1E1E22', padding: '8px 12px', fontFamily: 'IBM Plex Mono', fontSize: '11px' }}>
      <div style={{ color: '#6B6B7A', marginBottom: '4px' }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color, display: 'flex', gap: '8px' }}>
          <span style={{ color: '#6B6B7A' }}>{p.name}:</span>
          <span>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Dashboard ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const [liveSessions, setLiveSessions] = useState<Session[]>(() => [...SESSIONS].slice(0, 18));
  const [flashedId, setFlashedId] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveSessions(prev => {
        const idx = Math.floor(Math.random() * prev.length);
        const delta = Math.floor(Math.random() * 9) - 4;
        const updated = {
          ...prev[idx],
          riskScore: Math.min(100, Math.max(0, prev[idx].riskScore + delta)),
        };
        const next = [...prev];
        next[idx] = updated;
        setFlashedId(updated.id);
        setTimeout(() => setFlashedId(null), 600);
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const kpis = DASHBOARD_KPIs;
  const topAlerts = [...ALERTS].sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#0A0A0B' }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'DM Sans', fontSize: '20px', fontWeight: 600, color: COLORS.primary, margin: 0 }}>
            Live Operations
          </h1>
          <p style={{ fontFamily: 'IBM Plex Mono', fontSize: '11px', color: COLORS.muted, marginTop: '4px' }}>
            CET {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Berlin' })} — Monitoring EU-PSP session stream
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="animate-pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS.accent }} />
          <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '11px', color: COLORS.accent }}>LIVE</span>
        </div>
      </div>

      {/* KPI row with glow */}
      <div className="kpi-glow" style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <KPICard icon={Activity}    label="Sessions Monitored Today" value={kpis.sessionsToday}        format={n => n.toLocaleString()} sub="+12.3% vs yesterday" />
        <KPICard icon={AlertTriangle} label="Alerts Triggered"        value={kpis.alertsTriggered}      format={n => String(n)}          sub="12 pending review" />
        <KPICard icon={Shield}       label="Interventions Deployed"   value={kpis.interventionsDeployed} format={n => String(n)}          sub="3 active right now" />
        <KPICard icon={TrendingUp}   label="Est. Loss Prevented"      value={kpis.lossPreventedEUR}      format={fmtEur}                  sub="this week" accent />
      </div>

      {/* Middle row: session feed + top alerts */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>

        {/* Live session feed */}
        <div style={{ flex: '0 0 62%', background: '#111115', border: '1px solid #1E1E22' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #1E1E22', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: 'DM Sans', fontSize: '13px', fontWeight: 500, color: COLORS.primary }}>Active Session Feed</span>
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '10px', color: COLORS.muted, background: '#1E1E22', padding: '1px 6px' }}>
                {liveSessions.length} sessions
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div className="animate-pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: COLORS.accent }} />
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '10px', color: COLORS.accent }}>updating</span>
            </div>
          </div>
          <div style={{ overflowY: 'auto', maxHeight: '420px' }}>
            <table className="sl-table">
              <thead>
                <tr>
                  <th>Session ID</th>
                  <th>User</th>
                  <th>Channel</th>
                  <th>Risk</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {liveSessions.map(s => (
                  <tr
                    key={s.id}
                    className={flashedId === s.id ? 'row-flash' : ''}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/dashboard/session/${s.id}`)}
                  >
                    <td style={{ color: COLORS.accent, fontFamily: 'IBM Plex Mono', fontSize: '11px' }}>{s.id}</td>
                    <td style={{ color: COLORS.muted }}>{s.userId}</td>
                    <td>
                      <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '10px', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {s.channel}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '44px', height: '3px', background: '#1E1E22' }}>
                          <div style={{ width: `${s.riskScore}%`, height: '100%', background: riskColor(s.riskScore), transition: 'width 0.5s ease' }} />
                        </div>
                        <span style={{ color: riskColor(s.riskScore), fontSize: '11px', minWidth: '24px' }}>{s.riskScore}</span>
                      </div>
                    </td>
                    <td><StatusBadge status={s.status} /></td>
                    <td style={{ color: COLORS.muted }}>€{s.transactionAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>
                      <ExternalLink size={12} color={COLORS.muted} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top 5 alerts */}
        <div style={{ flex: 1, background: '#111115', border: '1px solid #1E1E22' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #1E1E22' }}>
            <span style={{ fontFamily: 'DM Sans', fontSize: '13px', fontWeight: 500, color: COLORS.primary }}>Top Active Alerts</span>
          </div>
          <div style={{ padding: '8px 0' }}>
            {topAlerts.map(alert => (
              <div
                key={alert.id}
                onClick={() => navigate('/dashboard/alerts')}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #1E1E22',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontFamily: 'IBM Plex Mono', fontSize: '10px', fontWeight: 600,
                      color: riskColor(alert.riskScore),
                      background: `${riskColor(alert.riskScore)}15`,
                      padding: '1px 6px',
                    }}>
                      {alert.riskScore}
                    </span>
                    <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '10px', color: COLORS.muted }}>{alert.id}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: COLORS.muted }}>
                    <Clock size={10} />
                    <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '10px' }}>{fmtTime(alert.time)}</span>
                  </div>
                </div>
                <div style={{ fontFamily: 'DM Sans', fontSize: '12px', color: COLORS.primary, marginBottom: '4px' }}>
                  {alert.primarySignal}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '10px', color: COLORS.muted, textTransform: 'uppercase' }}>
                    {alert.scamType}
                  </span>
                  <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '10px', color: COLORS.muted }}>·</span>
                  <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '10px', color: COLORS.muted }}>
                    €{alert.transactionAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risk distribution chart */}
      <div style={{ background: '#111115', border: '1px solid #1E1E22' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #1E1E22' }}>
          <span style={{ fontFamily: 'DM Sans', fontSize: '13px', fontWeight: 500, color: COLORS.primary }}>
            Risk Score Distribution — Last 24h
          </span>
        </div>
        <div style={{ padding: '16px', height: '220px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={RISK_DISTRIBUTION_24H} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00E5CC" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#00E5CC" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="alertGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF3B5C" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#FF3B5C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" vertical={false} />
              <XAxis dataKey="hour" tick={{ fill: '#6B6B7A', fontFamily: 'IBM Plex Mono', fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={{ fill: '#6B6B7A', fontFamily: 'IBM Plex Mono', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="avgRisk" name="Avg Risk" stroke="#00E5CC" strokeWidth={1.5} fill="url(#riskGrad)" dot={false} />
              <Area type="monotone" dataKey="alerts" name="Alerts" stroke="#FF3B5C" strokeWidth={1.5} fill="url(#alertGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
