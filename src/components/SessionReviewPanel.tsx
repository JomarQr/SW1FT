import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, ShieldOff, Eye, RotateCcw } from 'lucide-react';
import {
  saveFeedback, getFeedbackForSession,
  type SessionFeedback, type OverrideStatus,
} from '../lib/feedbackStore';
import type { Session } from '../lib/mockData';
import { COLORS } from '../lib/mockData';

/* ── constants ───────────────────────────────────────────────────────────── */

const STATUS_META: Record<OverrideStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  SAFE:    { label: 'Safe',    color: 'var(--green)',  bg: 'rgba(0,204,122,0.08)',   icon: <CheckCircle  size={11} /> },
  WATCH:   { label: 'Watch',   color: 'var(--yellow)', bg: 'rgba(255,184,0,0.08)',   icon: <Eye          size={11} /> },
  ALERT:   { label: 'Alert',   color: 'var(--orange)', bg: 'rgba(255,140,0,0.08)',   icon: <AlertTriangle size={11} /> },
  BLOCKED: { label: 'Blocked', color: 'var(--red)',    bg: 'rgba(255,59,92,0.1)',    icon: <ShieldOff    size={11} /> },
};

const REASON_PRESETS = [
  'Confirmed legitimate transaction — known merchant',
  'User confirmed via step-up auth',
  'Pattern consistent with historical behaviour',
  'False positive — travel / VPN identified',
  'Manual KYC review passed',
  'Transaction matches approved whitelist',
];

/* ── props ───────────────────────────────────────────────────────────────── */

interface Props {
  session: Session | null;
  onClose: () => void;
  onSaved: () => void;
}

/* ── component ───────────────────────────────────────────────────────────── */

