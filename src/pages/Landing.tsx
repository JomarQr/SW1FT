import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

// ─── Constants ──────────────────────────────────────────────────────────────

const C = {
  black:  '#0D0D0D',
  white:  '#FFFFFF',
  accent: '#00E5CC',
  g100:   '#F7F7F7',
  g200:   '#E8E8E8',
  g400:   '#AEAEAE',
  g600:   '#666666',
  g800:   '#333333',
};

const SIGNALS = [
  { id: 'typing',   label: 'Typing cadence',         text: 'The rhythm and velocity of keystrokes during form entry. SentinelLayer measures dwell time — how long each key is held — and flight time, the gap between successive keystrokes. Abnormal mechanical precision, extreme slowing, or sudden cadence shifts are evaluated against the individual\'s established baseline, not a population average.' },
  { id: 'pause',    label: 'Pre-confirmation pause',  text: 'The duration between completing form entry and pressing confirm. Extended pauses significantly above a user\'s personal baseline often indicate that they are re-reading instructions received by phone, or hesitating under pressure from a third party. This signal is weighted heavily in high-value payment analysis.' },
  { id: 'scroll',   label: 'Scroll depth',            text: 'How fully a user scrolls through confirmation and warning screens before proceeding. Very low scroll depth — particularly on screens containing transaction details or fraud warnings — is consistent with a user who has been instructed to proceed without reading. It is a signal of directed, rather than autonomous, behavior.' },
  { id: 'call',     label: 'Active call detection',   text: 'Whether the user\'s device is engaged in an active phone call during a banking session. When combined with behavioral anomalies, an ongoing call at the moment of payment confirmation is one of the strongest composite indicators of a social engineering session in progress. The signal is device-state derived — no call content is accessed.' },
  { id: 'rat',      label: 'Remote access detection', text: 'Presence of remote desktop software — AnyDesk, TeamViewer, Chrome Remote Desktop — active on the device during a session. This is a high-specificity signal. Legitimate users rarely have screen-sharing software active during routine banking, and fraudsters frequently use it to guide victims through transactions in real time.' },
  { id: 'touch',    label: 'Touch pressure',          text: 'Variance in touchscreen pressure across a mobile session. Unusually uniform pressure suggests robotic or automated input. Erratic pressure variance — particularly near confirmation steps — can indicate agitated motor behavior consistent with emotional distress. The pattern across the session matters more than any single measurement.' },
  { id: 'nav',      label: 'Session navigation',      text: 'The path a user takes through the application — which screens they visit, in which order, and how long they spend on each. Unusually direct, linear navigation deviates from typical exploratory behavior and can indicate a user following explicit step-by-step instructions from a third party.' },
  { id: 'timecall', label: 'Time-since-call',         text: 'The interval between the most recent incoming call and the initiation of the payment transaction. Statistical analysis of confirmed impersonation fraud cases shows a strong correlation between very short intervals — under five minutes — and scams in which the caller instructs the victim to act immediately before they can reconsider.' },
];

const CONTRASTS = [
  { them: 'Compare behavioral patterns against historical fraud populations.',        us: 'We compare you only against yourself — your personal baseline, built over time.' },
  { them: 'Trigger risk signals based on transaction amount and destination.',        us: 'We trigger on deviation from your normal behavior, regardless of the amount.' },
  { them: 'Apply authentication friction universally at the point of payment.',      us: 'We apply friction only when a session shows measurable signs of external influence.' },
  { them: 'Build rule sets and blacklists for known attacker behaviors.',            us: 'We build a private model of how you specifically behave when acting freely.' },
  { them: 'Detect unauthorized access — someone who should not be here.',            us: 'We detect coerced access — when you are transacting, but not of your own will.' },
];

