import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Shield, CheckCircle, Download, Save, CreditCard, Eye, EyeOff, Monitor, Smartphone } from 'lucide-react';
import PhoneFrame from '../components/PhoneFrame';
import { MobileArcBankApp, DesktopArcBankApp } from '../components/ArcBankApp';
import { useBehaviorCapture, type BehaviorSnapshot, type LiveMetrics } from '../lib/useBehaviorCapture';
import { saveSession } from '../lib/behaviorStore';
import {
  computeRiskScore, getRiskLevel, getRecommendedActions, getTopRiskFactors,
  saveIntervention, type InterventionRecord,
} from '../lib/interventionStore';
import { snapshotToSession, saveLiveSession } from '../lib/liveSessionStore';
import { getUsername } from '../lib/auth';
import { COLORS } from '../lib/mockData';

// ─── Colour helpers ───────────────────────────────────────────────────────────

type Level = 'normal' | 'warn' | 'alert';

function numColor(level: Level) {
  return level === 'alert' ? COLORS.danger : level === 'warn' ? COLORS.warning : COLORS.accent;
}

// ─── Signal section wrapper ───────────────────────────────────────────────────

function Section({ title, live, children }: { title: string; live?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--bdr)', marginBottom: '10px' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--bdr)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: COLORS.muted }}>
          {title}
        </span>
        {live && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span className="animate-pulse-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: COLORS.safe, display: 'inline-block' }} />
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: COLORS.safe }}>LIVE</span>
          </span>
        )}
      </div>
      <div style={{ padding: '8px 0' }}>{children}</div>
    </div>
  );
}

function Row({ label, value, level = 'normal', mono = true }: { label: string; value: string | number; level?: Level; mono?: boolean }) {
  const formatted = typeof value === 'number' ? (Number.isInteger(value) ? value.toString() : value.toFixed(3)) : value;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 12px' }}>
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--t3)' }}>{label}</span>
      <span style={{ fontFamily: mono ? 'JetBrains Mono' : 'Inter', fontSize: '11px', color: numColor(level), fontWeight: level !== 'normal' ? 600 : 400 }}>
        {formatted}
      </span>
    </div>
  );
}

// ─── Live signal panel ────────────────────────────────────────────────────────

