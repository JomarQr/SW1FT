import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, Minus, MessageSquare, Smartphone, X } from 'lucide-react';
import GeoRiskMap from '../components/GeoRiskMap';
import SessionReviewPanel from '../components/SessionReviewPanel';
import { getFeedbackForSession, countFeedbacks } from '../lib/feedbackStore';
import { getLiveSessions, fetchRemoteSessions, type CapturedSession, type RemoteSession } from '../lib/liveSessionStore';
import type { LiveMetrics } from '../lib/useBehaviorCapture';
import { getInterventionKPIs, getRiskLevel } from '../lib/interventionStore';
import { getSessions as getBehaviorSessions } from '../lib/behaviorStore';
import { getRole, getUsername } from '../lib/auth';
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
  label, value, format, sub, subColor, delta,
}: {
  label: string;
  value: number;
  format: (n: number) => string;
  sub?: string;
  subColor?: string;
  delta?: { value: string; up: boolean | null };
}) {
  const displayed = useCountUp(value);
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--bdr)',
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

/* ── transaction detail modal ────────────────────────────────────────────── */

type BioTab = 'mouse' | 'keyboard' | 'clipboard' | 'attention' | 'session' | 'device';

function BRow({
  label, value, status, explain,
}: {
  label: string;
  value: string | number;
  status?: 'ok' | 'warn' | 'alert';
  explain?: string;
}) {
  const [open, setOpen] = useState(false);
  const color = status === 'alert' ? COLORS.danger : status === 'warn' ? COLORS.warning : status === 'ok' ? COLORS.safe : 'var(--t2)';
  const display = typeof value === 'number'
    ? (Number.isInteger(value) ? value.toString() : value.toFixed(3))
    : (value || '—');
  const bgOpen = status === 'alert' ? 'rgba(255,59,92,0.06)' : status === 'warn' ? 'rgba(255,140,0,0.06)' : status === 'ok' ? 'rgba(0,204,122,0.06)' : 'rgba(255,255,255,0.025)';
  const statusLabel = status === 'alert' ? '⚠ SUSPICIOUS' : status === 'warn' ? '△ ELEVATED' : status === 'ok' ? '✓ NORMAL' : 'ℹ INFO';

  return (
    <div>
      <div
        onClick={() => explain && setOpen(o => !o)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '5px 6px 5px 0',
          borderBottom: open ? 'none' : '1px solid var(--bdr)',
          cursor: explain ? 'pointer' : 'default',
          borderRadius: open ? '2px 2px 0 0' : undefined,
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => explain && ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)')}
        onMouseLeave={e => explain && ((e.currentTarget as HTMLElement).style.background = 'transparent')}
      >
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--t4)', flex: 1 }}>{label}</span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color, fontWeight: status ? 600 : 400, marginRight: explain ? '8px' : '0' }}>
          {display}
        </span>
        {explain && (
          <span style={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
            background: status ? color : 'var(--bdr2)',
            boxShadow: status && status !== 'ok' ? `0 0 5px ${color}88` : 'none',
            transition: 'box-shadow 0.2s',
          }} />
        )}
      </div>
      {open && explain && (
        <div style={{
          padding: '8px 10px 10px 10px',
          background: bgOpen,
          borderBottom: '1px solid var(--bdr)',
          borderLeft: `2px solid ${color}`,
          marginBottom: '1px',
        }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '5px', fontWeight: 600 }}>
            {statusLabel}
          </div>
          <div style={{ fontFamily: 'Inter', fontSize: '11px', color: 'var(--t2)', lineHeight: 1.65 }}>
            {explain}
          </div>
        </div>
      )}
    </div>
  );
}