export default function SessionReviewPanel({ session, onClose, onSaved }: Props) {
  const [override, setOverride]   = useState<OverrideStatus>('SAFE');
  const [reason, setReason]       = useState('');
  const [saved, setSaved]         = useState(false);
  const [existing, setExisting]   = useState<SessionFeedback | null>(null);

  useEffect(() => {
    if (!session) return;
    setSaved(false);
    setReason('');
    const prev = getFeedbackForSession(session.id);
    if (prev) {
      setExisting(prev);
      setOverride(prev.overrideStatus);
      setReason(prev.reason);
      setSaved(true);
    } else {
      setExisting(null);
      setOverride(session.status as OverrideStatus);
    }
  }, [session?.id]);

  if (!session) return null;

  function riskColor(score: number) {
    if (score >= 85) return COLORS.danger;
    if (score >= 65) return COLORS.orange;
    if (score >= 40) return COLORS.warning;
    return COLORS.safe;
  }

  function handleSubmit() {
    const feedback: SessionFeedback = {
      id: `fb_${Date.now()}`,
      sessionId: session!.id,
      userId: session!.userId,
      originalStatus: session!.status,
      originalRiskScore: session!.riskScore,
      overrideStatus: override,
      reason: reason.trim(),
      analyst: 'J. Springis',
      timestamp: new Date().toISOString(),
      modelWasCorrect: override === session!.status,
    };
    saveFeedback(feedback);
    setExisting(feedback);
    setSaved(true);
    onSaved();
  }

  function handleReset() {
    setSaved(false);
    setExisting(null);
    setOverride(session.status as OverrideStatus);
    setReason('');
  }

  const rc = riskColor(session.riskScore);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.35)',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: '32px', right: 0, bottom: 0, width: '360px',
        background: 'var(--bg)', borderLeft: '1px solid var(--bdr)',
        zIndex: 201, display: 'flex', flexDirection: 'column',
        animation: 'slide-in-right 0.18s ease-out',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '11px 14px', borderBottom: '1px solid var(--bdr)',
        }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', fontWeight: 700, color: 'var(--t4)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '2px' }}>
              Session Review
            </div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.accent }}>{session.id}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--bdr)', padding: '5px', cursor: 'pointer', color: 'var(--t4)', display: 'flex', alignItems: 'center' }}>
            <X size={12} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>

          {/* Session snapshot */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--bdr)', padding: '11px 12px', marginBottom: '14px' }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', fontWeight: 700, color: 'var(--t5)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '8px' }}>Session Snapshot</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
              {[
                ['User ID', session.userId, 'var(--t2)'],
                ['Channel', session.channel, 'var(--t3)'],
                ['Amount', `€${session.transactionAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}`, 'var(--t1)'],
                ['Risk Score', String(session.riskScore), rc],
              ].map(([k, v, c]) => (
                <div key={k}>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'var(--t5)', marginBottom: '2px', letterSpacing: '0.1em' }}>{k}</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: c, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Model decision */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', fontWeight: 700, color: 'var(--t5)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '6px' }}>Model Decision</div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: STATUS_META[session.status as OverrideStatus]?.bg ?? 'var(--card)',
              border: `1px solid ${STATUS_META[session.status as OverrideStatus]?.color ?? 'var(--bdr)'}44`,
              padding: '8px 11px',
            }}>
              <span style={{ color: STATUS_META[session.status as OverrideStatus]?.color ?? 'var(--t3)' }}>
                {STATUS_META[session.status as OverrideStatus]?.icon}
              </span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', fontWeight: 600, color: STATUS_META[session.status as OverrideStatus]?.color ?? 'var(--t2)' }}>
                {session.status}
              </span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--t4)', marginLeft: 'auto' }}>
                score {session.riskScore}/100
              </span>
            </div>
          </div>

          {saved ? (
            /* ── Saved state ── */
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', fontWeight: 700, color: 'var(--t5)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>Feedback Submitted</div>
                <button
                  onClick={handleReset}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', fontFamily: 'JetBrains Mono', fontSize: '9px' }}
                >
                  <RotateCcw size={10} /> Revise
                </button>
              </div>
              <div style={{
                background: 'var(--surface)', border: '1px solid var(--bdr)',
                padding: '11px 12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <span style={{ color: STATUS_META[override].color }}>{STATUS_META[override].icon}</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', fontWeight: 600, color: STATUS_META[override].color }}>
                    Override → {override}
                  </span>
                  {existing?.modelWasCorrect && (
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'var(--green)', background: 'rgba(0,204,122,0.08)', border: '1px solid rgba(0,204,122,0.2)', padding: '1px 5px', marginLeft: 'auto' }}>
                      CONFIRMED
                    </span>
                  )}
                </div>
                {existing?.reason && (
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--t3)', lineHeight: 1.6, borderTop: '1px solid var(--bdr)', paddingTop: '8px' }}>
                    "{existing.reason}"
                  </div>
                )}
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'var(--t5)', marginTop: '6px' }}>
                  {new Date(existing?.timestamp ?? '').toLocaleString()} · {existing?.analyst}
                </div>
              </div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'var(--green)', marginTop: '8px', letterSpacing: '0.06em' }}>
                ✓ Added to training queue
              </div>
            </div>
          ) : (
            /* ── Edit state ── */
            <div>
              {/* Override selector */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', fontWeight: 700, color: 'var(--t5)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Analyst Override
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                  {(Object.keys(STATUS_META) as OverrideStatus[]).map(s => {
                    const m = STATUS_META[s];
                    const active = override === s;
                    return (
                      <button
                        key={s}
                        onClick={() => setOverride(s)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '7px 10px',
                          background: active ? m.bg : 'transparent',
                          border: `1px solid ${active ? m.color + '88' : 'var(--bdr)'}`,
                          color: active ? m.color : 'var(--t4)',
                          cursor: 'pointer', fontFamily: 'JetBrains Mono', fontSize: '10px',
                          fontWeight: active ? 600 : 400,
                          transition: 'all 0.1s',
                        }}
                      >
                        <span style={{ color: active ? m.color : 'var(--t5)' }}>{m.icon}</span>
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reason */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', fontWeight: 700, color: 'var(--t5)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Justification
                </div>
                {/* Quick presets */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                  {REASON_PRESETS.map(p => (
                    <button
                      key={p}
                      onClick={() => setReason(p)}
                      style={{
                        background: reason === p ? 'var(--accent-bg)' : 'transparent',
                        border: `1px solid ${reason === p ? 'var(--accent-d)44' : 'var(--bdr)'}`,
                        color: reason === p ? 'var(--accent-lt)' : 'var(--t5)',
                        fontFamily: 'JetBrains Mono', fontSize: '8px', padding: '3px 7px',
                        cursor: 'pointer', letterSpacing: '0.02em',
                        transition: 'all 0.1s',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Add a note for the training dataset…"
                  style={{
                    width: '100%', minHeight: '72px', resize: 'vertical',
                    background: 'var(--surface)', border: '1px solid var(--bdr)',
                    color: 'var(--t1)', fontFamily: 'JetBrains Mono', fontSize: '10px',
                    padding: '8px 10px', outline: 'none', boxSizing: 'border-box',
                    lineHeight: 1.6,
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent-d)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--bdr)')}
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!reason.trim()}
                style={{
                  width: '100%', padding: '10px',
                  background: reason.trim() ? 'var(--accent)' : 'var(--card)',
                  border: 'none', cursor: reason.trim() ? 'pointer' : 'not-allowed',
                  color: reason.trim() ? '#fff' : 'var(--t5)',
                  fontFamily: 'JetBrains Mono', fontSize: '10px', fontWeight: 600,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  transition: 'background 0.15s',
                }}
              >
                Submit Feedback
              </button>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'var(--t5)', textAlign: 'center', marginTop: '6px' }}>
                This label will be added to the model training queue
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