function SignalPanel({ metrics, elapsed }: { metrics: LiveMetrics; elapsed: number }) {
  const mm = metrics.mouse;
  const kb = metrics.keyboard;
  const cl = metrics.clipboard;
  const at = metrics.attention;
  const se = metrics.session;
  const dv = metrics.device;

  const fmtMs = (ms: number) => ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
  const fmtTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Status bar */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--bdr)', padding: '9px 12px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="animate-pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: COLORS.danger, display: 'inline-block' }} />
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.danger, letterSpacing: '0.1em' }}>RECORDING</span>
        </div>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.muted }}>{fmtTime(elapsed)}</span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.muted }}>{metrics.raw_event_count.toLocaleString()} evt</span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.accent }}>{metrics.events_per_second} /s</span>
      </div>

      {/* Device fingerprint */}
      <Section title="Device Fingerprint">
        <Row label="platform" value={dv.platform || '—'} />
        <Row label="cpu_cores" value={dv.cpu_cores} />
        <Row label="memory_gb" value={dv.memory_gb || '—'} />
        <Row label="screen" value={`${dv.screen_width}×${dv.screen_height}`} />
        <Row label="viewport" value={`${dv.viewport_width}×${dv.viewport_height}`} />
        <Row label="dpr" value={dv.device_pixel_ratio} />
        <Row label="timezone" value={dv.timezone} />
        <Row label="language" value={dv.language} />
        <Row label="touch_points" value={dv.touch_points_max} />
        <Row label="connection" value={dv.connection_type} />
        <Row label="connection_speed" value={dv.connection_speed ? `${dv.connection_speed} Mbps` : '—'} />
        <Row label="local_hour" value={dv.local_hour} />
        <Row label="color_depth" value={`${dv.color_depth}bit`} />
      </Section>

      {/* Mouse dynamics */}
      <Section title="Mouse Dynamics" live>
        <Row label="move_count" value={mm.move_count} />
        <Row label="click_count" value={mm.click_count} />
        <Row label="dbl_click_count" value={mm.dbl_click_count} />
        <Row label="right_click_count" value={mm.right_click_count} />
        <Row label="velocity_mean" value={`${mm.velocity_mean.toFixed(2)} px/ms`} level={mm.velocity_mean > 15 ? 'alert' : mm.velocity_mean > 8 ? 'warn' : 'normal'} />
        <Row label="velocity_max" value={`${mm.velocity_max.toFixed(2)} px/ms`} />
        <Row label="velocity_std" value={mm.velocity_std.toFixed(3)} />
        <Row label="acceleration_mean" value={mm.acceleration_mean.toFixed(4)} />
        <Row label="total_distance_px" value={`${mm.total_distance_px.toLocaleString()} px`} />
        <Row label="path_efficiency" value={mm.path_efficiency.toFixed(3)} level={mm.path_efficiency < 0.4 ? 'warn' : 'normal'} />
        <Row label="tremor_index" value={mm.tremor_index.toFixed(3)} level={mm.tremor_index > 5 ? 'warn' : 'normal'} />
        <Row label="direction_angle_std" value={mm.direction_angle_std.toFixed(3)} />
        <Row label="curvature_mean" value={mm.curvature_mean.toFixed(4)} />
        <Row label="idle_period_count" value={mm.idle_period_count} />
        <Row label="longest_idle_ms" value={fmtMs(mm.longest_idle_ms)} />
        <Row label="overshoot_count" value={mm.overshoot_count} level={mm.overshoot_count > 5 ? 'warn' : 'normal'} />
        <Row label="correction_count" value={mm.correction_count} />
        <Row label="last_position" value={`${mm.last_x}, ${mm.last_y}`} />
      </Section>

      {/* Keyboard biometrics */}
      <Section title="Keyboard Biometrics" live>
        <Row label="total_keys" value={kb.total_keys} />
        <Row label="backspace_count" value={kb.backspace_count} level={kb.backspace_count > 15 ? 'warn' : 'normal'} />
        <Row label="typing_speed_cps" value={`${kb.typing_speed_cps.toFixed(2)} c/s`} />
        <Row label="typing_speed_peak" value={`${kb.typing_speed_peak.toFixed(2)} c/s`} />
        <Row label="dwell_time_mean" value={fmtMs(kb.dwell_time_mean)} />
        <Row label="dwell_time_std" value={fmtMs(kb.dwell_time_std)} />
        <Row label="flight_time_mean" value={fmtMs(kb.flight_time_mean)} />
        <Row label="flight_time_std" value={fmtMs(kb.flight_time_std)} />
        <Row label="error_rate" value={`${(kb.error_rate * 100).toFixed(1)}%`} level={kb.error_rate > 0.25 ? 'alert' : kb.error_rate > 0.1 ? 'warn' : 'normal'} />
        <Row label="rhythm_consistency" value={kb.rhythm_consistency.toFixed(3)} level={kb.rhythm_consistency < 0.3 ? 'warn' : 'normal'} />
        <Row label="burst_count" value={kb.burst_count} />
        <Row label="modifier_usage_ratio" value={`${(kb.modifier_usage_ratio * 100).toFixed(1)}%`} />
        <Row label="long_pause_count" value={kb.long_pause_count} level={kb.long_pause_count > 5 ? 'warn' : 'normal'} />
      </Section>

      {/* Clipboard */}
      <Section title="Clipboard Signals" live>
        <Row label="paste_total" value={cl.paste_total} level={cl.paste_total > 3 ? 'warn' : 'normal'} />
        <Row label="copy_total" value={cl.copy_total} />
        <Row label="cut_total" value={cl.cut_total} />
        <Row label="paste_fields" value={cl.paste_fields.join(', ') || '—'} mono={false} />
        <Row label="paste_vs_type_ratio" value={`${(se.paste_vs_type_ratio * 100).toFixed(1)}%`} level={se.paste_vs_type_ratio > 0.5 ? 'alert' : se.paste_vs_type_ratio > 0.2 ? 'warn' : 'normal'} />
      </Section>

      {/* Session timing */}
      <Section title="Session Timing" live>
        <Row label="first_interaction_ms" value={se.first_interaction_ms !== null ? fmtMs(se.first_interaction_ms) : '—'} />
        <Row label="total_duration_ms" value={fmtMs(se.total_duration_ms)} />
        <Row label="field_order" value={se.field_order.join(' → ') || '—'} mono={false} />
        {Object.entries(se.field_durations).map(([f, ms]) => (
          <Row key={f} label={`  time_in_${f}`} value={fmtMs(ms)} />
        ))}
        {Object.entries(se.field_revisions).map(([f, n]) => (
          <Row key={f} label={`  revisions_${f}`} value={n} level={n > 5 ? 'warn' : 'normal'} />
        ))}
        <Row label="scroll_depth_pct" value={`${se.scroll_depth_pct.toFixed(1)}%`} />
        <Row label="scroll_dir_changes" value={se.scroll_direction_changes} />
        <Row label="scroll_speed_mean" value={se.scroll_speed_mean.toFixed(3)} />
        <Row label="hesitation_submit_ms" value={fmtMs(se.hesitation_before_submit_ms)} level={se.hesitation_before_submit_ms > 5000 ? 'warn' : 'normal'} />
        <Row label="form_nav_style" value={se.form_navigation_style} />
      </Section>

      {/* Attention */}
      <Section title="Attention & Focus" live>
        <Row label="tab_switch_count" value={at.tab_switch_count} level={at.tab_switch_count > 3 ? 'alert' : at.tab_switch_count > 1 ? 'warn' : 'normal'} />
        <Row label="total_time_away_ms" value={fmtMs(at.total_time_away_ms)} level={at.total_time_away_ms > 10000 ? 'warn' : 'normal'} />
        <Row label="longest_absence_ms" value={fmtMs(at.longest_absence_ms)} />
        <Row label="blur_events" value={at.blur_events} />
        <Row label="focus_events" value={at.focus_events} />
        <Row label="visibility_changes" value={at.visibility_changes} />
        <Row label="window_resize_count" value={at.window_resize_count} />
      </Section>

      {/* Feature count summary */}
      <div style={{ background: 'rgba(170,85,227,0.04)', border: '1px solid rgba(170,85,227,0.12)', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.muted }}>features extracted</span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '14px', fontWeight: 600, color: COLORS.accent }}>
          {Object.keys(metrics.device).length + Object.keys(metrics.mouse).length + Object.keys(metrics.keyboard).length + Object.keys(metrics.clipboard).length + Object.keys(metrics.attention).length + Object.keys(metrics.session).length + 2}
        </span>
      </div>
    </div>
  );
}