function BiometricPanel({ tab, m }: { tab: BioTab; m: NonNullable<ReturnType<typeof getBehaviorSessions>[0]>['metrics'] }) {
  const fmtMs = (ms: number) => ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;

  if (tab === 'mouse') {
    const mm = m.mouse;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 28px' }}>
        <BRow label="move_count"        value={mm.move_count}
          status={mm.move_count < 10 ? 'warn' : 'ok'}
          explain={mm.move_count < 10
            ? 'Very few mouse movements recorded. Could indicate keyboard-only navigation, a script filling the form, or a remote-control operator unfamiliar with the UI.'
            : 'Sufficient mouse activity recorded, consistent with natural human navigation through the form.'} />
        <BRow label="click_count"       value={mm.click_count}
          status={mm.click_count === 0 ? 'warn' : 'ok'}
          explain={mm.click_count === 0
            ? 'No mouse clicks detected. The form may have been filled entirely via keyboard or by programmatic means.'
            : 'Mouse clicks recorded — consistent with normal form interaction.'} />
        <BRow label="velocity_mean"     value={`${mm.velocity_mean.toFixed(2)} px/ms`}
          status={mm.velocity_mean > 15 ? 'alert' : mm.velocity_mean > 8 ? 'warn' : 'ok'}
          explain={mm.velocity_mean > 15
            ? `Velocity of ${mm.velocity_mean.toFixed(2)} px/ms is very high. Strongly suggests automation, a macro, or a remote-access tool (AnyDesk, TeamViewer) moving the cursor at non-human speed. Normal range: 1–8 px/ms.`
            : mm.velocity_mean > 8
            ? `Velocity of ${mm.velocity_mean.toFixed(2)} px/ms is above average. Slightly fast but not necessarily suspicious on its own — review alongside other signals.`
            : `Mouse velocity of ${mm.velocity_mean.toFixed(2)} px/ms is within normal human range (1–8 px/ms), consistent with genuine user interaction.`} />
        <BRow label="path_efficiency"   value={mm.path_efficiency.toFixed(3)}
          status={mm.path_efficiency < 0.3 ? 'alert' : mm.path_efficiency < 0.55 ? 'warn' : 'ok'}
          explain={mm.path_efficiency < 0.3
            ? `Path efficiency of ${(mm.path_efficiency * 100).toFixed(0)}% is very low. The cursor took highly indirect routes between elements — strongly suggests automated movement with artificial randomization, or a remote operator navigating an unfamiliar layout.`
            : mm.path_efficiency < 0.55
            ? `Path efficiency of ${(mm.path_efficiency * 100).toFixed(0)}% is below average. The cursor took indirect routes. Mild, but worth noting alongside other anomalies.`
            : `Path efficiency of ${(mm.path_efficiency * 100).toFixed(0)}% is good — cursor moved in relatively direct paths between form elements, consistent with a familiar, human user.`} />
        <BRow label="tremor_index"      value={mm.tremor_index.toFixed(3)}
          status={mm.tremor_index > 8 ? 'alert' : mm.tremor_index > 5 ? 'warn' : 'ok'}
          explain={mm.tremor_index > 8
            ? `High tremor (${mm.tremor_index.toFixed(2)}). Significant micro-movement noise is common when remote-desktop software (AnyDesk, TeamViewer) introduces artificial cursor jitter, or when a user is under acute stress.`
            : mm.tremor_index > 5
            ? `Elevated tremor index (${mm.tremor_index.toFixed(2)}). Could indicate mild stress, a shaking hand, or slight mouse signal noise. Monitor with other signals.`
            : `Low tremor — cursor movements are smooth and controlled, consistent with a relaxed, genuine user.`} />
        <BRow label="overshoot_count"   value={mm.overshoot_count}
          status={mm.overshoot_count > 8 ? 'alert' : mm.overshoot_count > 4 ? 'warn' : 'ok'}
          explain={mm.overshoot_count > 8
            ? `${mm.overshoot_count} cursor overshoots detected. The cursor repeatedly moved past targets and corrected. This is characteristic of a remote operator controlling the victim's device without being familiar with the exact UI positions.`
            : mm.overshoot_count > 4
            ? `${mm.overshoot_count} overshoots detected. Slightly more than typical — may indicate user unfamiliarity with this form, or minor imprecision.`
            : `Low overshoot count — user navigated form elements accurately, consistent with experience using this interface.`} />
        <BRow label="idle_period_count" value={mm.idle_period_count}
          status={mm.idle_period_count > 5 ? 'warn' : 'ok'}
          explain={mm.idle_period_count > 5
            ? `${mm.idle_period_count} mouse idle periods. Multiple pauses during form completion can indicate the user stopped to receive phone coaching between fields — a known pattern in bank and courier scams.`
            : `Idle period count is normal. Brief pauses during form completion are expected and unremarkable.`} />
        <BRow label="longest_idle_ms"  value={fmtMs(mm.longest_idle_ms)}
          status={mm.longest_idle_ms > 15000 ? 'warn' : 'ok'}
          explain={mm.longest_idle_ms > 15000
            ? `The longest single idle period was ${fmtMs(mm.longest_idle_ms)}. An extended pause mid-session suggests the user stopped to receive instructions — common in coached fraud scenarios.`
            : `Longest idle period is ${fmtMs(mm.longest_idle_ms)} — within normal range for pausing to review or think.`} />
        <BRow label="velocity_max"     value={`${mm.velocity_max.toFixed(2)} px/ms`}
          explain="Peak cursor speed recorded during the session. Used alongside velocity_mean to detect sudden fast sweeps inconsistent with natural pointing." />
        <BRow label="velocity_std"     value={mm.velocity_std.toFixed(3)}
          explain="Standard deviation of cursor velocity. High std with a high mean suggests alternating very fast and very slow movement — a common artifact of remote-control or scripted input." />
        <BRow label="acceleration_mean" value={mm.acceleration_mean.toFixed(4)}
          explain="Mean cursor acceleration. Each person has a consistent acceleration profile — significant deviations from a user's baseline can indicate impersonation or automation." />
        <BRow label="total_distance_px" value={`${mm.total_distance_px.toLocaleString()} px`}
          explain="Total cursor travel distance. Very low distance on a long session indicates minimal mouse use; very high may indicate erratic non-directed movement." />
        <BRow label="correction_count"  value={mm.correction_count}
          explain="Number of deliberate course corrections. High correction count alongside high overshoots suggests the operator is unfamiliar with the form layout." />
        <BRow label="dbl_click_count"   value={mm.dbl_click_count}
          explain="Double-click events. Usually zero in payment forms — unexpected double-clicks may indicate user confusion or automated interaction." />
        <BRow label="right_click_count" value={mm.right_click_count}
          explain="Right-click count. Any right-clicks in a payment flow are unusual and may indicate the user was inspecting the page or accessing browser extensions." />
        <BRow label="direction_angle_std" value={mm.direction_angle_std.toFixed(3)}
          explain="Spread of cursor movement directions. Low std means movement was mostly in one direction (efficient); high std indicates scattered movement across the viewport." />
        <BRow label="curvature_mean"    value={mm.curvature_mean.toFixed(4)}
          explain="Average curvature of cursor paths. Higher curvature means more curved routes between targets — a biometric signature that differs between individuals and automation." />
        <BRow label="last_position"     value={`${mm.last_x}, ${mm.last_y}`}
          explain="Final cursor position at session end. Useful for confirming the cursor was near the submit button, or detecting if the session ended unusually." />
      </div>
    );
  }

  if (tab === 'keyboard') {
    const kb = m.keyboard;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 28px' }}>
        <BRow label="total_keys"        value={kb.total_keys}
          status={kb.total_keys < 5 ? 'warn' : 'ok'}
          explain={kb.total_keys < 5
            ? 'Very few keystrokes recorded. Most data may have been pasted rather than typed, which is suspicious in a payment context where users should type their own credentials.'
            : 'Keystroke count is consistent with manually filling in the payment form.'} />
        <BRow label="error_rate"        value={`${(kb.error_rate * 100).toFixed(1)}%`}
          status={kb.error_rate > 0.25 ? 'alert' : kb.error_rate > 0.1 ? 'warn' : 'ok'}
          explain={kb.error_rate > 0.25
            ? `Error rate of ${(kb.error_rate * 100).toFixed(0)}% is high. Frequent corrections strongly suggest the user was entering data they didn't know from memory — a common pattern when a victim is reading card/account details dictated by a scammer, or copying them from a phishing message.`
            : kb.error_rate > 0.1
            ? `Error rate of ${(kb.error_rate * 100).toFixed(0)}% is mildly elevated. More corrections than typical — could reflect unfamiliar data or typing under pressure.`
            : `Error rate of ${(kb.error_rate * 100).toFixed(0)}% is low, consistent with a user typing familiar information confidently.`} />
        <BRow label="rhythm_consistency" value={kb.rhythm_consistency.toFixed(3)}
          status={kb.rhythm_consistency < 0.2 ? 'alert' : kb.rhythm_consistency < 0.35 ? 'warn' : 'ok'}
          explain={kb.rhythm_consistency < 0.2
            ? `Rhythm consistency of ${kb.rhythm_consistency.toFixed(3)} is very low. The typing pattern changed dramatically during the session — this can indicate two different people typed different parts of the form, or the user was heavily interrupted by a scammer on the phone.`
            : kb.rhythm_consistency < 0.35
            ? `Rhythm consistency of ${kb.rhythm_consistency.toFixed(3)} is below average. Inconsistent rhythm may reflect interruptions or stress.`
            : `Typing rhythm is consistent at ${kb.rhythm_consistency.toFixed(3)} — suggests a single user with stable, familiar typing patterns throughout the session.`} />
        <BRow label="backspace_count"   value={kb.backspace_count}
          status={kb.backspace_count > 20 ? 'alert' : kb.backspace_count > 12 ? 'warn' : 'ok'}
          explain={kb.backspace_count > 20
            ? `${kb.backspace_count} backspaces — very high correction count. Strongly suggests the user was typing data they didn't know (e.g. being dictated card numbers over the phone) or repeatedly re-entering incorrect information.`
            : kb.backspace_count > 12
            ? `${kb.backspace_count} backspaces — more corrections than usual. May indicate entry of unfamiliar data or typing under stress.`
            : `${kb.backspace_count} backspaces — normal level of corrections, consistent with genuine, familiar data entry.`} />
        <BRow label="long_pause_count"  value={kb.long_pause_count}
          status={kb.long_pause_count > 5 ? 'warn' : 'ok'}
          explain={kb.long_pause_count > 5
            ? `${kb.long_pause_count} long pauses between keystrokes. Frequent pauses during form entry suggest the user stopped to receive phone coaching between fields — a well-documented pattern in impersonation, courier and investment scams.`
            : `Pause count is normal. Brief thinking pauses between fields are expected and unremarkable.`} />
        <BRow label="typing_speed_cps"  value={`${kb.typing_speed_cps.toFixed(2)} c/s`}
          explain="Average typing speed in characters per second. Very fast (>10 c/s) could suggest paste-then-correct behaviour; very slow can indicate the user is reading each character from an external source." />
        <BRow label="typing_speed_peak" value={`${kb.typing_speed_peak.toFixed(2)} c/s`}
          explain="Peak typing burst speed. A high peak with a low mean suggests the user typed in bursts — potentially after receiving dictated information in segments." />
        <BRow label="dwell_time_mean"   value={fmtMs(kb.dwell_time_mean)}
          explain="Average key press duration (how long each key is held). This is a core biometric — significantly different from a user's established baseline can indicate account takeover or impersonation." />
        <BRow label="dwell_time_std"    value={fmtMs(kb.dwell_time_std)}
          explain="Variability in key-hold duration. High std means inconsistent key presses — a sign of stress, distraction, or a different user typing." />
        <BRow label="flight_time_mean"  value={fmtMs(kb.flight_time_mean)}
          explain="Average time between releasing one key and pressing the next. One of the strongest biometric signals — uniquely identifies individuals. Major deviations from a user's baseline indicate a different typist." />
        <BRow label="flight_time_std"   value={fmtMs(kb.flight_time_std)}
          explain="Variability in inter-key flight time. Low std = metronomic, robot-like typing; high std = very inconsistent, possibly stressed or different user." />
        <BRow label="burst_count"       value={kb.burst_count}
          explain="Number of rapid typing bursts. Typing in short intense bursts with pauses between them can indicate a user receiving dictated information over the phone and typing it as they hear it." />
        <BRow label="modifier_usage_ratio" value={`${(kb.modifier_usage_ratio * 100).toFixed(1)}%`}
          explain="Proportion of keystrokes involving modifier keys (Shift, Ctrl, Alt). Unusual ratios may indicate use of keyboard shortcuts for paste operations or other non-typing actions." />
      </div>
    );
  }

  if (tab === 'clipboard') {
    const cl = m.clipboard;
    const se = m.session;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 28px' }}>
        <BRow label="paste_vs_type_ratio" value={`${(se.paste_vs_type_ratio * 100).toFixed(1)}%`}
          status={se.paste_vs_type_ratio > 0.5 ? 'alert' : se.paste_vs_type_ratio > 0.1 ? 'warn' : 'ok'}
          explain={se.paste_vs_type_ratio > 0.5
            ? `${(se.paste_vs_type_ratio * 100).toFixed(0)}% of characters were pasted rather than typed. This is a strong fraud indicator — genuine users type their own payment credentials from memory. High paste ratios strongly suggest data was prepared externally, typical of account takeover or credentials supplied by a scammer.`
            : se.paste_vs_type_ratio > 0.1
            ? `${(se.paste_vs_type_ratio * 100).toFixed(0)}% of characters pasted. Some paste activity — warrants review especially if pasted fields include account numbers or sensitive amounts.`
            : 'All data was manually typed. Consistent with a genuine user entering their own details from memory.'} />
        <BRow label="paste_total"         value={cl.paste_total}
          status={cl.paste_total > 3 ? 'alert' : cl.paste_total > 0 ? 'warn' : 'ok'}
          explain={cl.paste_total > 3
            ? `${cl.paste_total} paste events recorded. Repeated pasting in a payment form strongly suggests the credentials were prepared in advance — characteristic of account takeover, phishing credential reuse, or a scammer supplying details.`
            : cl.paste_total > 0
            ? `${cl.paste_total} paste event(s) detected. In a payment context, pasting account or card data can indicate the user doesn't own the credentials. Check which fields were pasted (see paste_fields).`
            : 'No paste events — all data was entered manually. Consistent with the user entering their own familiar credentials.'} />
        <BRow label="paste_fields"        value={cl.paste_fields.join(', ') || 'none'}
          status={cl.paste_fields.length > 0 ? 'warn' : 'ok'}
          explain={cl.paste_fields.length > 0
            ? `Data was pasted into: ${cl.paste_fields.join(', ')}. Pasting into card number, account number or CVV fields is highly suspicious — genuine card owners type these from memory.`
            : 'No fields had data pasted into them.'} />
        <BRow label="copy_total"          value={cl.copy_total}
          explain="Number of copy events during the session. Copying data from a payment form (e.g. reference numbers) is normal; copying large amounts of text may indicate the user is transferring information to/from a scammer." />
        <BRow label="cut_total"           value={cl.cut_total}
          explain="Number of cut events. Cut operations in form fields suggest the user was rearranging text — unusual in a straightforward payment flow." />
      </div>
    );
  }

  if (tab === 'attention') {
    const at = m.attention;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 28px' }}>
        <BRow label="tab_switch_count"    value={at.tab_switch_count}
          status={at.tab_switch_count > 3 ? 'alert' : at.tab_switch_count > 0 ? 'warn' : 'ok'}
          explain={at.tab_switch_count > 3
            ? `${at.tab_switch_count} tab switches during this payment. High tab-switch count is one of the strongest fraud signals — almost always indicates an external communication channel is open (phone call with another window, WhatsApp instructions) while the victim is coached through the transaction.`
            : at.tab_switch_count > 0
            ? `${at.tab_switch_count} tab switch(es) detected during payment. Any tab switching mid-transaction is a significant fraud indicator — commonly occurs when the victim has a scammer on video call or is following instructions from another screen.`
            : 'No tab switches — user remained fully focused on the payment form throughout. Consistent with uncoached, genuine behaviour.'} />
        <BRow label="total_time_away_ms"  value={fmtMs(at.total_time_away_ms)}
          status={at.total_time_away_ms > 30000 ? 'alert' : at.total_time_away_ms > 8000 ? 'warn' : 'ok'}
          explain={at.total_time_away_ms > 30000
            ? `User's browser was unfocused for ${fmtMs(at.total_time_away_ms)} total — very significant. Extended time away during a payment strongly suggests the user was receiving detailed phone coaching or following written instructions from a fraudster.`
            : at.total_time_away_ms > 8000
            ? `Browser was unfocused for ${fmtMs(at.total_time_away_ms)} total. Moderate time away — may indicate brief distraction, but warrants review alongside tab switches and idle periods.`
            : 'Minimal time spent away from the browser. Consistent with a focused, genuine payment session.'} />
        <BRow label="longest_absence_ms"  value={fmtMs(at.longest_absence_ms)}
          status={at.longest_absence_ms > 20000 ? 'warn' : 'ok'}
          explain={at.longest_absence_ms > 20000
            ? `Single absence of ${fmtMs(at.longest_absence_ms)}. A single prolonged absence mid-session is more suspicious than multiple short ones — the user likely switched to receive phone instructions and then returned.`
            : `Longest single absence was ${fmtMs(at.longest_absence_ms)} — within normal range for brief distractions.`} />
        <BRow label="blur_events"         value={at.blur_events}
          explain="Number of times the browser window lost focus. Each blur event means the user switched away. Cross-reference with tab_switch_count and total_time_away_ms for context." />
        <BRow label="focus_events"        value={at.focus_events}
          explain="Number of times the browser window regained focus. Should closely match blur_events — a significant mismatch may indicate page visibility API discrepancies." />
        <BRow label="visibility_changes"  value={at.visibility_changes}
          explain="Number of page visibility state changes (visible ↔ hidden). Includes minimizing the browser, switching to another app, or locking the screen." />
        <BRow label="window_resize_count" value={at.window_resize_count}
          status={at.window_resize_count > 3 ? 'warn' : 'ok'}
          explain={at.window_resize_count > 3
            ? `${at.window_resize_count} window resizes during the session. Frequent resizing can indicate a remote-access tool adjusting the viewport, or the user repositioning their window alongside another application (e.g. a video call).`
            : 'Window resize count is normal.'} />
      </div>
    );
  }

  if (tab === 'session') {
    const se = m.session;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 28px' }}>
        <BRow label="hesitation_submit_ms" value={fmtMs(se.hesitation_before_submit_ms)}
          status={se.hesitation_before_submit_ms > 10000 ? 'alert' : se.hesitation_before_submit_ms > 4000 ? 'warn' : 'ok'}
          explain={se.hesitation_before_submit_ms > 10000
            ? `User paused ${fmtMs(se.hesitation_before_submit_ms)} before confirming the payment. This is the single most reliable indicator of a coached transaction — victims routinely pause at this exact step waiting for a fraudster to confirm they should proceed.`
            : se.hesitation_before_submit_ms > 4000
            ? `Noticeable hesitation of ${fmtMs(se.hesitation_before_submit_ms)} before confirmation. Extended pause could reflect normal review — but combined with other signals it may indicate coaching.`
            : `Confirmation was quick (${fmtMs(se.hesitation_before_submit_ms)}). Consistent with a user who made this decision independently and with confidence.`} />
        <BRow label="scroll_depth_pct"    value={`${se.scroll_depth_pct.toFixed(1)}%`}
          status={se.scroll_depth_pct < 15 ? 'alert' : se.scroll_depth_pct < 40 ? 'warn' : 'ok'}
          explain={se.scroll_depth_pct < 15
            ? `User scrolled through only ${se.scroll_depth_pct.toFixed(0)}% of the form — did not review the payment details at all. Characteristic of coached transactions where the scammer instructs the victim to "just confirm quickly" without reading.`
            : se.scroll_depth_pct < 40
            ? `User scrolled through ${se.scroll_depth_pct.toFixed(0)}% of the form. May not have reviewed all payment details before confirming.`
            : `User scrolled through ${se.scroll_depth_pct.toFixed(0)}% of the form — likely reviewed the payment details before confirming.`} />
        <BRow label="paste_vs_type_ratio" value={`${(se.paste_vs_type_ratio * 100).toFixed(1)}%`}
          status={se.paste_vs_type_ratio > 0.5 ? 'alert' : se.paste_vs_type_ratio > 0.1 ? 'warn' : 'ok'}
          explain={se.paste_vs_type_ratio > 0.5
            ? `${(se.paste_vs_type_ratio * 100).toFixed(0)}% of input was pasted. Genuine users type their own credentials — high paste ratio strongly suggests externally supplied data.`
            : se.paste_vs_type_ratio > 0.1
            ? 'Some data was pasted rather than typed. Review which fields were pasted into (see Clipboard tab).'
            : 'All data was typed manually from memory — consistent with a genuine user.'} />
        <BRow label="total_duration_ms"   value={fmtMs(se.total_duration_ms)}
          explain="Total session length from first interaction to final submission. Extremely short sessions can indicate coaching to complete quickly; very long sessions with many pauses can indicate multiple coaching interruptions." />
        <BRow label="first_interaction_ms" value={se.first_interaction_ms !== null ? fmtMs(se.first_interaction_ms) : '—'}
          status={se.first_interaction_ms !== null && se.first_interaction_ms > 15000 ? 'warn' : 'ok'}
          explain={se.first_interaction_ms !== null && se.first_interaction_ms > 15000
            ? `${fmtMs(se.first_interaction_ms)} elapsed before the first interaction. A long delay before starting suggests the user was reading external instructions or waiting for coaching before beginning.`
            : 'Time to first interaction is within normal range — user began filling the form promptly.'} />
        <BRow label="form_nav_style"      value={se.form_navigation_style}
          explain="How the user navigated between form fields (tab, click, or mixed). Unusual navigation styles can indicate automated form-filling or keyboard-only entry of scripted content." />
        <BRow label="scroll_dir_changes"  value={se.scroll_direction_changes}
          explain="Number of times scroll direction reversed. Many direction changes suggest the user was re-reading sections — normal review behaviour, but can also indicate confusion or coaching instructions to 'go back and check'." />
        <BRow label="scroll_speed_mean"   value={se.scroll_speed_mean.toFixed(3)}
          explain="Average scrolling speed. Very fast scrolling through a payment form suggests the user is not reading the details." />
        {se.field_order.length > 0 && (
          <div style={{ gridColumn: '1/-1' }}>
            <BRow label="field_order" value={se.field_order.join(' → ') || '—'}
              explain="Order in which form fields received focus. Non-standard order (skipping fields, revisiting unusual combinations) can indicate automated filling or an operator working from a script." />
          </div>
        )}
        {Object.entries(se.field_durations).map(([f, ms]) => (
          <BRow key={f} label={`time_in_${f}`} value={fmtMs(ms as number)}
            explain={`Time the user spent focused in the "${f}" field. Unusually long time in a single field can indicate the user was receiving dictated input for that specific value.`} />
        ))}
        {Object.entries(se.field_revisions).map(([f, n]) => (
          <BRow key={f} label={`revisions_${f}`} value={n as number}
            status={(n as number) > 5 ? 'warn' : 'ok'}
            explain={(n as number) > 5
              ? `${n} revisions in the "${f}" field — the user corrected this field many times, suggesting they were entering unfamiliar data or making repeated errors under guidance.`
              : `Revision count for "${f}" is normal.`} />
        ))}
      </div>
    );
  }

  if (tab === 'device') {
    const dv = m.device;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 28px' }}>
        <BRow label="platform"        value={dv.platform || '—'}
          explain="Operating system platform. Unexpected platform changes from a user's history (e.g. switching from iOS to Windows) can be a secondary account-takeover indicator." />
        <BRow label="local_hour"      value={dv.local_hour}
          status={dv.local_hour >= 1 && dv.local_hour <= 5 ? 'warn' : 'ok'}
          explain={dv.local_hour >= 1 && dv.local_hour <= 5
            ? `Transaction occurred at ${dv.local_hour}:00 local time — unusually late/early. Transactions in the early hours of the morning are a supplementary fraud signal, particularly for impersonation scams where victims are kept awake by fraudsters.`
            : `Transaction occurred at ${dv.local_hour}:00 local time — normal operating hours.`} />
        <BRow label="touch_points"    value={dv.touch_points_max}
          status={dv.touch_points_max === 0 && dv.platform?.toLowerCase().includes('android') ? 'alert' : 'ok'}
          explain={dv.touch_points_max === 0
            ? 'Zero touch points reported. On a claimed mobile device, this indicates an emulated or virtualized browser environment — a potential sign of scripted or automated interaction.'
            : `${dv.touch_points_max} simultaneous touch points supported — consistent with the reported device type.`} />
        <BRow label="screen"          value={`${dv.screen_width}×${dv.screen_height}`}
          explain="Physical screen resolution. Unusual resolutions (e.g. very small screens at high DPI, or resolutions that don't match common devices) can indicate a virtualized environment or screen mirroring." />
        <BRow label="viewport"        value={`${dv.viewport_width}×${dv.viewport_height}`}
          explain="Browser viewport dimensions. A viewport significantly smaller than the screen can indicate the browser is running in a split-screen configuration alongside a coaching call." />
        <BRow label="dpr"             value={dv.device_pixel_ratio}
          explain="Device pixel ratio. Values other than common standards (1, 1.5, 2, 3) can indicate device emulation or unusual display configurations." />
        <BRow label="cpu_cores"       value={dv.cpu_cores}
          explain="Number of logical CPU cores reported. Very low core counts on a supposedly powerful device can indicate a virtualized or sandboxed environment." />
        <BRow label="memory_gb"       value={dv.memory_gb || '—'}
          explain="Device memory (RAM) in GB. Very low memory on a claimed modern device may indicate a virtualized or sandboxed browser." />
        <BRow label="connection"      value={dv.connection_type}
          status={dv.connection_type === 'none' ? 'alert' : 'ok'}
          explain={dv.connection_type === 'none'
            ? 'Connection type reported as "none" — inconsistent with completing an online payment. May indicate API spoofing or a browser with disabled APIs.'
            : `Connection type: ${dv.connection_type}. VPN usage combined with other risk signals can be a supplementary fraud indicator.`} />
        <BRow label="connection_speed" value={dv.connection_speed ? `${dv.connection_speed} Mbps` : '—'}
          explain="Estimated connection speed. Not directly a fraud signal, but very slow connections alongside long session times may explain some delay patterns." />
        <BRow label="timezone"        value={dv.timezone}
          explain="User's reported timezone. Timezone mismatches from expected geography, or timezone changes between sessions, can indicate account takeover." />
        <BRow label="language"        value={dv.language}
          explain="Browser language setting. Unexpected language settings relative to a user's profile can indicate a different person is operating the device." />
        <BRow label="color_depth"     value={`${dv.color_depth}bit`}
          explain="Display color depth. Values below 24-bit can indicate older hardware, screen mirroring, or a virtualized display environment." />
        <div style={{ gridColumn: '1/-1' }}>
          <BRow label="user_agent" value={dv.user_agent}
            explain="Full browser user-agent string. Spoofed or unusual user agents can indicate automated clients, Selenium/Playwright testing frameworks, or request forgery." />
        </div>
      </div>
    );
  }

  return null;
}

