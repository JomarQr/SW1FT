import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';

const C = {
  bg:     '#0A0A0B',
  card:   '#111115',
  border: '#1E1E22',
  accent: '#AA55E3',
  primary:'#E8E8ED',
  muted:  '#6B6B7A',
  dim:    '#3A3A44',
  green:  '#00CC7A',
  mono:   '"JetBrains Mono", monospace',
  sans:   '"Inter", sans-serif',
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  return (
    <button onClick={copy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? C.green : C.muted, padding: '4px', display: 'flex', alignItems: 'center', gap: '4px', transition: 'color 0.2s' }}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
      <span style={{ fontFamily: C.mono, fontSize: '10px' }}>{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}

function CodeBlock({ code, lang = 'html' }: { code: string; lang?: string }) {
  return (
    <div style={{ position: 'relative', background: '#0D0D10', border: `1px solid ${C.border}`, borderRadius: '2px', marginTop: '12px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontFamily: C.mono, fontSize: '10px', color: C.muted, letterSpacing: '0.1em' }}>{lang}</span>
        <CopyButton text={code} />
      </div>
      <pre style={{ margin: 0, padding: '18px 20px', overflowX: 'auto', fontFamily: C.mono, fontSize: '13px', lineHeight: 1.7, color: C.primary }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Section({ id, n, title, children }: { id: string; n: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: '72px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontFamily: C.mono, fontSize: '10px', color: C.accent, letterSpacing: '0.15em' }}>{n}</span>
        <h2 style={{ fontFamily: C.sans, fontSize: '22px', fontWeight: 700, color: C.primary, margin: 0 }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Param({ name, type, required, desc }: { name: string; type: string; required?: boolean; desc: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 90px 1fr', gap: '12px', alignItems: 'start', padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontFamily: C.mono, fontSize: '12px', color: C.accent }}>{name}</span>
      <span style={{ fontFamily: C.mono, fontSize: '11px', color: '#7B61FF' }}>{type}{required ? <span style={{ color: C.accent, marginLeft: '4px' }}>*</span> : ''}</span>
      <span style={{ fontFamily: C.sans, fontSize: '14px', color: C.muted, lineHeight: 1.6 }}>{desc}</span>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', textAlign: 'left' }}>
        <span style={{ fontFamily: C.sans, fontSize: '15px', fontWeight: 600, color: C.primary }}>{q}</span>
        {open ? <ChevronDown size={14} color={C.muted} /> : <ChevronRight size={14} color={C.muted} />}
      </button>
      {open && <p style={{ fontFamily: C.sans, fontSize: '14px', color: C.muted, lineHeight: 1.7, margin: '0 0 16px', paddingRight: '24px' }}>{a}</p>}
    </div>
  );
}

const SNIPPET_SCRIPT = `<!-- 1. Load the SW1FT SDK -->
<script src="https://cdn.sw1ft.eu/sdk/v0/sw1ft-sdk.js"></script>

<!-- 2. Initialize on your payment form -->
<script>
  const tracker = SW1FT.init({
    apiKey:   'YOUR_API_KEY',
    selector: '#payment-form',
    endpoint: 'https://api.sw1ft.eu/v1/sessions',
    debug:    false,
  });

  // Optional: capture manually on button click
  document.getElementById('pay-btn').addEventListener('click', function () {
    tracker.capture();
  });
</script>`;

const SNIPPET_NPM = `npm install @sw1ft/sdk`;

const SNIPPET_ESM = `import { init } from '@sw1ft/sdk';

const tracker = init({
  apiKey:   'YOUR_API_KEY',
  selector: '#payment-form',
  endpoint: 'https://api.sw1ft.eu/v1/sessions',
});`;

const SNIPPET_WEBHOOK = `// POST https://api.sw1ft.eu/v1/sessions
// Headers: X-SW1FT-Key: YOUR_API_KEY

{
  "session_id": "sw1ft_abc123",
  "api_key":    "YOUR_API_KEY",
  "captured_at":"2026-04-27T12:00:00.000Z",
  "page_url":   "https://yourbank.com/pay",
  "metrics": {
    "mouse":     { "path_efficiency": 0.72, "click_count": 4, ... },
    "keyboard":  { "total_keys": 48, "error_rate": 0.04, "rhythm_consistency": 0.81, ... },
    "clipboard": { "paste_total": 1, "paste_vs_type_ratio": 0.02, ... },
    "attention": { "tab_switch_count": 0, "window_blur_count": 1, ... },
    "session":   { "total_duration_ms": 42000, ... },
    "device":    { "screen_w": 1440, "touch": false, ... }
  }
}`;

const SNIPPET_RESPONSE = `// 200 OK
{
  "received": true,
  "session_id": "sw1ft_abc123",
  "risk_score":  71,
  "risk_label":  "HIGH",
  "signals":     ["elevated_paste_ratio", "tab_switch_anomaly"]
}`;

const SNIPPET_FULL = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Checkout</title>
</head>
<body>

  <form id="payment-form">
    <input name="card"  placeholder="Card number" />
    <input name="expiry" placeholder="MM / YY" />
    <input name="cvv"   placeholder="CVV" />
    <button id="pay-btn" type="submit">Pay £250.00</button>
  </form>

  <script src="https://cdn.sw1ft.eu/sdk/v0/sw1ft-sdk.js"></script>
  <script>
    SW1FT.init({
      apiKey:   'YOUR_API_KEY',
      selector: '#payment-form',
      endpoint: 'https://api.sw1ft.eu/v1/sessions',
    });
  </script>

</body>
</html>`;

const TOC = [
  { id: 'overview',    label: 'Overview'         },
  { id: 'quickstart',  label: 'Quick start'       },
  { id: 'config',      label: 'Configuration'     },
  { id: 'payload',     label: 'Data payload'      },
  { id: 'response',    label: 'API response'      },
  { id: 'fullexample', label: 'Full example'      },
  { id: 'faq',         label: 'FAQ'               },
];

export default function Docs() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.primary, fontFamily: C.sans }}>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,11,0.92)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${C.border}`, height: '56px', display: 'flex', alignItems: 'center' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '7px', fontFamily: C.mono, fontSize: '11px', color: C.muted, textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = C.primary)}
              onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
              <ArrowLeft size={12} /> sw1ft.eu
            </Link>
            <span style={{ color: C.border }}>·</span>
            <span style={{ fontFamily: C.mono, fontSize: '11px', color: C.primary, letterSpacing: '0.06em' }}>Integration Docs</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: C.mono, fontSize: '10px', color: C.muted }}>SDK v0.1.0</span>
            <span style={{ background: 'rgba(170,85,227,0.12)', border: `1px solid rgba(170,85,227,0.25)`, color: C.accent, fontFamily: C.mono, fontSize: '10px', padding: '2px 8px', letterSpacing: '0.08em' }}>BETA</span>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 32px', display: 'grid', gridTemplateColumns: '200px 1fr', gap: '64px', alignItems: 'start' }}>

        {/* TOC */}
        <nav style={{ position: 'sticky', top: '80px' }}>
          <div style={{ fontFamily: C.mono, fontSize: '10px', color: C.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '16px' }}>On this page</div>
          {TOC.map(item => (
            <a key={item.id} href={`#${item.id}`} style={{ display: 'block', fontFamily: C.mono, fontSize: '12px', color: C.muted, textDecoration: 'none', padding: '6px 0', borderLeft: `2px solid ${C.border}`, paddingLeft: '12px', transition: 'color 0.2s, border-color 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.color = C.primary; e.currentTarget.style.borderLeftColor = C.accent; }}
              onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.borderLeftColor = C.border; }}>
              {item.label}
            </a>
          ))}
        </nav>

        {/* Content */}
        <div style={{ minWidth: 0 }}>

          {/* Header */}
          <div style={{ marginBottom: '56px' }}>
            <div style={{ fontFamily: C.mono, fontSize: '11px', color: C.accent, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '16px' }}>SW1FT Integration Guide</div>
            <h1 style={{ fontFamily: C.sans, fontSize: '38px', fontWeight: 800, color: C.primary, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '20px' }}>
              Add behavioral fraud detection<br />to any payment flow.
            </h1>
            <p style={{ fontSize: '17px', color: C.muted, lineHeight: 1.7, maxWidth: '580px', margin: '0 0 28px' }}>
              The SW1FT SDK attaches to your existing payment form — no UI changes required. It captures behavioral signals silently, sends them to our scoring engine, and returns a risk signal before authorization completes.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {['&lt;50ms latency', 'No PII transmitted', 'GDPR compliant', 'EU-hosted'].map(tag => (
                <span key={tag} style={{ fontFamily: C.mono, fontSize: '11px', color: C.muted, border: `1px solid ${C.border}`, padding: '4px 10px', letterSpacing: '0.06em' }} dangerouslySetInnerHTML={{ __html: tag }} />
              ))}
            </div>
          </div>

          <Section id="overview" n="01" title="Overview">
            <p style={{ fontSize: '15px', color: C.muted, lineHeight: 1.75, marginBottom: '20px' }}>
              The SW1FT SDK is a lightweight JavaScript snippet (~8KB gzipped) that you embed on any page containing a payment form. It requires no backend changes on your side — all signal processing happens server-side in our EU-hosted infrastructure.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              {[
                { label: 'Load SDK', body: 'One script tag on your checkout page. No build step required.' },
                { label: 'Init on form', body: 'Point it at your payment form with a CSS selector.' },
                { label: 'Receive scores', body: 'Each session POSTs a risk signal to your configured endpoint.' },
              ].map((s, i) => (
                <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, padding: '18px 16px' }}>
                  <div style={{ fontFamily: C.mono, fontSize: '9px', color: C.accent, letterSpacing: '0.15em', marginBottom: '8px' }}>STEP {i + 1}</div>
                  <div style={{ fontFamily: C.sans, fontSize: '14px', fontWeight: 600, color: C.primary, marginBottom: '6px' }}>{s.label}</div>
                  <div style={{ fontFamily: C.sans, fontSize: '13px', color: C.muted, lineHeight: 1.6 }}>{s.body}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section id="quickstart" n="02" title="Quick start">
            <p style={{ fontSize: '15px', color: C.muted, lineHeight: 1.75, marginBottom: '4px' }}>
              Add two script tags to your checkout page. Replace <code style={{ fontFamily: C.mono, color: C.accent, fontSize: '13px' }}>YOUR_API_KEY</code> with the key from your dashboard.
            </p>
            <CodeBlock code={SNIPPET_SCRIPT} lang="html" />
            <p style={{ fontSize: '15px', color: C.muted, lineHeight: 1.75, marginBottom: '4px' }}>Or install via npm and use the ES module:</p>
            <CodeBlock code={SNIPPET_NPM} lang="shell" />
            <CodeBlock code={SNIPPET_ESM} lang="typescript" />
          </Section>

          <Section id="config" n="03" title="Configuration">
            <p style={{ fontSize: '15px', color: C.muted, lineHeight: 1.75, marginBottom: '16px' }}>
              All options passed to <code style={{ fontFamily: C.mono, color: C.accent, fontSize: '13px' }}>SW1FT.init()</code>:
            </p>
            <div style={{ borderTop: `1px solid ${C.border}` }}>
              <div style={{ display: 'grid', gridTemplateColumns: '180px 90px 1fr', gap: '12px', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                {['Parameter', 'Type', 'Description'].map(h => (
                  <span key={h} style={{ fontFamily: C.mono, fontSize: '10px', color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</span>
                ))}
              </div>
              <Param name="apiKey"    type="string"   required desc="Your SW1FT API key. Obtain from the dashboard API & SDK page." />
              <Param name="selector"  type="string"            desc='CSS selector or DOM element for the payment form or container. Default: "form".' />
              <Param name="endpoint"  type="string"            desc="URL to POST session data to. Use your own backend or SW1FT's scoring API." />
              <Param name="debug"     type="boolean"           desc="When true, logs all events and the final snapshot to the browser console. Default: false." />
              <Param name="onCapture" type="function"          desc="Callback invoked with the snapshot object when capture() is called. Useful for testing without an endpoint." />
            </div>
          </Section>

          <Section id="payload" n="04" title="Data payload">
            <p style={{ fontSize: '15px', color: C.muted, lineHeight: 1.75, marginBottom: '4px' }}>
              The SDK sends a JSON object via POST. No PII is included — all data is derived behavioral vectors.
            </p>
            <CodeBlock code={SNIPPET_WEBHOOK} lang="json" />
            <div style={{ background: 'rgba(170,85,227,0.06)', border: `1px solid rgba(170,85,227,0.2)`, padding: '14px 18px', marginTop: '-8px' }}>
              <span style={{ fontFamily: C.mono, fontSize: '11px', color: C.accent }}>NOTE</span>
              <span style={{ fontFamily: C.sans, fontSize: '13px', color: C.muted, marginLeft: '10px' }}>
                The payload contains 38+ derived features. No raw keystrokes, mouse coordinates, or personal data are transmitted.
              </span>
            </div>
          </Section>

          <Section id="response" n="05" title="API response">
            <p style={{ fontSize: '15px', color: C.muted, lineHeight: 1.75, marginBottom: '4px' }}>
              The scoring endpoint responds synchronously with a risk score and signal labels.
            </p>
            <CodeBlock code={SNIPPET_RESPONSE} lang="json" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '4px' }}>
              {[
                { label: 'LOW',  color: '#00CC7A', desc: 'Normal behavioral pattern. No intervention required.' },
                { label: 'MED',  color: '#FFB800', desc: 'Elevated signals. Consider soft friction (SMS confirm).' },
                { label: 'HIGH', color: '#FF3B5C', desc: 'Strong anomaly. Recommend blocking or callback verification.' },
              ].map(r => (
                <div key={r.label} style={{ background: C.card, border: `1px solid ${C.border}`, padding: '14px' }}>
                  <div style={{ fontFamily: C.mono, fontSize: '12px', fontWeight: 700, color: r.color, marginBottom: '6px' }}>{r.label}</div>
                  <div style={{ fontFamily: C.sans, fontSize: '13px', color: C.muted, lineHeight: 1.5 }}>{r.desc}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section id="fullexample" n="06" title="Full example">
            <p style={{ fontSize: '15px', color: C.muted, lineHeight: 1.75, marginBottom: '4px' }}>
              A minimal checkout page with SW1FT integrated end-to-end.
            </p>
            <CodeBlock code={SNIPPET_FULL} lang="html" />
          </Section>

          <Section id="faq" n="07" title="FAQ">
            <FAQ q="Does the SDK affect page performance?" a="No measurable impact. The SDK script is ~8KB gzipped, all listeners are passive where possible, and the POST is async with keepalive so it does not block navigation." />
            <FAQ q="What happens if the endpoint is unreachable?" a="The SDK silently fails and does not block the user's payment flow. All errors are caught internally. If debug: true, they are logged to the console." />
            <FAQ q="Is this GDPR compliant?" a="Yes. No PII is transmitted — data is converted to abstract behavioral vectors at collection time. Raw keystrokes, coordinates, and personal identifiers never leave the device. All processing occurs on EU-hosted infrastructure." />
            <FAQ q="Can I use it on a React / Next.js checkout?" a='Yes. Call SW1FT.init() inside a useEffect after the form mounts. Use the containerRef approach: selector: document.getElementById("payment-form").' />
            <FAQ q="How do I get my API key?" a="Request access from the SW1FT team. Once approved, your API key will be visible in the dashboard under API & SDK." />
          </Section>

          {/* CTA */}
          <div style={{ marginTop: '24px', padding: '36px', background: C.card, border: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <div style={{ fontFamily: C.sans, fontSize: '18px', fontWeight: 700, color: C.primary, marginBottom: '6px' }}>Ready to integrate?</div>
              <div style={{ fontFamily: C.sans, fontSize: '14px', color: C.muted }}>Request access and receive your API key within 24 hours.</div>
            </div>
            <a href="/#contact" style={{ display: 'inline-block', padding: '11px 24px', border: `1px solid ${C.accent}`, color: C.accent, fontFamily: C.mono, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none', transition: 'background 0.2s, color 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = C.accent; (e.currentTarget as HTMLElement).style.color = '#0A0A0B'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = C.accent; }}>
              Request access
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