// ─── Payment widget ───────────────────────────────────────────────────────────

function PaymentWidget({
  onPay,
  onSubmitHoverStart,
  onSubmitHoverEnd,
  submitted,
}: {
  onPay: (fields: Record<string, string>) => void;
  onSubmitHoverStart: () => void;
  onSubmitHoverEnd: () => void;
  submitted: boolean;
}) {
  const [name, setName] = useState('');
  const [card, setCard] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [showCvv, setShowCvv] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const inputStyle = (field: string): React.CSSProperties => ({
    width: '100%',
    background: 'var(--bg)',
    border: `1px solid ${focused === field ? COLORS.accent : 'var(--bdr2)'}`,
    color: COLORS.primary,
    fontFamily: 'JetBrains Mono',
    fontSize: '13px',
    padding: '11px 14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  });

  function formatCard(val: string) {
    return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})(?=.)/g, '$1 ');
  }
  function formatExpiry(val: string) {
    const d = val.replace(/\D/g, '').slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  }

  const cardBrand = card.startsWith('4') ? 'VISA' : card.startsWith('5') ? 'MC' : card.startsWith('3') ? 'AMEX' : null;
  const isReady = name.trim() && card.replace(/\s/g, '').length === 16 && expiry.length === 5 && cvv.length >= 3;

  if (submitted) {
    return (
      <div style={{ maxWidth: '440px', margin: '0 auto', background: 'var(--card)', border: '1px solid var(--bdr)', padding: '48px 40px', textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(0,204,122,0.1)', border: '1px solid rgba(0,204,122,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <CheckCircle size={22} color={COLORS.safe} />
        </div>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', color: COLORS.safe, letterSpacing: '0.1em', marginBottom: '8px' }}>PAYMENT CAPTURED</div>
        <div style={{ fontFamily: 'Inter', fontSize: '13px', color: COLORS.muted }}>Behavioral profile saved. Review the panel.</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '440px', margin: '0 auto' }}>
      {/* Merchant header */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--bdr)', borderBottom: 'none', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'Inter', fontSize: '13px', color: COLORS.muted }}>Payment to</div>
          <div style={{ fontFamily: 'Inter', fontSize: '16px', fontWeight: 600, color: COLORS.primary }}>SW1FT Demo</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '22px', fontWeight: 600, color: COLORS.primary }}>€47.99</div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: COLORS.muted, letterSpacing: '0.1em' }}>ONE-TIME · EUR</div>
        </div>
      </div>

      {/* Form */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--bdr)', padding: '24px' }}>
        {/* Cardholder */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontFamily: 'JetBrains Mono', fontSize: '9px', color: COLORS.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>
            Cardholder Name
          </label>
          <input
            data-field="cardholder-name"
            type="text"
            autoComplete="cc-name"
            placeholder="Full name as on card"
            value={name}
            onChange={e => setName(e.target.value)}
            onFocus={() => setFocused('name')}
            onBlur={() => setFocused(null)}
            style={inputStyle('name')}
          />
        </div>

        {/* Card number */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontFamily: 'JetBrains Mono', fontSize: '9px', color: COLORS.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>
            Card Number
          </label>
          <div style={{ position: 'relative' }}>
            <input
              data-field="card-number"
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="0000 0000 0000 0000"
              value={card}
              onChange={e => setCard(formatCard(e.target.value))}
              onFocus={() => setFocused('card')}
              onBlur={() => setFocused(null)}
              style={{ ...inputStyle('card'), paddingRight: '56px' }}
            />
            {cardBrand && (
              <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontFamily: 'JetBrains Mono', fontSize: '9px', color: COLORS.accent, letterSpacing: '0.08em' }}>
                {cardBrand}
              </div>
            )}
            {!cardBrand && (
              <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                <CreditCard size={14} color={COLORS.muted} />
              </div>
            )}
          </div>
        </div>

        {/* Expiry + CVV */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', fontFamily: 'JetBrains Mono', fontSize: '9px', color: COLORS.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>
              Expiry
            </label>
            <input
              data-field="expiry"
              type="text"
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM/YY"
              value={expiry}
              onChange={e => setExpiry(formatExpiry(e.target.value))}
              onFocus={() => setFocused('expiry')}
              onBlur={() => setFocused(null)}
              style={inputStyle('expiry')}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: 'JetBrains Mono', fontSize: '9px', color: COLORS.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>
              CVV
            </label>
            <div style={{ position: 'relative' }}>
              <input
                data-field="cvv"
                type={showCvv ? 'text' : 'password'}
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="•••"
                maxLength={4}
                value={cvv}
                onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                onFocus={() => setFocused('cvv')}
                onBlur={() => setFocused(null)}
                style={{ ...inputStyle('cvv'), paddingRight: '40px' }}
              />
              <button
                tabIndex={-1}
                type="button"
                onClick={() => setShowCvv(s => !s)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: COLORS.muted }}
              >
                {showCvv ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>
        </div>

        {/* Pay button */}
        <button
          type="button"
          disabled={!isReady}
          onMouseEnter={onSubmitHoverStart}
          onMouseLeave={onSubmitHoverEnd}
          onClick={() => isReady && onPay({ name, card, expiry, _amount: '47.99' })}
          style={{
            width: '100%',
            background: isReady ? COLORS.accent : 'rgba(170,85,227,0.15)',
            border: 'none',
            color: isReady ? 'var(--bg)' : 'rgba(170,85,227,0.4)',
            fontFamily: 'JetBrains Mono',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '14px',
            cursor: isReady ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s, color 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <Lock size={12} />
          Pay €47.99 securely
        </button>

        {/* Security note */}
        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <Shield size={11} color={COLORS.muted} />
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: COLORS.muted, letterSpacing: '0.08em' }}>
            256-BIT SSL · PCI DSS · 3D SECURE
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Completion modal ─────────────────────────────────────────────────────────

function CompletionModal({ snapshot, onClose }: { snapshot: BehaviorSnapshot; onClose: () => void }) {
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<'mouse' | 'keyboard' | 'session' | 'attention' | 'device'>('mouse');

  function handleSave() {
    saveSession(snapshot);
    setSaved(true);
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${snapshot.session_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const tabStyle = (t: string): React.CSSProperties => ({
    padding: '7px 14px',
    fontFamily: 'JetBrains Mono',
    fontSize: '9px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    background: tab === t ? 'rgba(170,85,227,0.08)' : 'transparent',
    border: `1px solid ${tab === t ? COLORS.accent : 'var(--bdr)'}`,
    color: tab === t ? COLORS.accent : COLORS.muted,
    marginRight: '4px',
    marginBottom: '4px',
  });

  const m = snapshot.metrics;
  const fmtMs = (ms: number) => ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--bdr2)', width: '100%', maxWidth: '780px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bdr)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.safe, letterSpacing: '0.12em', marginBottom: '4px' }}>BEHAVIORAL PROFILE CAPTURED</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.muted }}>
              {snapshot.session_id} · {new Date(snapshot.captured_at).toLocaleString()} · {snapshot.total_features} features
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Analyst</div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.primary }}>{snapshot.analyst}</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--bdr)', color: COLORS.muted, cursor: 'pointer', padding: '6px 10px', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>ESC</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--bdr)', display: 'flex', flexWrap: 'wrap' }}>
          {(['mouse', 'keyboard', 'session', 'attention', 'device'] as const).map(t => (
            <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {tab === 'mouse' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
              {Object.entries(m.mouse).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--bdr)' }}>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--t3)' }}>{k}</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.primary }}>{typeof v === 'number' ? v.toFixed(3) : String(v)}</span>
                </div>
              ))}
            </div>
          )}
          {tab === 'keyboard' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
              {Object.entries(m.keyboard).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--bdr)' }}>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--t3)' }}>{k}</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.primary }}>{typeof v === 'number' ? v.toFixed(3) : String(v)}</span>
                </div>
              ))}
              <div style={{ gridColumn: '1/-1', marginTop: '12px' }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: COLORS.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Clipboard</div>
                {Object.entries(m.clipboard).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--bdr)' }}>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--t3)' }}>{k}</span>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.primary }}>{Array.isArray(v) ? v.join(', ') || '—' : String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {tab === 'session' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
              {Object.entries(m.session).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--bdr)', gridColumn: typeof v === 'object' && v !== null ? '1/-1' : 'auto' }}>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--t3)', flexShrink: 0, marginRight: '12px' }}>{k}</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.primary, wordBreak: 'break-all', textAlign: 'right' }}>
                    {typeof v === 'number' ? (k.endsWith('_ms') ? fmtMs(v) : v.toFixed(3)) : Array.isArray(v) ? v.join(' → ') || '—' : typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}
                  </span>
                </div>
              ))}
            </div>
          )}
          {tab === 'attention' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
              {Object.entries(m.attention).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--bdr)' }}>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--t3)' }}>{k}</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.primary }}>{typeof v === 'number' && k.endsWith('_ms') ? fmtMs(v) : String(v)}</span>
                </div>
              ))}
            </div>
          )}
          {tab === 'device' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
              {Object.entries(m.device).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--bdr)', gridColumn: k === 'user_agent' || k === 'languages' ? '1/-1' : 'auto' }}>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--t3)', flexShrink: 0, marginRight: '12px' }}>{k}</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.primary, wordBreak: 'break-all', textAlign: 'right' }}>{String(v) || '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--bdr)', display: 'flex', gap: '10px', justifyContent: 'flex-end', alignItems: 'center' }}>
          {saved && (
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.safe, marginRight: 'auto' }}>
              ✓ Saved · Attributed to {snapshot.analyst}
            </span>
          )}
          <button
            onClick={handleExport}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid var(--bdr2)', color: COLORS.muted, fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.08em', padding: '8px 14px', cursor: 'pointer', transition: 'border-color 0.2s, color 0.2s' }}
          >
            <Download size={11} /> Export JSON
          </button>
          <button
            onClick={handleSave}
            disabled={saved}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: saved ? 'rgba(0,204,122,0.1)' : COLORS.accent, border: 'none', color: saved ? COLORS.safe : 'var(--bg)', fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.08em', fontWeight: 600, padding: '8px 16px', cursor: saved ? 'default' : 'pointer', textTransform: 'uppercase' }}
          >
            <Save size={11} /> {saved ? 'Saved' : 'Save to SW1FT'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

// ─── Idle / ready panel ───────────────────────────────────────────────────────

function IdlePanel({ onStart }: { onStart: () => void }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--bdr)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 32px', textAlign: 'center', gap: '0' }}>
      {/* Icon ring */}
      <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: '1px solid var(--bdr2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--bdr2)' }} />
      </div>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.primary, letterSpacing: '0.1em', marginBottom: '8px' }}>RECORDING PAUSED</div>
      <div style={{ fontFamily: 'Inter', fontSize: '12px', color: COLORS.muted, lineHeight: 1.6, marginBottom: '32px', maxWidth: '260px' }}>
        Press start to begin capturing behavioral signals from the payment form.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', marginBottom: '32px', textAlign: 'left' }}>
        {['Mouse movement & clicks', 'Keystroke timing & rhythm', 'Field focus & duration', 'Clipboard activity', 'Tab switches & attention'].map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--bdr2)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--t4)' }}>{s}</span>
          </div>
        ))}
      </div>
      <button
        onClick={onStart}
        style={{ width: '100%', background: COLORS.accent, border: 'none', color: 'var(--bg)', fontFamily: 'JetBrains Mono', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '13px', cursor: 'pointer', transition: 'opacity 0.2s' }}
      >
        ▶ Start Recording
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PaymentCapture() {
  const navigate = useNavigate();
  const analyst = getUsername();
  const containerRef = useRef<HTMLDivElement>(null);
  const [recording, setRecording] = useState(false);
  const [userId, setUserId] = useState(() => localStorage.getItem('sw1ft_capture_user_id') || '');
  const { metrics, finalize, onSubmitHoverStart, onSubmitHoverEnd } = useBehaviorCapture({
    enabled: recording,
    containerRef,
  });
  const [platform, setPlatform] = useState<'desktop' | 'mobile'>('desktop');
  const [demoType, setDemoType] = useState<'payment' | 'app'>('payment');
  const [submitted, setSubmitted] = useState(false);
  const [snapshot, setSnapshot] = useState<BehaviorSnapshot | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(Date.now());

  function handleStart() {
    startRef.current = Date.now();
    setElapsed(0);
    setRecording(true);
    elapsedRef.current = setInterval(() => setElapsed(Date.now() - startRef.current), 1000);
  }

  function handleStop() {
    setRecording(false);
    if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null; }
  }

  useEffect(() => () => { if (elapsedRef.current) clearInterval(elapsedRef.current); }, []);

  function handlePay(amount: number) {
    const snap = finalize(analyst, userId.trim() || undefined, platform === 'mobile' ? 'mobile' : 'web');
    setSnapshot(snap);
    setSubmitted(true);
    handleStop();

    const score = computeRiskScore(snap);
    const level = getRiskLevel(score);

    // Always save to live session store (appears in Dashboard)
    const liveSession = snapshotToSession(snap, amount);
    saveLiveSession(liveSession);
    saveSession(snap);

    if (level !== 'APPROVE') {
      // Silently record intervention — shown in Dashboard only
      const intervention: InterventionRecord = {
        id: `INT-${snap.session_id}`,
        session_id: snap.session_id,
        user_id: snap.user_id ?? snap.analyst,
        timestamp: new Date().toISOString(),
        risk_score: score,
        risk_level: level,
        recommended_actions: getRecommendedActions(level),
        user_action: 'pending',
        outcome: 'pending',
        top_risk_factors: getTopRiskFactors(snap),
        amount,
      };
      saveIntervention(intervention);
      window.dispatchEvent(new CustomEvent('sw1ft_new_intervention'));
    }

    setShowModal(true);
  }

  function handleCloseModal() {
    setShowModal(false);
  }

  const sessionId = `SL-${startRef.current.toString(36).toUpperCase().slice(-6)}`;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted, fontFamily: 'JetBrains Mono', fontSize: '11px', padding: 0 }}>
            <ArrowLeft size={13} /> Back
          </button>
          <div style={{ width: '1px', height: '16px', background: 'var(--bdr)' }} />
          <div>
            <div style={{ fontFamily: 'Inter', fontSize: '15px', fontWeight: 600, color: COLORS.primary }}>Behavioral Capture</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.muted }}>
              {recording ? 'Recording — interactions captured from payment form only' : 'Not recording — press Start to begin'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.muted }}>
            Session <span style={{ color: COLORS.accent }}>{sessionId}</span>
          </div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.muted }}>
            Analyst: <span style={{ color: COLORS.primary }}>{analyst}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.muted }}>User ID:</span>
            <input
              value={userId}
              onChange={e => { setUserId(e.target.value); localStorage.setItem('sw1ft_capture_user_id', e.target.value); }}
              placeholder="USR-XXXX"
              disabled={recording || submitted}
              style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', background: 'var(--bg)', border: '1px solid var(--bdr2)', color: COLORS.primary, padding: '5px 8px', width: '100px', outline: 'none', opacity: (recording || submitted) ? 0.5 : 1 }}
            />
          </div>
          {/* Mode selector — 2 toggles: platform + demo type */}
          {!submitted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Platform */}
              <div style={{ display: 'flex', border: '1px solid var(--bdr)', overflow: 'hidden' }}>
                {(['desktop', 'mobile'] as const).map((p, i) => (
                  <button
                    key={p}
                    onClick={() => !recording && setPlatform(p)}
                    disabled={recording}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '6px 11px',
                      background: platform === p ? 'rgba(170,85,227,0.12)' : 'transparent',
                      border: 'none',
                      color: platform === p ? COLORS.accent : COLORS.muted,
                      fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase',
                      cursor: recording ? 'not-allowed' : 'pointer',
                      opacity: recording ? 0.5 : 1,
                      borderRight: i === 0 ? '1px solid var(--bdr)' : 'none',
                    }}
                  >
                    {p === 'desktop' ? <Monitor size={11} /> : <Smartphone size={11} />}
                    {p}
                  </button>
                ))}
              </div>
              {/* Demo type */}
              <div style={{ display: 'flex', border: '1px solid var(--bdr)', overflow: 'hidden' }}>
                {(['payment', 'app'] as const).map((t, i) => (
                  <button
                    key={t}
                    onClick={() => !recording && setDemoType(t)}
                    disabled={recording}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '6px 11px',
                      background: demoType === t ? 'rgba(170,85,227,0.12)' : 'transparent',
                      border: 'none',
                      color: demoType === t ? COLORS.accent : COLORS.muted,
                      fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase',
                      cursor: recording ? 'not-allowed' : 'pointer',
                      opacity: recording ? 0.5 : 1,
                      borderRight: i === 0 ? '1px solid var(--bdr)' : 'none',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Start / Stop button */}
          {!submitted && (
            recording ? (
              <button
                onClick={handleStop}
                style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'rgba(255,59,92,0.08)', border: '1px solid rgba(255,59,92,0.3)', color: COLORS.danger, fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', padding: '7px 14px', cursor: 'pointer' }}
              >
                <span className="animate-pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: COLORS.danger, display: 'inline-block', flexShrink: 0 }} />
                RECORDING · STOP
              </button>
            ) : demoType === 'payment' ? (
              <button
                onClick={handleStart}
                style={{ display: 'flex', alignItems: 'center', gap: '7px', background: COLORS.accent, border: 'none', color: 'var(--bg)', fontFamily: 'JetBrains Mono', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', padding: '8px 16px', cursor: 'pointer' }}
              >
                ▶ START RECORDING
              </button>
            ) : null
          )}
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px', alignItems: 'start' }}>
        {/* Left: payment widget — containerRef wraps only this area */}
        <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', alignItems: (platform === 'mobile' || demoType === 'app') ? 'center' : 'stretch' }}>
          {demoType === 'payment' ? (
            platform === 'mobile' ? (
              <PhoneFrame height={680}>
                <div style={{ background: '#0A0A0B', minHeight: '100%', padding: '8px 0 24px' }}>
                  <PaymentWidget
                    onPay={(fields) => handlePay(parseFloat(fields._amount ?? '47.99'))}
                    onSubmitHoverStart={onSubmitHoverStart}
                    onSubmitHoverEnd={onSubmitHoverEnd}
                    submitted={submitted}
                  />
                </div>
              </PhoneFrame>
            ) : (
              <PaymentWidget
                onPay={(fields) => handlePay(parseFloat(fields._amount ?? '47.99'))}
                onSubmitHoverStart={onSubmitHoverStart}
                onSubmitHoverEnd={onSubmitHoverEnd}
                submitted={submitted}
              />
            )
          ) : platform === 'mobile' ? (
            <MobileArcBankApp
              onStart={handleStart}
              onConfirm={handlePay}
              onHoverStart={onSubmitHoverStart}
              onHoverEnd={onSubmitHoverEnd}
              submitted={submitted}
            />
          ) : (
            <DesktopArcBankApp
              onStart={handleStart}
              onConfirm={handlePay}
              onHoverStart={onSubmitHoverStart}
              onHoverEnd={onSubmitHoverEnd}
              submitted={submitted}
            />
          )}
          {submitted && (
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button
                onClick={() => navigate('/dashboard/captured-sessions')}
                style={{ background: 'transparent', border: `1px solid ${COLORS.accent}`, color: COLORS.accent, fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '9px 20px', cursor: 'pointer' }}
              >
                View saved sessions →
              </button>
            </div>
          )}
        </div>

        {/* Right: signal panel or idle state (sticky) */}
        <div style={{ position: 'sticky', top: '24px', maxHeight: 'calc(100vh - 96px)', overflowY: 'auto' }}>
          {recording || submitted
            ? <SignalPanel metrics={metrics} elapsed={elapsed} />
            : demoType === 'app'
              ? (
                <div style={{ background: 'var(--card)', border: '1px solid var(--bdr)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 32px', textAlign: 'center', gap: '0' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: '1px solid var(--bdr2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--bdr2)' }} />
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.primary, letterSpacing: '0.1em', marginBottom: '8px' }}>AWAITING INTERACTION</div>
                  <div style={{ fontFamily: 'Inter', fontSize: '12px', color: COLORS.muted, lineHeight: 1.6, maxWidth: '260px' }}>
                    Interact with the ArcBank app. Recording starts automatically when you tap <strong style={{ color: COLORS.primary }}>Send</strong>.
                  </div>
                </div>
              )
              : <IdlePanel onStart={handleStart} />
          }
        </div>
      </div>

      {showModal && snapshot && (
        <CompletionModal snapshot={snapshot} onClose={handleCloseModal} />
      )}
    </div>
  );
}