function TransactionDetailModal({ session, onClose }: { session: Session; onClose: () => void }) {
  const [tab, setTab] = useState<BioTab>('mouse');
  const captured = !!(session as CapturedSession)._captured;
  const remote   = !!(session as RemoteSession)._remote;
  const snapshot = captured
    ? getBehaviorSessions().find(s => s.session_id === (session as CapturedSession)._snapshot_id)
    : null;
  const m: LiveMetrics | null = snapshot?.metrics ?? (session as RemoteSession)._metrics ?? null;
  const level = getRiskLevel(session.riskScore);
  const levelColor = level === 'HIGH_RISK' ? COLORS.danger : level === 'STEP_UP' ? COLORS.orange : level === 'SOFT_WARNING' ? COLORS.warning : COLORS.safe;
  const levelLabel = level.replace('_', ' ');
  const scfg = STATUS_CFG[session.status];
  const fmtMs = (ms: number) => ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  const BIO_TABS: { id: BioTab; label: string }[] = [
    { id: 'mouse',     label: 'Mouse'     },
    { id: 'keyboard',  label: 'Keyboard'  },
    { id: 'clipboard', label: 'Clipboard' },
    { id: 'attention', label: 'Attention' },
    { id: 'session',   label: 'Session'   },
    { id: 'device',    label: 'Device'    },
  ];

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--card)', border: '1px solid var(--bdr2)', width: '100%', maxWidth: '960px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--bdr)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: 'var(--bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {captured && (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00CC7A', boxShadow: '0 0 5px #00CC7A', display: 'inline-block', flexShrink: 0 }} />
            )}
            {remote && (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#5B9BD5', boxShadow: '0 0 5px #5B9BD5', display: 'inline-block', flexShrink: 0 }} />
            )}
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', fontWeight: 600, color: captured ? '#C890F0' : COLORS.accent }}>{session.id}</span>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--bdr2)' }}>·</span>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--t3)' }}>{session.userId}</span>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--bdr2)' }}>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontFamily: 'JetBrains Mono', fontSize: '9px', color: session.channel === 'mobile' ? COLORS.accent : 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {session.channel === 'mobile' && <Smartphone size={9} />}
              {session.channel}
            </span>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--bdr2)' }}>·</span>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--t4)' }}>{new Date(session.startTime).toLocaleString([], { hour12: false })}</span>
          </div>
          <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', background: 'none', border: '1px solid var(--bdr)', color: 'var(--t4)', cursor: 'pointer', borderRadius: '2px' }}>
            <X size={12} />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '260px 1fr', overflow: 'hidden' }}>

          {/* LEFT — overview + signals */}
          <div style={{ borderRight: '1px solid var(--bdr)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

            {/* Risk score hero */}
            <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--bdr)' }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'var(--t4)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '12px' }}>Risk Assessment</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '52px', fontWeight: 700, color: levelColor, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {session.riskScore}
                </span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: levelColor, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px', opacity: 0.9 }}>
                  {levelLabel}
                </span>
              </div>
              <div style={{ width: '100%', height: '4px', background: 'var(--bdr)', borderRadius: '2px', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ width: `${session.riskScore}%`, height: '100%', background: `linear-gradient(90deg, ${COLORS.safe}, ${levelColor})`, borderRadius: '2px' }} />
              </div>
              {/* Key metrics */}
              {[
                { label: 'Amount',   value: `€${session.transactionAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}` },
                { label: 'Status',   value: session.status, color: scfg.color },
                { label: 'Country',  value: session.country },
                ...(m ? [{ label: 'Duration', value: fmtMs(m.session.total_duration_ms) }] : []),
                ...(m ? [{ label: 'Hesitation', value: fmtMs(m.session.hesitation_before_submit_ms), anomaly: m.session.hesitation_before_submit_ms > 5000 }] : []),
              ].map(({ label, value, color, anomaly }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--bdr)' }}>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--t4)' }}>{label}</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: color ?? (anomaly ? COLORS.warning : 'var(--t2)'), fontWeight: anomaly ? 600 : 400 }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Signal contributions */}
            {session.signals.signalContributions.length > 0 && (
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--bdr)' }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'var(--t4)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '12px' }}>Signal Contributions</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {session.signals.signalContributions.map((sig, i) => {
                    const barColor = sig.weight >= 70 ? COLORS.danger : sig.weight >= 50 ? COLORS.orange : sig.weight >= 30 ? COLORS.warning : COLORS.accent;
                    return (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--t3)' }}>{sig.signal}</span>
                          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: barColor, fontWeight: 600 }}>{sig.value}</span>
                        </div>
                        <div style={{ height: '3px', background: 'var(--bdr)', borderRadius: '2px' }}>
                          <div style={{ width: `${sig.weight}%`, height: '100%', background: barColor, borderRadius: '2px', transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Explainability */}
            <div style={{ padding: '14px 16px', flex: 1 }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'var(--t4)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '8px' }}>Model Explanation</div>
              <div style={{ fontFamily: 'Inter', fontSize: '11px', color: 'var(--t3)', lineHeight: 1.65 }}>
                {session.signals.explainabilityText}
              </div>
            </div>
          </div>

          {/* RIGHT — biometric tabs */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {m ? (
              <>
                {/* Tab strip */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--bdr)', background: 'var(--bg)', flexShrink: 0, padding: '0 4px' }}>
                  {BIO_TABS.map(({ id, label }) => (
                    <button key={id} onClick={() => setTab(id)} style={{
                      padding: '9px 12px',
                      fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase',
                      background: 'none', border: 'none',
                      borderBottom: tab === id ? `2px solid ${COLORS.accent}` : '2px solid transparent',
                      color: tab === id ? COLORS.accent : 'var(--t4)',
                      cursor: 'pointer', marginBottom: '-1px',
                      transition: 'color 0.12s',
                    }}>
                      {label}
                    </button>
                  ))}
                </div>
                {/* Tab content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
                  <BiometricPanel tab={tab} m={m} />
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '32px' }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--t4)', letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center' }}>
                  Raw biometric data available for captured sessions only
                </div>
                <div style={{ fontFamily: 'Inter', fontSize: '12px', color: 'var(--t4)', textAlign: 'center', lineHeight: 1.6, maxWidth: '280px' }}>
                  Use the <strong style={{ color: 'var(--t3)' }}>Capture</strong> page to run a live behavioral session. Full mouse, keyboard, clipboard, attention and device metrics will appear here.
                </div>
                {/* Summary from signals */}
                <div style={{ width: '100%', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {[
                    { label: 'Typing cadence deviation', value: `${session.signals.typingCadenceDeviation.toFixed(2)} SD` },
                    { label: 'Pre-confirmation pause',   value: `${session.signals.preConfirmationPause}s (baseline ${session.signals.preConfirmationPauseBaseline}s)` },
                    { label: 'Scroll depth',             value: `${session.signals.scrollDepth}%` },
                    { label: 'Active call detected',     value: session.signals.activeCallDetected ? 'YES' : 'No' },
                    { label: 'Remote access detected',   value: session.signals.remoteAccessDetected ? 'YES' : 'No' },
                  ].map(({ label, value }) => (
                    <BRow key={label} label={label} value={value} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── main ─────────────────────────────────────────────────────────────────── */

export default function Dashboard() {
  const navigate = useNavigate();

  const isClient = getRole() === 'client';
  const currentUsername = getUsername();

  // Clients see only their own captured sessions; analysts/admins see everything
  const [liveSessions, setLiveSessions] = useState<Session[]>(() => {
    const captured = getLiveSessions();
    if (isClient) {
      return captured.filter(s => s.userId === currentUsername || (s as any)._captured);
    }
    const mock = [...SESSIONS].slice(0, 20);
    const ids = new Set(captured.map(s => s.id));
    return [...captured, ...mock.filter(s => !ids.has(s.id))].slice(0, 25);
  });
  const [flashedId, setFlashedId] = useState<string | null>(null);
  const [reviewSession, setReviewSession] = useState<Session | null>(null);
  const [detailSession, setDetailSession] = useState<Session | null>(null);
  const [feedbackCount, setFeedbackCount] = useState(() => countFeedbacks());
  const [intKpis, setIntKpis] = useState(() => getInterventionKPIs());

  // Auto-refresh mock risk scores
  useEffect(() => {
    const id = setInterval(() => {
      setLiveSessions(prev => {
        // Only mutate mock sessions, not captured ones
        const idx = prev.findIndex(s => !(s as any)._captured);
        if (idx < 0) return prev;
        const delta = Math.floor(Math.random() * 9) - 4;
        const updated = { ...prev[idx], riskScore: Math.min(100, Math.max(0, prev[idx].riskScore + delta)) };
        const next = [...prev]; next[idx] = updated;
        setFlashedId(updated.id);
        setTimeout(() => setFlashedId(null), 500);
        return next;
      });
    }, 4000);
    return () => clearInterval(id);
  }, []);

  // Inject new captured sessions in real-time
  useEffect(() => {
    function onNewSession() {
      const captured = getLiveSessions();
      setLiveSessions(prev => {
        if (isClient) {
          return captured.filter(s => s.userId === currentUsername || (s as any)._captured);
        }
        const ids = new Set(captured.map(s => s.id));
        const mock = prev.filter(s => !(s as any)._captured);
        return [...captured, ...mock.filter(s => !ids.has(s.id))].slice(0, 25);
      });
    }
    function onNewIntervention() {
      setIntKpis(getInterventionKPIs());
    }
    window.addEventListener('sw1ft_new_session', onNewSession);
    window.addEventListener('sw1ft_new_intervention', onNewIntervention);
    return () => {
      window.removeEventListener('sw1ft_new_session', onNewSession);
      window.removeEventListener('sw1ft_new_intervention', onNewIntervention);
    };
  }, []);

  // Poll worker for sessions captured from external sites via the SDK
  useEffect(() => {
    if (isClient) return; // clients only see their own sessions
    async function syncRemote() {
      const remote = await fetchRemoteSessions();
      if (remote.length === 0) return;
      setLiveSessions(prev => {
        const remoteIds = new Set(remote.map((s: RemoteSession) => s.id));
        // Drop stale remote entries, keep captured + mock
        const base = prev.filter(s => !(s as any)._remote || remoteIds.has(s.id));
        const existingIds = new Set(base.map(s => s.id));
        const fresh = remote.filter((s: RemoteSession) => !existingIds.has(s.id));
        if (fresh.length === 0) return prev;
        return [...fresh, ...base].slice(0, 50);
      });
    }
    syncRemote();
    const id = setInterval(syncRemote, 30_000);
    return () => clearInterval(id);
  }, [isClient]);

  const kpis = DASHBOARD_KPIs;
  const topAlerts = [...ALERTS].sort((a, b) => b.riskScore - a.riskScore).slice(0, 8);
  const highRiskCount = liveSessions.filter(s => s.riskScore >= 65).length;
  const blockedCount  = liveSessions.filter(s => s.status === 'BLOCKED').length;
  const unreviewedHighRisk = liveSessions.filter(s =>
    (s as any)._captured && s.riskScore >= 61 && !getFeedbackForSession(s.id)
  ).length;

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
        />
        <KpiCard
          label="Active Now"
          value={liveSessions.length}
          format={n => String(n)}
          sub="live sessions"
          delta={{ value: '↑ 12/min', up: true }}
        />
        <KpiCard
          label="Alerts Triggered"
          value={kpis.alertsTriggered}
          format={n => String(n)}
          sub={`${ALERTS.filter(a => a.status === 'PENDING').length} pending`}
          subColor={COLORS.warning}
        />
        <KpiCard
          label="Interventions"
          value={kpis.interventionsDeployed + intKpis.total_triggered}
          format={n => String(n)}
          sub={intKpis.total_triggered > 0 ? `${intKpis.total_triggered} live` : '0 live'}
          subColor={COLORS.orange}
        />
        <KpiCard
          label="High Risk / Blocked"
          value={blockedCount}
          format={n => String(n)}
          sub={`${highRiskCount} high risk`}
          subColor={COLORS.danger}
        />
        <KpiCard
          label="Loss Prevented"
          value={kpis.lossPreventedEUR}
          format={fmtEur}
          sub="this week"
          subColor={COLORS.safe}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {unreviewedHighRisk > 0 && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    minWidth: '18px', height: '18px', borderRadius: '9px',
                    background: COLORS.danger, color: '#fff',
                    fontFamily: 'JetBrains Mono', fontSize: '9px', fontWeight: 700,
                    padding: '0 5px', letterSpacing: 0,
                  }} title={`${unreviewedHighRisk} high-risk session${unreviewedHighRisk > 1 ? 's' : ''} need review`}>
                    {unreviewedHighRisk}
                  </span>
                )}
                {feedbackCount > 0 && (
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'var(--green)', background: 'rgba(0,204,122,0.07)', border: '1px solid rgba(0,204,122,0.2)', padding: '2px 7px' }}>
                    {feedbackCount} labeled
                  </span>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div className="animate-pulse-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: COLORS.accent }} />
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--t4)' }}>refresh 4s · {liveSessions.length} sessions</span>
                </div>
              </div>
            }
          />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr style={{ background: 'var(--bg)' }}>
                  {['Session ID', 'User', 'Channel', 'Risk', '', 'Status', 'Time', 'Amount', 'Review'].map((h, i) => (
                    <th key={i} style={{
                      padding: '5px 10px', fontFamily: 'JetBrains Mono', fontSize: '8px', fontWeight: 600,
                      letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--bdr2)',
                      borderBottom: '1px solid var(--bdr)', textAlign: i >= 7 ? 'right' : 'left', whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {liveSessions.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: '40px', textAlign: 'center', fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--t4)' }}>
                      No sessions yet — use <strong style={{ color: 'var(--t3)' }}>Capture</strong> to submit your first payment
                    </td>
                  </tr>
                )}
                {liveSessions.map(s => {
                  const scfg = STATUS_CFG[s.status];
                  const hasFeedback = !!getFeedbackForSession(s.id);
                  const needsReview = (s as any)._captured && s.riskScore >= 61 && !hasFeedback;
                  const rowBg = needsReview
                    ? (s.riskScore >= 81 ? 'rgba(255,59,92,0.08)' : 'rgba(255,140,0,0.07)')
                    : 'transparent';
                  const hoverBg = needsReview
                    ? (s.riskScore >= 81 ? 'rgba(255,59,92,0.14)' : 'rgba(255,140,0,0.13)')
                    : 'rgba(255,255,255,0.015)';
                  return (
                    <tr
                      key={s.id}
                      className={flashedId === s.id ? 'row-flash' : ''}
                      onClick={() => setDetailSession(s)}
                      style={{
                        borderBottom: '1px solid var(--card)',
                        background: rowBg,
                        borderLeft: needsReview
                          ? `3px solid ${s.riskScore >= 81 ? COLORS.danger : COLORS.orange}`
                          : undefined,
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
                      onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
                    >
                      <td style={{ padding: '6px 10px', fontFamily: 'JetBrains Mono', fontSize: '11px', color: (s as any)._captured ? '#C890F0' : COLORS.accent, whiteSpace: 'nowrap' }}>
                        {(s as any)._captured && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#00CC7A', marginRight: 5, verticalAlign: 'middle', boxShadow: '0 0 5px #00CC7A' }} />}
                        {s.id}
                      </td>
                      <td style={{ padding: '6px 10px', fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--t3)', whiteSpace: 'nowrap' }}>{s.userId}</td>
                      <td style={{ padding: '6px 10px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'JetBrains Mono', fontSize: '9px', color: s.channel === 'mobile' ? COLORS.accent : 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {s.channel === 'mobile' && <Smartphone size={10} />}
                          {s.channel}
                        </span>
                      </td>
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
                      <td style={{ padding: '6px 10px', fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--t4)', whiteSpace: 'nowrap' }}>
                        {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                      </td>
                      <td style={{ padding: '6px 10px', fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--t2)', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        €{s.transactionAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <button
                          onClick={e => { e.stopPropagation(); setReviewSession(s); }}
                          title="Review & label this session"
                          style={{
                            display: 'flex', alignItems: 'center', gap: '3px',
                            background: hasFeedback ? 'rgba(0,204,122,0.07)' : 'transparent',
                            border: `1px solid ${hasFeedback ? 'rgba(0,204,122,0.25)' : 'var(--bdr)'}`,
                            color: hasFeedback ? 'var(--green)' : 'var(--t5)',
                            padding: '3px 7px', cursor: 'pointer',
                            fontFamily: 'JetBrains Mono', fontSize: '8px',
                            transition: 'all 0.1s', whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={e => { if (!hasFeedback) { (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-d)44'; } }}
                          onMouseLeave={e => { if (!hasFeedback) { (e.currentTarget as HTMLElement).style.color = 'var(--t5)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--bdr)'; } }}
                        >
                          <MessageSquare size={10} />
                          {hasFeedback ? 'Reviewed' : 'Review'}
                        </button>
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

      {/* Session review panel */}
      <SessionReviewPanel
        session={reviewSession}
        onClose={() => setReviewSession(null)}
        onSaved={() => setFeedbackCount(countFeedbacks())}
      />

      {/* Transaction detail modal */}
      {detailSession && (
        <TransactionDetailModal
          session={detailSession}
          onClose={() => setDetailSession(null)}
        />
      )}

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
