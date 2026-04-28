import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Trash2, ChevronDown, ChevronRight, ScanFace } from 'lucide-react';
import { getSessions, clearSessions } from '../lib/behaviorStore';
import type { BehaviorSnapshot } from '../lib/useBehaviorCapture';
import { COLORS } from '../lib/mockData';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtMs = (ms: number) => ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;

function riskLevel(s: BehaviorSnapshot): { label: string; color: string } {
  const m = s.metrics;
  let score = 0;
  if (m.keyboard.error_rate > 0.25) score++;
  if (m.clipboard.paste_total > 3) score += 2;
  if (m.attention.tab_switch_count > 3) score += 2;
  if (m.keyboard.rhythm_consistency < 0.2) score++;
  if (m.mouse.path_efficiency < 0.35) score++;
  if (m.session.paste_vs_type_ratio > 0.5) score += 2;
  if (m.keyboard.total_keys < 5 && m.clipboard.paste_total > 1) score += 3;
  if (score >= 5) return { label: 'HIGH', color: COLORS.danger };
  if (score >= 2) return { label: 'MED', color: COLORS.warning };
  return { label: 'LOW', color: COLORS.safe };
}

function exportJson(snapshot: BehaviorSnapshot) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${snapshot.session_id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Expanded session detail ───────────────────────────────────────────────────

function SessionDetail({ s }: { s: BehaviorSnapshot }) {
  const [tab, setTab] = useState<'mouse' | 'keyboard' | 'session' | 'attention' | 'device'>('mouse');
  const m = s.metrics;

  const tabBtn = (t: typeof tab, label: string) => (
    <button
      key={t}
      onClick={() => setTab(t)}
      style={{
        padding: '5px 12px',
        fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em',
        textTransform: 'uppercase', cursor: 'pointer',
        background: tab === t ? 'rgba(170,85,227,0.08)' : 'transparent',
        border: `1px solid ${tab === t ? COLORS.accent : 'var(--bdr)'}`,
        color: tab === t ? COLORS.accent : COLORS.muted,
        marginRight: '4px',
      }}
    >
      {label}
    </button>
  );

  const pairs = (obj: Record<string, unknown>) => Object.entries(obj).map(([k, v]) => (
    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--bdr)' }}>
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--t3)', flexShrink: 0, marginRight: '12px' }}>{k}</span>
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.primary, textAlign: 'right', wordBreak: 'break-all' }}>
        {Array.isArray(v) ? (v.join(', ') || '—') : typeof v === 'number' ? (k.endsWith('_ms') ? fmtMs(v) : Number.isInteger(v) ? v.toString() : (v as number).toFixed(4)) : String(v ?? '—')}
      </span>
    </div>
  ));

  return (
    <tr>
      <td colSpan={11} style={{ padding: 0 }}>
        <div style={{ background: '#0D0D10', borderBottom: '1px solid var(--bdr)', padding: '16px 20px' }}>
          {/* Tabs */}
          <div style={{ marginBottom: '14px', display: 'flex', flexWrap: 'wrap', gap: '0' }}>
            {tabBtn('mouse', 'Mouse')}
            {tabBtn('keyboard', 'Keyboard')}
            {tabBtn('session', 'Session')}
            {tabBtn('attention', 'Attention')}
            {tabBtn('device', 'Device')}
          </div>
          {/* Content */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 32px', maxHeight: '280px', overflowY: 'auto' }}>
            {tab === 'mouse' && pairs(m.mouse as unknown as Record<string, unknown>)}
            {tab === 'keyboard' && [...pairs(m.keyboard as unknown as Record<string, unknown>), ...pairs(m.clipboard as unknown as Record<string, unknown>)]}
            {tab === 'session' && pairs(m.session as unknown as Record<string, unknown>)}
            {tab === 'attention' && pairs(m.attention as unknown as Record<string, unknown>)}
            {tab === 'device' && pairs(m.device as unknown as Record<string, unknown>)}
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CapturedSessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState(() => getSessions());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  function handleClear() {
    clearSessions();
    setSessions([]);
    setConfirmClear(false);
    setExpandedId(null);
  }

  function toggleRow(id: string) {
    setExpandedId(prev => prev === id ? null : id);
  }

  if (sessions.length === 0) {
    return (
      <div style={{ padding: '32px', minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <button onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted, fontFamily: 'JetBrains Mono', fontSize: '11px', padding: 0 }}>
            <ArrowLeft size={13} /> Back
          </button>
          <div style={{ width: '1px', height: '16px', background: 'var(--bdr)' }} />
          <span style={{ fontFamily: 'Inter', fontSize: '15px', fontWeight: 600, color: COLORS.primary }}>Captured Sessions</span>
        </div>
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.muted, marginBottom: '12px' }}>No sessions captured yet</div>
          <button
            onClick={() => navigate('/dashboard/payment-capture')}
            style={{ background: 'transparent', border: `1px solid ${COLORS.accent}`, color: COLORS.accent, fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '9px 20px', cursor: 'pointer' }}
          >
            Go to Capture
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted, fontFamily: 'JetBrains Mono', fontSize: '11px', padding: 0 }}>
            <ArrowLeft size={13} /> Back
          </button>
          <div style={{ width: '1px', height: '16px', background: 'var(--bdr)' }} />
          <div>
            <div style={{ fontFamily: 'Inter', fontSize: '15px', fontWeight: 600, color: COLORS.primary }}>Captured Sessions</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.muted }}>{sessions.length} behavioral profile{sessions.length !== 1 ? 's' : ''} stored locally</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/dashboard/payment-capture')}
            style={{ background: COLORS.accent, border: 'none', color: 'var(--bg)', fontFamily: 'JetBrains Mono', fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px', cursor: 'pointer' }}
          >
            + New Capture
          </button>
          {confirmClear ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.warning }}>Clear all?</span>
              <button onClick={handleClear} style={{ background: COLORS.danger, border: 'none', color: '#fff', fontFamily: 'JetBrains Mono', fontSize: '10px', padding: '6px 12px', cursor: 'pointer' }}>Yes</button>
              <button onClick={() => setConfirmClear(false)} style={{ background: 'transparent', border: '1px solid var(--bdr)', color: COLORS.muted, fontFamily: 'JetBrains Mono', fontSize: '10px', padding: '6px 12px', cursor: 'pointer' }}>No</button>
            </div>
          ) : (
            <button onClick={() => setConfirmClear(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid var(--bdr)', color: COLORS.muted, fontFamily: 'JetBrains Mono', fontSize: '10px', padding: '7px 12px', cursor: 'pointer' }}>
              <Trash2 size={11} /> Clear all
            </button>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total Sessions', value: sessions.length },
          { label: 'High Risk', value: sessions.filter(s => riskLevel(s).label === 'HIGH').length, color: COLORS.danger },
          { label: 'Paste-Heavy', value: sessions.filter(s => s.metrics.clipboard.paste_total > 3).length, color: COLORS.warning },
          { label: 'Tab Switchers', value: sessions.filter(s => s.metrics.attention.tab_switch_count > 2).length, color: COLORS.warning },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--card)', border: '1px solid var(--bdr)', padding: '14px 16px' }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: COLORS.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '22px', fontWeight: 600, color: color ?? COLORS.accent }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--bdr)', overflowX: 'auto' }}>
        <table className="sl-table">
          <thead>
            <tr>
              <th style={{ width: '28px' }} />
              <th>Session ID</th>
              <th>User ID</th>
              <th>Captured</th>
              <th>Analyst</th>
              <th>Risk</th>
              <th>Features</th>
              <th>Keys</th>
              <th>Error Rate</th>
              <th>Pastes</th>
              <th>Tab Switches</th>
              <th>Duration</th>
              <th>Nav Style</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sessions.map(s => {
              const risk = riskLevel(s);
              const expanded = expandedId === s.session_id;
              return (
                <>
                  <tr
                    key={s.session_id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleRow(s.session_id)}
                  >
                    <td>
                      {expanded
                        ? <ChevronDown size={12} color={COLORS.accent} />
                        : <ChevronRight size={12} color={COLORS.muted} />}
                    </td>
                    <td style={{ color: COLORS.accent }}>{s.session_id}</td>
                    <td>
                      {s.user_id ? (
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/dashboard/behavior-profile?user=${encodeURIComponent(s.user_id!)}`); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: COLORS.accent, fontFamily: 'JetBrains Mono', fontSize: '10px', padding: 0 }}
                          title="View behavioral profile"
                        >
                          <ScanFace size={11} />
                          {s.user_id}
                        </button>
                      ) : (
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.muted }}>—</span>
                      )}
                    </td>
                    <td style={{ color: COLORS.muted }}>{new Date(s.captured_at).toLocaleString()}</td>
                    <td>{s.analyst}</td>
                    <td>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: risk.color, fontWeight: 600 }}>
                        {risk.label}
                      </span>
                    </td>
                    <td style={{ color: COLORS.accent }}>{s.total_features}</td>
                    <td>{s.metrics.keyboard.total_keys}</td>
                    <td style={{ color: s.metrics.keyboard.error_rate > 0.1 ? COLORS.warning : COLORS.primary }}>
                      {(s.metrics.keyboard.error_rate * 100).toFixed(1)}%
                    </td>
                    <td style={{ color: s.metrics.clipboard.paste_total > 2 ? COLORS.warning : COLORS.primary }}>
                      {s.metrics.clipboard.paste_total}
                    </td>
                    <td style={{ color: s.metrics.attention.tab_switch_count > 2 ? COLORS.danger : COLORS.primary }}>
                      {s.metrics.attention.tab_switch_count}
                    </td>
                    <td style={{ color: COLORS.muted }}>{fmtMs(s.metrics.session.total_duration_ms)}</td>
                    <td style={{ color: COLORS.muted }}>{s.metrics.session.form_navigation_style}</td>
                    <td onClick={e => { e.stopPropagation(); exportJson(s); }}>
                      <button style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted, fontFamily: 'JetBrains Mono', fontSize: '10px', padding: '2px 6px' }}>
                        <Download size={11} />
                      </button>
                    </td>
                  </tr>
                  {expanded && <SessionDetail key={`${s.session_id}-detail`} s={s} />}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