const HOW_COLS = [
  {
    label: 'Collection',
    text: 'During a normal banking session, SentinelLayer passively collects keyboard rhythm, touch dynamics, navigation patterns, and device state. No visible challenge is presented. No user interaction is required. Collection is silent and continuous.',
    icon: (
      <svg viewBox="0 0 48 36" fill="none" width="48" height="36">
        <rect x="2"  y="22" width="4" height="12" fill="#0D0D0D" opacity="0.25"/>
        <rect x="10" y="14" width="4" height="20" fill="#0D0D0D" opacity="0.45"/>
        <rect x="18" y="6"  width="4" height="28" fill="#0D0D0D"/>
        <rect x="26" y="10" width="4" height="24" fill="#0D0D0D" opacity="0.65"/>
        <rect x="34" y="18" width="4" height="16" fill="#0D0D0D" opacity="0.35"/>
        <rect x="42" y="24" width="4" height="10" fill="#0D0D0D" opacity="0.2"/>
      </svg>
    ),
  },
  {
    label: 'Baseline',
    text: 'Over 30 to 50 sessions, a behavioral model is constructed for each individual user. This model is specific to that person — not a population average, not a fraud profile. It captures their rhythm, their hesitation patterns, their natural decision cadence.',
    icon: (
      <svg viewBox="0 0 48 36" fill="none" width="48" height="36">
        <path d="M2 22 L8 20 L14 21 L20 19 L26 20 L32 18 L38 21 L44 19 L48 20" stroke="#0D0D0D" strokeWidth="1.5"/>
        <circle cx="8"  cy="20" r="2.5" fill="#0D0D0D" opacity="0.35"/>
        <circle cx="20" cy="19" r="2.5" fill="#0D0D0D" opacity="0.55"/>
        <circle cx="32" cy="18" r="2.5" fill="#0D0D0D" opacity="0.75"/>
        <circle cx="44" cy="19" r="2.5" fill="#0D0D0D" opacity="0.45"/>
      </svg>
    ),
  },
  {
    label: 'Deviation',
    text: 'Every session is evaluated against the individual model in real time. At the point of payment confirmation, if deviation exceeds a calibrated threshold, a risk signal is dispatched to the bank\'s intervention layer. The customer may never know.',
    icon: (
      <svg viewBox="0 0 48 36" fill="none" width="48" height="36">
        <path d="M2 22 L10 21 L18 22 L24 21 L28 4 L32 30 L36 22 L44 22 L48 22" stroke="#0D0D0D" strokeWidth="1.5"/>
        <path d="M24 21 L28 4 L32 30" stroke="#00E5CC" strokeWidth="2.5"/>
        <circle cx="28" cy="4" r="3.5" fill="#00E5CC"/>
      </svg>
    ),
  },
];

const PERSONAS = [
  {
    role: 'Head of Fraud',
    value: 'The behavioral layer your rule engine doesn\'t reach.',
    body: 'SentinelLayer adds real-time signal to your existing fraud stack — no replacement required. Each flagged session includes a full behavioral breakdown and an audit-ready explainability report. Analyst time is directed to cases with genuine indicators, not review volume.',
    points: ['Real-time session risk scoring', 'Per-intervention explainability reports', 'Analyst dashboard with signal decomposition', 'Configurable intervention thresholds'],
  },
  {
    role: 'CTO / Engineering',
    value: 'An SDK that adds under 50 milliseconds.',
    body: 'Deployed via a lightweight JavaScript SDK (web) or native mobile SDK (iOS/Android). Signal collection runs in a sandboxed process. No PII is transmitted — behavioral data is converted to mathematical vectors at the device level before leaving the client.',
    points: ['<50ms signal processing latency', 'No PII transmitted or stored', 'EU-hosted · ISO 27001 certified', 'Compatible with existing risk API pipelines'],
  },
  {
    role: 'Chief Risk Officer',
    value: 'Privacy-by-design is the architecture.',
    body: 'Behavioral templates are stored as abstract mathematical representations — not recordings of behavior. The system satisfies GDPR Article 22 requirements on automated decision-making through built-in explainability, and was designed with PSD3 and EU AI Act transparency requirements in scope.',
    points: ['GDPR Article 22 compliant by design', 'EU AI Act transparency requirements met', 'PSD3 behavioural monitoring aligned', 'Full audit trail for every intervention'],
  },
];

