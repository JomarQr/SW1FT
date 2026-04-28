import { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, ShieldX, Clock, KeyRound, AlertTriangle, CheckCircle2, XCircle, Eye, TrendingUp, Sliders } from 'lucide-react';
import {
  getInterventions, getInterventionKPIs, saveIntervention,
  type InterventionRecord, type RiskLevel,
} from '../lib/interventionStore';

const C = {
  red: '#FF3B5C', orange: '#FF8C00', yellow: '#FFB800',
  green: '#00CC7A', accent: '#AA55E3', accentLt: '#C890F0',
  blue: '#5B9BD5', muted: '#6B6B7A', t1: '#E8E8ED', t2: '#9B9BAA',
  bdr: '#1E1E22', surface: '#0F0F12', card: '#111115',
};

const LEVEL_CFG: Record<RiskLevel, { color: string; bg: string; border: string; label: string; icon: React.ElementType }> = {
  APPROVE:      { color: C.green,  bg: 'rgba(0,204,122,0.07)',   border: 'rgba(0,204,122,0.2)',   label: 'APPROVE',      icon: ShieldCheck },
  SOFT_WARNING: { color: C.yellow, bg: 'rgba(255,184,0,0.07)',   border: 'rgba(255,184,0,0.2)',   label: 'SOFT WARNING', icon: AlertTriangle },
  STEP_UP:      { color: C.orange, bg: 'rgba(255,140,0,0.08)',   border: 'rgba(255,140,0,0.22)',  label: 'STEP-UP',      icon: ShieldAlert },
  HIGH_RISK:    { color: C.red,    bg: 'rgba(255,59,92,0.08)',   border: 'rgba(255,59,92,0.25)',  label: 'HIGH RISK',    icon: ShieldX },
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function fmtEur(n: number) {
  return '€' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── User-facing intervention modal (shown during PaymentCapture) ─────────────

interface InterventionModalProps {
  record: InterventionRecord;
  onCancel: () => void;
  onProceed: () => void;
}

export function InterventionModal({ record, onCancel, onProceed }: InterventionModalProps) {
  const cfg = LEVEL_CFG[record.risk_level];
  const Icon = cfg.icon;
  const [cooldown, setCooldown] = useState(record.risk_level === 'HIGH_RISK' ? 8 : 0);
  const [choice, setChoice] = useState<'cancel' | 'proceed' | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  function handleCancel() {
    setChoice('cancel');
    setTimeout(onCancel, 900);
  }
  function handleProceed() {
    setChoice('proceed');
    setTimeout(onProceed, 900);
  }

  if (choice) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          textAlign: 'center', padding: '48px 40px',
          background: C.card, border: `1px solid ${choice === 'cancel' ? 'rgba(0,204,122,0.3)' : 'rgba(255,184,0,0.3)'}`,
          maxWidth: 400, width: '90%',
          animation: 'fadeIn 0.3s ease',
        }}>
          {choice === 'cancel' ? (
            <>
              <CheckCircle2 size={40} color={C.green} style={{ marginBottom: 16 }} />
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '16px', fontWeight: 700, color: C.green, letterSpacing: '0.08em', marginBottom: 8 }}>Payment Cancelled</div>
              <div style={{ fontFamily: 'Inter', fontSize: '13px', color: C.muted }}>→ Fraud Prevented</div>
            </>
          ) : (
            <>
              <AlertTriangle size={40} color={C.yellow} style={{ marginBottom: 16 }} />
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '16px', fontWeight: 700, color: C.yellow, letterSpacing: '0.08em', marginBottom: 8 }}>Payment Proceeded</div>
              <div style={{ fontFamily: 'Inter', fontSize: '13px', color: C.muted }}>→ Marked for monitoring</div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{
        background: C.card, width: '100%', maxWidth: 480,
        border: `1px solid ${cfg.border}`,
        boxShadow: `0 0 40px ${cfg.color}18`,
        animation: 'slideUp 0.25s ease',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${C.bdr}`, background: cfg.bg, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon size={20} color={cfg.color} style={{ flexShrink: 0, animation: record.risk_level === 'HIGH_RISK' ? 'pulse 1.2s infinite' : undefined }} />
          <div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', fontWeight: 700, color: cfg.color, letterSpacing: '0.12em' }}>
              {record.risk_level === 'HIGH_RISK' ? '⚠ HIGH RISK DETECTED' : record.risk_level === 'STEP_UP' ? '⚠ UNUSUAL ACTIVITY DETECTED' : 'SOFT WARNING'}
            </div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted, marginTop: 2 }}>
              Session {record.session_id} · Risk score {record.risk_score}/100
            </div>
          </div>
        </div>

        {/* Risk score + confidence */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.bdr}`, display: 'flex', gap: 24 }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Risk Score</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '28px', fontWeight: 700, color: cfg.color }}>{record.risk_score}</div>
          </div>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Confidence</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '28px', fontWeight: 700, color: C.t1 }}>
              {record.risk_score >= 80 ? 'High' : record.risk_score >= 60 ? 'Medium' : 'Low'}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Risk Level</div>
            <div style={{ height: 6, background: C.bdr, borderRadius: 3 }}>
              <div style={{ height: '100%', width: `${record.risk_score}%`, background: cfg.color, borderRadius: 3, transition: 'width 0.6s ease' }} />
            </div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: cfg.color, marginTop: 4, letterSpacing: '0.08em' }}>{cfg.label}</div>
          </div>
        </div>

        {/* Message */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.bdr}` }}>
          <div style={{ fontFamily: 'Inter', fontSize: '13px', color: C.t1, lineHeight: 1.65, fontWeight: 500, marginBottom: 6 }}>
            Unusual Activity Detected
          </div>
          <div style={{ fontFamily: 'Inter', fontSize: '12px', color: C.muted, lineHeight: 1.7 }}>
            This payment appears unusual compared to your normal activity. Please confirm that you are making this payment of your own free will and are not being instructed by someone else.
          </div>
        </div>

        {/* Recommended actions */}
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.bdr}` }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            Recommended Actions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {record.recommended_actions.map((action, i) => {
              const icons = [<Clock size={12} />, <AlertTriangle size={12} />, <KeyRound size={12} />];
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: cfg.color, flexShrink: 0 }}>{icons[i] ?? icons[0]}</span>
                  <span style={{ fontFamily: 'Inter', fontSize: '12px', color: C.t2 }}>{action}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top risk factors */}
        {record.top_risk_factors.length > 0 && (
          <div style={{ padding: '10px 20px', borderBottom: `1px solid ${C.bdr}` }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Top Risk Signals</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {record.top_risk_factors.map(f => (
                <span key={f} style={{ padding: '2px 8px', background: `${cfg.color}12`, border: `1px solid ${cfg.color}30`, color: cfg.color, fontFamily: 'JetBrains Mono', fontSize: '10px' }}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ padding: '16px 20px', display: 'flex', gap: 10 }}>
          <button
            onClick={handleCancel}
            style={{
              flex: 1, padding: '12px 16px', background: 'rgba(0,204,122,0.1)',
              border: '1px solid rgba(0,204,122,0.3)', cursor: 'pointer',
              fontFamily: 'Inter', fontSize: '13px', fontWeight: 600, color: C.green,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,204,122,0.18)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,204,122,0.1)')}
          >
            <XCircle size={15} /> Cancel Payment
          </button>
          <button
            onClick={handleProceed}
            disabled={cooldown > 0}
            style={{
              flex: 1, padding: '12px 16px',
              background: cooldown > 0 ? 'rgba(255,184,0,0.04)' : 'rgba(255,184,0,0.1)',
              border: `1px solid rgba(255,184,0,${cooldown > 0 ? '0.15' : '0.3'})`,
              cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
              fontFamily: 'Inter', fontSize: '13px', fontWeight: 600,
              color: cooldown > 0 ? C.muted : C.yellow,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              transition: 'background 0.15s',
            }}
          >
            {cooldown > 0
              ? <><Clock size={13} /> Wait {cooldown}s</>
              : <><Eye size={13} /> Proceed Anyway</>
            }
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes pulse   { 0%,100% { opacity:1; } 50% { opacity:0.45; } }
      `}</style>
    </div>
  );
}

// ─── Dashboard panel ──────────────────────────────────────────────────────────

interface InterventionEngineProps {
  threshold: number;
  onThresholdChange: (v: number) => void;
}

export function InterventionEnginePanel({ threshold, onThresholdChange }: InterventionEngineProps) {
  const [interventions, setInterventions] = useState<InterventionRecord[]>([]);
  const [kpis, setKpis] = useState(getInterventionKPIs());
  const [expanded, setExpanded] = useState<string | null>(null);

  function refresh() {
    setInterventions(getInterventions().slice(0, 20));
    setKpis(getInterventionKPIs());
  }

  useEffect(() => {
    refresh();
    const onNew = () => refresh();
    window.addEventListener('sw1ft_new_intervention', onNew);
    return () => window.removeEventListener('sw1ft_new_intervention', onNew);
  }, []);

  // Poll every 3s as fallback
  useEffect(() => {
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, []);

  function relabel(id: string, outcome: 'fraud_prevented' | 'monitoring') {
    const list = getInterventions();
    const r = list.find(e => e.id === id);
    if (!r) return;
    saveIntervention({ ...r, outcome });
    refresh();
  }

  const latestHighRisk = interventions.find(r => r.user_action === 'pending' && r.risk_level !== 'APPROVE');

  return (
    <div style={{ background: C.card, border: `1px solid ${C.bdr}` }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldAlert size={13} color={C.accent} />
          <span style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 600, color: C.t1 }}>Intervention Engine</span>
          {latestHighRisk && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', background: 'rgba(255,59,92,0.12)', border: '1px solid rgba(255,59,92,0.3)', fontFamily: 'JetBrains Mono', fontSize: '9px', color: C.red, animation: 'flashBorder 1.5s infinite' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.red, display: 'inline-block', animation: 'pulse 1s infinite' }} />
              LIVE
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sliders size={11} color={C.muted} />
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: C.muted }}>THRESHOLD</span>
          <input
            type="range" min={40} max={90} step={5} value={threshold}
            onChange={e => onThresholdChange(Number(e.target.value))}
            style={{ width: 70, accentColor: C.accent, cursor: 'pointer' }}
          />
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: threshold >= 80 ? C.red : threshold >= 65 ? C.orange : C.yellow, fontWeight: 600, minWidth: 22 }}>
            {threshold}
          </span>
        </div>
      </div>

      {/* KPI mini-strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: `1px solid ${C.bdr}` }}>
        {[
          { label: 'Triggered', value: kpis.total_triggered, color: C.accent },
          { label: 'Prevented', value: kpis.payments_cancelled, color: C.green },
          { label: 'Override', value: `${kpis.user_override_rate}%`, color: kpis.user_override_rate > 50 ? C.red : C.yellow },
          { label: 'Protected', value: fmtEur(kpis.total_amount_protected), color: C.green },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ padding: '10px 12px', borderRight: `1px solid ${C.bdr}` }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '16px', fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Active intervention highlight */}
      {latestHighRisk && (() => {
        const cfg = LEVEL_CFG[latestHighRisk.risk_level];
        return (
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.bdr}`, background: cfg.bg, border: `1px solid ${cfg.border}`, animation: 'flashBorder 2s infinite' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', fontWeight: 700, color: cfg.color, letterSpacing: '0.1em', marginBottom: 6 }}>
                  ⚠ {cfg.label} · Score {latestHighRisk.risk_score}/100
                </div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: C.muted, marginBottom: 6 }}>
                  {latestHighRisk.session_id} · {fmtTime(latestHighRisk.timestamp)}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {latestHighRisk.recommended_actions.map(a => (
                    <span key={a} style={{ padding: '2px 7px', background: `${cfg.color}12`, border: `1px solid ${cfg.color}25`, fontFamily: 'JetBrains Mono', fontSize: '9px', color: cfg.color }}>{a}</span>
                  ))}
                </div>
              </div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '28px', fontWeight: 700, color: cfg.color }}>{latestHighRisk.risk_score}</div>
            </div>
          </div>
        );
      })()}

      {/* Audit log */}
      {interventions.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted }}>
          No interventions yet — run a payment simulation in Capture
        </div>
      ) : (
        <div style={{ maxHeight: 260, overflowY: 'auto' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '90px 52px 72px 72px 1fr', padding: '5px 14px', borderBottom: `1px solid ${C.bdr}`, fontFamily: 'JetBrains Mono', fontSize: '8px', color: C.muted, letterSpacing: '0.1em' }}>
            <div>SESSION</div><div>SCORE</div><div>LEVEL</div><div>ACTION</div><div>OUTCOME</div>
          </div>
          {interventions.map(r => {
            const cfg = LEVEL_CFG[r.risk_level];
            return (
              <div key={r.id}>
                <div
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  style={{ display: 'grid', gridTemplateColumns: '90px 52px 72px 72px 1fr', padding: '8px 14px', borderBottom: `1px solid ${C.bdr}`, cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.accentLt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.session_id}</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', fontWeight: 600, color: cfg.color }}>{r.risk_score}</div>
                  <div>
                    <span style={{ padding: '1px 5px', background: cfg.bg, border: `1px solid ${cfg.border}`, fontFamily: 'JetBrains Mono', fontSize: '8px', color: cfg.color, letterSpacing: '0.06em' }}>{cfg.label}</span>
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: r.user_action === 'cancel' ? C.green : r.user_action === 'proceed' ? C.yellow : C.muted }}>
                    {r.user_action === 'cancel' ? '✓ CANCELLED' : r.user_action === 'proceed' ? '→ PROCEEDED' : 'PENDING'}
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: r.outcome === 'fraud_prevented' ? C.green : r.outcome === 'monitoring' ? C.yellow : C.muted }}>
                    {r.outcome === 'fraud_prevented' ? 'Fraud Prevented' : r.outcome === 'monitoring' ? 'Monitoring' : '—'}
                    {r.amount > 0 && <span style={{ color: C.muted }}> · {fmtEur(r.amount)}</span>}
                  </div>
                </div>

                {/* Expanded row */}
                {expanded === r.id && (
                  <div style={{ padding: '10px 14px 12px', background: 'rgba(170,85,227,0.03)', borderBottom: `1px solid ${C.bdr}` }}>
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 8 }}>
                      {[['Time', fmtTime(r.timestamp)], ['User', r.user_id], ['Score', r.risk_score], ['Amount', fmtEur(r.amount)]].map(([k, v]) => (
                        <div key={k as string}>
                          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>{k}</div>
                          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: C.t1 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    {r.top_risk_factors.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Risk Factors</div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {r.top_risk_factors.map(f => (
                            <span key={f} style={{ padding: '2px 7px', background: `${cfg.color}10`, border: `1px solid ${cfg.color}25`, fontFamily: 'JetBrains Mono', fontSize: '9px', color: cfg.color }}>{f}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {r.user_action === 'proceed' && r.outcome === 'monitoring' && (
                      <div>
                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 }}>Label Outcome</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => relabel(r.id, 'fraud_prevented')}
                            style={{ padding: '4px 10px', background: 'rgba(255,59,92,0.1)', border: '1px solid rgba(255,59,92,0.25)', cursor: 'pointer', fontFamily: 'JetBrains Mono', fontSize: '9px', color: C.red }}
                          >
                            Fraud Confirmed
                          </button>
                          <button
                            onClick={() => relabel(r.id, 'monitoring')}
                            style={{ padding: '4px 10px', background: 'rgba(0,204,122,0.08)', border: '1px solid rgba(0,204,122,0.2)', cursor: 'pointer', fontFamily: 'JetBrains Mono', fontSize: '9px', color: C.green }}
                          >
                            Legitimate Payment
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes flashBorder { 0%,100%{box-shadow:none} 50%{box-shadow:0 0 12px rgba(255,59,92,0.25)} }
      `}</style>
    </div>
  );
}
