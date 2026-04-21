import { useParams, useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { ArrowLeft, Phone, Monitor, Eye, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { SESSIONS, COLORS, type SessionStatus } from '../lib/mockData';

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

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Berlin' });
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0F0F12', border: '1px solid #1E1E22', padding: '8px 12px', fontFamily: 'IBM Plex Mono', fontSize: '11px' }}>
      <div style={{ color: COLORS.muted, marginBottom: '4px' }}>{label}s</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </div>
      ))}
    </div>
  );
};

function Card({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#111115', border: '1px solid #1E1E22', ...style }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1E1E22' }}>
        <span style={{ fontFamily: 'DM Sans', fontSize: '12px', fontWeight: 500, color: COLORS.primary, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {title}
        </span>
      </div>
      <div style={{ padding: '16px' }}>
        {children}
      </div>
    </div>
  );
}

function SignalRow({ label, value, highlight = false }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #1E1E22' }}>
      <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '11px', color: COLORS.muted }}>{label}</span>
      <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '11px', color: highlight ? COLORS.danger : COLORS.primary, fontWeight: highlight ? 600 : 400 }}>
        {value}
      </span>
    </div>
  );
}

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const session = SESSIONS.find(s => s.id === id) ?? SESSIONS[0];
  const { signals } = session;

  const pauseBarData = [
    { name: 'Baseline', value: signals.preConfirmationPauseBaseline, fill: COLORS.muted },
    { name: 'This Session', value: signals.preConfirmationPause, fill: riskColor(session.riskScore) },
  ];

  const statusCfg = STATUS_CONFIG[session.status];

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#0A0A0B' }}>

      {/* Back + header */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted, fontFamily: 'IBM Plex Mono', fontSize: '11px', padding: '0 0 12px 0' }}
        >
          <ArrowLeft size={13} /> Back to Dashboard
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ fontFamily: 'IBM Plex Mono', fontSize: '20px', fontWeight: 600, color: COLORS.accent, margin: 0 }}>
                {session.id}
              </h1>
              <span style={{ background: statusCfg.bg, color: statusCfg.text, fontFamily: 'IBM Plex Mono', fontSize: '11px', fontWeight: 600, padding: '3px 10px', border: `1px solid ${statusCfg.text}44` }}>
                {session.status}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '20px', marginTop: '6px' }}>
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '11px', color: COLORS.muted }}>User: <span style={{ color: COLORS.primary }}>{session.userId}</span></span>
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '11px', color: COLORS.muted }}>Channel: <span style={{ color: COLORS.primary, textTransform: 'uppercase' }}>{session.channel}</span></span>
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '11px', color: COLORS.muted }}>Country: <span style={{ color: COLORS.primary }}>{session.country}</span></span>
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '11px', color: COLORS.muted }}>Amount: <span style={{ color: COLORS.primary }}>€{session.transactionAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</span></span>
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '11px', color: COLORS.muted }}>Started: <span style={{ color: COLORS.primary }}>{fmtTime(session.startTime)}</span></span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '42px', fontWeight: 700, color: riskColor(session.riskScore), lineHeight: 1 }}>
              {session.riskScore}
            </div>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '10px', color: COLORS.muted, marginTop: '2px' }}>risk score</div>
          </div>
        </div>
      </div>

      {/* Row 1: signal flags + risk timeline */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>

        {/* Key signals */}
        <Card title="Behavioral Signals" style={{ flex: '0 0 340px' }}>
          <SignalRow label="Typing cadence deviation" value={`${signals.typingCadenceDeviation.toFixed(2)} SD`} highlight={signals.typingCadenceDeviation > 2.5} />
          <SignalRow label="Pre-confirmation pause" value={`${signals.preConfirmationPause.toFixed(1)}s`} highlight={signals.preConfirmationPause > signals.preConfirmationPauseBaseline * 2} />
          <SignalRow label="Pause baseline" value={`${signals.preConfirmationPauseBaseline.toFixed(1)}s`} />
          <SignalRow label="Scroll depth (confirm screen)" value={
            <span style={{ color: signals.scrollDepth < 40 ? COLORS.danger : COLORS.safe }}>{signals.scrollDepth}%</span>
          } />
          <div style={{ padding: '10px 0', borderBottom: '1px solid #1E1E22' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '11px', color: COLORS.muted, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone size={11} /> Active call detected
              </span>
              {signals.activeCallDetected
                ? <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: COLORS.danger, fontFamily: 'IBM Plex Mono', fontSize: '11px', fontWeight: 600 }}><AlertTriangle size={11} /> YES</div>
                : <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: COLORS.safe, fontFamily: 'IBM Plex Mono', fontSize: '11px' }}><CheckCircle size={11} /> NO</div>
              }
            </div>
            {signals.activeCallDetected && (
              <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '10px', color: COLORS.muted, marginTop: '4px' }}>
                Last call: {signals.timeSinceLastCall}s before confirmation
              </div>
            )}
          </div>
          <div style={{ padding: '10px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '11px', color: COLORS.muted, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Monitor size={11} /> Remote access tool
              </span>
              {signals.remoteAccessDetected
                ? <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: COLORS.danger, fontFamily: 'IBM Plex Mono', fontSize: '11px', fontWeight: 600 }}><XCircle size={11} /> DETECTED</div>
                : <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: COLORS.safe, fontFamily: 'IBM Plex Mono', fontSize: '11px' }}><CheckCircle size={11} /> CLEAN</div>
              }
            </div>
          </div>

          {/* Scroll depth bar */}
          <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #1E1E22' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '10px', color: COLORS.muted, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Eye size={10} /> Scroll depth on confirm screen
              </span>
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '10px', color: signals.scrollDepth < 40 ? COLORS.danger : COLORS.safe }}>
                {signals.scrollDepth}%
              </span>
            </div>
            <div style={{ height: '4px', background: '#1E1E22', width: '100%' }}>
              <div style={{ height: '100%', width: `${signals.scrollDepth}%`, background: signals.scrollDepth < 40 ? COLORS.danger : COLORS.safe, transition: 'width 0.8s ease' }} />
            </div>
          </div>
        </Card>

        {/* Risk timeline */}
        <Card title="Risk Score Timeline (session duration)" style={{ flex: 1 }}>
          <div style={{ height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={signals.riskTimeline} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" vertical={false} />
                <XAxis dataKey="t" tick={{ fill: COLORS.muted, fontFamily: 'IBM Plex Mono', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}s`} interval={4} />
                <YAxis domain={[0, 100]} tick={{ fill: COLORS.muted, fontFamily: 'IBM Plex Mono', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine y={65} stroke={COLORS.orange} strokeDasharray="4 4" strokeWidth={1} />
                <ReferenceLine y={85} stroke={COLORS.danger} strokeDasharray="4 4" strokeWidth={1} />
                <Line type="monotone" dataKey="value" name="Risk Score" stroke={riskColor(session.riskScore)} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: riskColor(session.riskScore) }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Row 2: typing cadence + pre-conf pause */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
        <Card title="Typing Cadence Deviation vs Personal Baseline (SD)" style={{ flex: 1 }}>
          <div style={{ height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={signals.typingCadenceTimeline} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" vertical={false} />
                <XAxis dataKey="t" tick={{ fill: COLORS.muted, fontFamily: 'IBM Plex Mono', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}s`} interval={5} />
                <YAxis tick={{ fill: COLORS.muted, fontFamily: 'IBM Plex Mono', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine y={0} stroke={COLORS.muted} strokeWidth={1} />
                <ReferenceLine y={2} stroke={COLORS.warning} strokeDasharray="3 3" strokeWidth={1} />
                <ReferenceLine y={-2} stroke={COLORS.warning} strokeDasharray="3 3" strokeWidth={1} />
                <Line type="monotone" dataKey="value" name="Deviation (SD)" stroke={COLORS.accent} strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Pre-Confirmation Pause: Session vs Baseline (seconds)" style={{ flex: '0 0 280px' }}>
          <div style={{ height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pauseBarData} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" horizontal={true} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: COLORS.muted, fontFamily: 'IBM Plex Mono', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: COLORS.muted, fontFamily: 'IBM Plex Mono', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Seconds" radius={0}>
                  {pauseBarData.map((entry, i) => (
                    <rect key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Row 3: signal contributions + intervention log */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>

        {/* Signal contributions */}
        <Card title="Signal Contribution to Risk Score" style={{ flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {signals.signalContributions.map(c => (
              <div key={c.signal}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '11px', color: COLORS.primary }}>{c.signal}</span>
                  <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '11px', color: COLORS.muted }}>{c.value}</span>
                </div>
                <div style={{ height: '5px', background: '#1E1E22', width: '100%' }}>
                  <div style={{ height: '100%', width: `${c.weight}%`, background: c.weight > 70 ? COLORS.danger : c.weight > 50 ? COLORS.orange : COLORS.warning, transition: 'width 1s ease' }} />
                </div>
                <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '9px', color: COLORS.muted, marginTop: '3px', textAlign: 'right' }}>{c.weight}% contribution</div>
              </div>
            ))}
            {signals.signalContributions.length === 0 && (
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '11px', color: COLORS.muted }}>No significant signals detected</span>
            )}
          </div>
        </Card>

        {/* Intervention log */}
        <Card title="Intervention Log" style={{ flex: 1 }}>
          {signals.interventionLog.length === 0 ? (
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '11px', color: COLORS.muted }}>No interventions triggered</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {signals.interventionLog.map(inv => (
                <div key={inv.id} style={{ padding: '10px', background: '#0F0F12', border: '1px solid #1E1E22' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '10px', color: COLORS.accent }}>{inv.id}</span>
                    <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '10px', color: COLORS.muted, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={9} /> {fmtTime(inv.triggeredAt)}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'DM Sans', fontSize: '12px', color: COLORS.primary, marginBottom: '4px' }}>{inv.type}</div>
                  <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '10px', color: COLORS.muted }}>
                    Outcome: <span style={{ color: COLORS.warning }}>{inv.outcome}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Explainability block */}
      <div style={{ background: 'rgba(0, 229, 204, 0.04)', border: '1px solid rgba(0, 229, 204, 0.15)', padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{ marginTop: '2px', flexShrink: 0 }}>
            <div style={{ width: '3px', height: '52px', background: COLORS.accent }} />
          </div>
          <div>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '10px', color: COLORS.accent, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Explainability — Audit Log
            </div>
            <p style={{ fontFamily: 'IBM Plex Mono', fontSize: '12px', color: COLORS.primary, lineHeight: 1.7, margin: 0 }}>
              {signals.explainabilityText}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