// ─── Shared sub-components ───────────────────────────────────────────────────

function SectionLabel({ n, title }: { n: string; title: string }) {
  return (
    <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '11px', color: C.g400, letterSpacing: '0.18em', textTransform: 'uppercase' as const, display: 'block', marginBottom: '20px' }}>
      {n} — {title}
    </span>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function Landing() {
  const [scrolled, setScrolled]           = useState(false);
  const [radarDone, setRadarDone]         = useState(false);
  const [activeSignal, setActiveSignal]   = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Nav scroll effect
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 48);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Scroll fade-up observer
  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).classList.add('visible');
          observerRef.current?.unobserve(entry.target);
        }
      });
    }, { threshold: 0.07, rootMargin: '0px 0px -36px 0px' });

    document.querySelectorAll('.landing-fade-up').forEach(el => observerRef.current?.observe(el));
    return () => observerRef.current?.disconnect();
  }, []);

  const pad = 'clamp(32px, 5.5vw, 80px)';
  const container: React.CSSProperties = { maxWidth: '1200px', margin: '0 auto', padding: `0 ${pad}` };
  const sectionPad = 'clamp(72px, 11vw, 148px)';

  return (
    <div style={{ background: C.white, color: C.black, fontFamily: 'Georgia, "Times New Roman", serif', WebkitFontSmoothing: 'antialiased' }}>

      {/* ── Radar sweep ─────────────────────────────────────────────── */}
      {!radarDone && (
        <div style={{ position: 'fixed', top: '44vh', left: 0, right: 0, height: '1px', zIndex: 9999, pointerEvents: 'none' }}>
          <div className="landing-radar-beam" onAnimationEnd={() => setRadarDone(true)} />
        </div>
      )}

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: '64px', display: 'flex', alignItems: 'center',
        background: scrolled ? 'rgba(255,255,255,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(10px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(10px)' : 'none',
        borderBottom: `1px solid ${scrolled ? C.g200 : 'transparent'}`,
        transition: 'background 0.3s, border-color 0.3s, backdrop-filter 0.3s',
      }}>
        <div style={{ ...container, display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <a href="/" style={{ fontFamily: '"Syne", sans-serif', fontSize: '16px', fontWeight: 700, color: C.black, textDecoration: 'none', letterSpacing: '0.01em' }}>
            SentinelLayer
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Link to="/dashboard" style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '11px', color: C.g600, textDecoration: 'none', letterSpacing: '0.08em', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = C.black)}
              onMouseLeave={e => (e.currentTarget.style.color = C.g600)}>
              Dashboard →
            </Link>
            <a href="#contact" className="landing-btn">Request access</a>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden', background: C.white }}>
        {/* Noise texture */}
        <div style={{
          position: 'absolute', inset: '-80px', pointerEvents: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          opacity: 0.035,
        }} />
        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, #0D0D0D 1px, transparent 1px)',
          backgroundSize: '32px 32px', opacity: 0.04,
        }} />
        <div style={{ ...container, position: 'relative', zIndex: 1, padding: `120px ${pad} 80px` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '36px' }}>
            <div style={{ width: '32px', height: '1px', background: C.accent }} />
            <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '11px', color: C.accent, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              Behavioral fraud intelligence
            </span>
          </div>
          <h1 style={{ fontFamily: '"Syne", sans-serif', fontWeight: 800, fontSize: 'clamp(52px, 7.5vw, 96px)', color: C.black, lineHeight: 1.0, letterSpacing: '-0.02em', maxWidth: '820px', marginBottom: '32px' }}>
            Behavioral<br />signals<br />don't lie.
          </h1>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '19px', color: C.g600, maxWidth: '420px', lineHeight: 1.65, marginBottom: '48px' }}>
            Real-time fraud detection that reads intent, not just identity.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '28px', flexWrap: 'wrap' as const }}>
            <a href="#contact" className="landing-btn">Request access</a>
            <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '10px', color: C.g400, letterSpacing: '0.08em' }}>
              EU-hosted &nbsp;·&nbsp; GDPR compliant &nbsp;·&nbsp; PSD3 aligned
            </span>
          </div>
        </div>
      </section>

      {/* ── Problem ─────────────────────────────────────────────────── */}
      <section style={{ padding: `${sectionPad} 0`, borderTop: `1px solid ${C.g200}` }}>
        <div style={container}>
          <div className="landing-fade-up" style={{ maxWidth: '640px' }}>
            <SectionLabel n="01" title="The problem" />
            <h2 style={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, fontSize: 'clamp(34px, 4.5vw, 54px)', marginBottom: '44px', lineHeight: 1.1 }}>
              The authentication paradox.
            </h2>
            <p style={{ color: C.g800, lineHeight: 1.85, marginBottom: '26px' }}>
              Strong Customer Authentication was designed to verify identity. It was not designed to detect a user who is being coached, pressured, or deceived by someone on the other end of a phone call. Every SCA requirement can be satisfied by a legitimate customer who is not acting freely.
            </p>
            <p style={{ color: C.g800, lineHeight: 1.85, marginBottom: '26px' }}>
              The fraud industry has spent two decades asking "is this the right person?" It is the wrong question. Modern authorised push payment scams succeed precisely because the person completing the transaction is exactly who they claim to be. The credential is authentic. The consent is manufactured.
            </p>
            <p style={{ color: C.g800, lineHeight: 1.85 }}>
              Behavioral biometrics have traditionally served as a passive identity layer — verifying that the typing pattern belongs to the registered user. This is valuable but insufficient. The human element is the last unprotected layer in any payment stack. We protect that layer.
            </p>
          </div>

          <div className="landing-fade-up" style={{ textAlign: 'center', maxWidth: '760px', margin: '80px auto 0', padding: '64px 0', borderTop: `1px solid ${C.g200}`, borderBottom: `1px solid ${C.g200}`, '--fd': '0.15s' } as React.CSSProperties}>
            <p style={{ fontFamily: '"Syne", sans-serif', fontWeight: 600, fontSize: 'clamp(22px, 3.2vw, 38px)', color: C.black, lineHeight: 1.3 }}>
              "Fraudsters don't break your login.<br />They convince your customer to do it for them."
            </p>
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────── */}
      <section style={{ padding: `${sectionPad} 0`, background: C.g100 }}>
        <div style={container}>
          <div className="landing-fade-up" style={{ paddingLeft: 'clamp(0px, 8vw, 120px)', marginBottom: '72px' }}>
            <SectionLabel n="02" title="How it works" />
            <h2 style={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, fontSize: 'clamp(30px, 4vw, 50px)', maxWidth: '460px', lineHeight: 1.1 }}>
              Three layers.<br />No friction added.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'clamp(28px, 4vw, 52px)' }}>
            {HOW_COLS.map((col, i) => (
              <div key={col.label} className="landing-fade-up" style={{ paddingTop: '24px', borderTop: `2px solid ${C.black}`, '--fd': `${i * 0.12}s` } as React.CSSProperties}>
                <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.black, marginBottom: '28px', display: 'block' }}>
                  {col.label}
                </span>
                <div style={{ marginBottom: '22px' }}>{col.icon}</div>
                <p style={{ fontSize: '16px', color: C.g800, lineHeight: 1.75 }}>{col.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What Makes It Different ─────────────────────────────────── */}
      <section style={{ padding: `${sectionPad} 0` }}>
        <div style={container}>
          <div className="landing-fade-up">
            <SectionLabel n="03" title="The distinction" />
            <h2 style={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, fontSize: 'clamp(30px, 4vw, 50px)', marginBottom: '64px', maxWidth: '500px', lineHeight: 1.1 }}>
              A different question entirely.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(36px, 6vw, 80px)' }}>
            <div className="landing-fade-up" style={{ '--fd': '0.05s' } as React.CSSProperties}>
              <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.g400, marginBottom: '32px', display: 'block' }}>
                The industry
              </span>
              {CONTRASTS.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: '18px', marginBottom: '26px' }}>
                  <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '10px', color: C.g400, paddingTop: '3px', flexShrink: 0, width: '20px' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p style={{ fontSize: '16px', color: C.g600, lineHeight: 1.6, paddingLeft: '16px', borderLeft: `2px solid ${C.g200}`, margin: 0 }}>
                    {c.them}
                  </p>
                </div>
              ))}
            </div>
            <div className="landing-fade-up" style={{ '--fd': '0.18s' } as React.CSSProperties}>
              <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: C.g400, marginBottom: '32px', display: 'block' }}>
                SentinelLayer
              </span>
              {CONTRASTS.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: '18px', marginBottom: '26px' }}>
                  <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '10px', color: C.g400, paddingTop: '3px', flexShrink: 0, width: '20px' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p style={{ fontSize: '16px', color: C.black, lineHeight: 1.6, paddingLeft: '16px', borderLeft: `2px solid ${C.accent}`, margin: 0, fontStyle: 'italic' }}>
                    {c.us}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Signals ─────────────────────────────────────────────────── */}
      <section style={{ padding: `${sectionPad} 0`, background: C.black }}>
        <div style={container}>
          <div className="landing-fade-up" style={{ paddingLeft: 'clamp(0px, 6vw, 80px)', marginBottom: '52px' }}>
            <SectionLabel n="04" title="Signal library" />
            <h2 style={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, fontSize: 'clamp(30px, 4vw, 50px)', color: C.white, lineHeight: 1.1 }}>
              What we measure.
            </h2>
          </div>

          <div className="landing-fade-up" style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '10px', marginBottom: '32px', '--fd': '0.1s' } as React.CSSProperties}>
            {SIGNALS.map(s => (
              <button
                key={s.id}
                className={`signal-chip-item${activeSignal === s.id ? ' chip-active' : ''}`}
                onClick={() => setActiveSignal(activeSignal === s.id ? null : s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>

          {activeSignal && (() => {
            const sig = SIGNALS.find(s => s.id === activeSignal);
            return sig ? (
              <div style={{ padding: '28px 32px', border: '1px solid #1E1E1E', background: '#0A0A0A', marginTop: '4px' }}>
                <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '10px', color: C.accent, letterSpacing: '0.15em', textTransform: 'uppercase' as const, marginBottom: '12px', display: 'block' }}>
                  {sig.label}
                </span>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: '16px', color: '#B0B0B0', lineHeight: 1.8, maxWidth: '680px', margin: 0 }}>
                  {sig.text}
                </p>
              </div>
            ) : null;
          })()}
        </div>
      </section>

      {/* ── For Whom ────────────────────────────────────────────────── */}
      <section style={{ padding: `${sectionPad} 0` }}>
        <div style={container}>
          <div className="landing-fade-up">
            <SectionLabel n="05" title="Audience" />
            <h2 style={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, fontSize: 'clamp(30px, 4vw, 50px)', marginBottom: '64px', maxWidth: '540px', lineHeight: 1.1 }}>
              Built for the teams<br />who carry the risk.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {PERSONAS.map((p, i) => (
              <div key={p.role} className={`landing-fade-up landing-persona-card`} style={{ '--fd': `${i * 0.12}s` } as React.CSSProperties}>
                <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: C.g400, marginBottom: '20px', display: 'block' }}>
                  {p.role}
                </span>
                <h3 style={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, fontSize: '20px', color: C.black, lineHeight: 1.3, marginBottom: '18px' }}>
                  {p.value}
                </h3>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: '15px', color: C.g600, lineHeight: 1.7, marginBottom: '22px' }}>
                  {p.body}
                </p>
                <ul style={{ listStyle: 'none', padding: 0, borderTop: `1px solid ${C.g200}`, paddingTop: '18px' }}>
                  {p.points.map(pt => (
                    <li key={pt} style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '11px', color: C.g800, padding: '5px 0', borderBottom: `1px solid ${C.g200}`, display: 'flex', gap: '10px', lineHeight: 1.5 }}>
                      <span style={{ color: C.accent, flexShrink: 0 }}>—</span>
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Metrics ─────────────────────────────────────────────────── */}
      <section style={{ padding: `${sectionPad} 0`, background: C.g100, borderTop: `1px solid ${C.g200}`, borderBottom: `1px solid ${C.g200}` }}>
        <div style={container}>
          <div className="landing-fade-up" style={{ textAlign: 'right', marginBottom: '72px' }}>
            <SectionLabel n="06" title="Performance" />
            <h2 style={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, fontSize: 'clamp(30px, 4vw, 50px)', display: 'inline-block', lineHeight: 1.1 }}>
              The performance data.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'clamp(28px, 4vw, 56px)' }}>
            {[
              { num: '17B',   sub: 'sessions analyzed across our network, monthly',  desc: 'Behavioral models benefit from network-level refinement while maintaining strict per-user privacy isolation. No individual data is shared.' },
              { num: '<50ms', sub: 'signal processing latency, end-to-end',          desc: 'From session event to risk score delivery. Fully compatible with real-time payment authorization flows without introducing detectable delay.' },
              { num: '4–8wk', sub: 'to a mature personal baseline',                  desc: 'After 30–50 sessions, individual models reach operational confidence. New users are handled by a calibrated population fallback until their baseline matures.' },
            ].map((m, i) => (
              <div key={m.num} className="landing-fade-up" style={{ paddingTop: '28px', borderTop: `1px solid ${C.black}`, '--fd': `${i * 0.12}s` } as React.CSSProperties}>
                <span style={{ display: 'block', fontFamily: '"Syne", sans-serif', fontWeight: 800, fontSize: 'clamp(48px, 5.5vw, 78px)', color: C.black, lineHeight: 1, letterSpacing: '-0.03em', marginBottom: '10px' }}>
                  {m.num}
                </span>
                <span style={{ display: 'block', fontFamily: '"IBM Plex Mono", monospace', fontSize: '11px', color: C.g600, letterSpacing: '0.06em', lineHeight: 1.5, marginBottom: '16px' }}>
                  {m.sub}
                </span>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: '15px', color: C.g600, lineHeight: 1.7, borderTop: `1px solid ${C.g200}`, paddingTop: '16px', margin: 0 }}>
                  {m.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ─────────────────────────────────────────────────── */}
      <section id="contact" style={{ padding: `${sectionPad} 0` }}>
        <div style={container}>
          <div className="landing-fade-up" style={{ maxWidth: '620px' }}>
            <SectionLabel n="07" title="Contact" />
            <h2 style={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, fontSize: 'clamp(26px, 3.5vw, 42px)', marginBottom: '24px', lineHeight: 1.2 }}>
              Ready to evaluate SentinelLayer<br />for your institution?
            </h2>
            <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '11px', color: C.g400, letterSpacing: '0.1em', marginBottom: '6px' }}>
              SentinelLayer · Behavioral fraud intelligence for European banks and PSPs
            </p>
            <a href="mailto:contact@sentinellayer.eu" style={{ display: 'inline-block', fontFamily: '"IBM Plex Mono", monospace', fontSize: '14px', color: C.black, textDecoration: 'none', borderBottom: `1px solid ${C.g200}`, paddingBottom: '2px', marginBottom: '36px', transition: 'border-color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.borderBottomColor = C.accent)}
              onMouseLeave={e => (e.currentTarget.style.borderBottomColor = C.g200)}>
              contact@sentinellayer.eu
            </a>
            <br />
            <a href="mailto:contact@sentinellayer.eu" className="landing-btn">Request access</a>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer style={{ padding: '26px 0', borderTop: `1px solid ${C.g200}` }}>
        <div style={{ ...container, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: '12px' }}>
          <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '11px', color: C.g400, letterSpacing: '0.06em' }}>
            © 2026 SentinelLayer. Incorporated in Latvia.
          </span>
          <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '11px', color: C.g200, letterSpacing: '0.06em' }}>
            contact@sentinellayer.eu
          </span>
        </div>
      </footer>
    </div>
  );
}
