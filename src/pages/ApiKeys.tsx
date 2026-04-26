import { useState, useCallback } from 'react';
import { Copy, Check, Eye, EyeOff, RefreshCw, ExternalLink } from 'lucide-react';
import { getUsername } from '../lib/auth';
import { COLORS } from '../lib/mockData';

// ── Persistent API key per analyst ──────────────────────────────────────────

function getOrCreateApiKey(): string {
  const stored = localStorage.getItem('sw1ft_api_key');
  if (stored) return stored;
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const key = `sw1ft_live_${hex}`;
  localStorage.setItem('sw1ft_api_key', key);
  return key;
}

function getSiteId(): string {
  const stored = localStorage.getItem('sw1ft_site_id');
  if (stored) return stored;
  const id = 'site_' + Math.random().toString(36).slice(2, 10).toUpperCase();
  localStorage.setItem('sw1ft_site_id', id);
  return id;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  return (
    <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer', color: copied ? COLORS.safe : COLORS.muted, fontFamily: 'JetBrains Mono', fontSize: '10px', padding: '4px 8px', transition: 'color 0.2s' }}>
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div style={{ position: 'relative', background: '#0A0A0C', border: '1px solid #1E1E22', marginTop: '10px' }}>
      <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
        <CopyBtn text={code} />
      </div>
      <pre style={{ margin: 0, padding: '18px 20px', overflowX: 'auto', fontFamily: 'JetBrains Mono', fontSize: '12px', lineHeight: 1.75, color: '#C8C8D4' }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ApiKeys() {
  const [apiKey]       = useState(getOrCreateApiKey);
  const [siteId]       = useState(getSiteId);
  const [showKey, setShowKey] = useState(false);
  const [tab, setTab]  = useState<'script' | 'npm' | 'react'>('script');
  const [rotateConfirm, setRotateConfirm] = useState(false);

  const analyst = getUsername();

  function rotateKey() {
    const bytes = new Uint8Array(18);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const newKey = `sw1ft_live_${hex}`;
    localStorage.setItem('sw1ft_api_key', newKey);
    setRotateConfirm(false);
    window.location.reload();
  }

  const maskedKey = showKey ? apiKey : apiKey.slice(0, 12) + '•'.repeat(24);

  const scriptSnippet = useCallback(() => `<!-- Load SW1FT SDK -->
<script src="https://cdn.sw1ft.eu/sdk/v0/sw1ft-sdk.js"></script>
<script>
  SW1FT.init({
    apiKey:   '${apiKey}',
    selector: '#payment-form',
    endpoint: 'https://api.sw1ft.eu/v1/sessions',
  });
</script>`, [apiKey]);

  const npmSnippet = `npm install @sw1ft/sdk`;

  const esmSnippet = useCallback(() => `import { init } from '@sw1ft/sdk';

const tracker = init({
  apiKey:   '${apiKey}',
  selector: '#payment-form',
  endpoint: 'https://api.sw1ft.eu/v1/sessions',
});`, [apiKey]);

  const reactSnippet = useCallback(() => `import { useEffect, useRef } from 'react';

export function PaymentForm() {
  const formRef = useRef(null);

  useEffect(() => {
    if (!formRef.current) return;
    const tracker = window.SW1FT?.init({
      apiKey:   '${apiKey}',
      selector: formRef.current,
      endpoint: 'https://api.sw1ft.eu/v1/sessions',
    });
    return () => tracker?.destroy();
  }, []);

  return <form ref={formRef} id="payment-form">...</form>;
}`, [apiKey]);

  const tabStyle = (t: string): React.CSSProperties => ({
    padding: '6px 14px',
    fontFamily: 'JetBrains Mono',
    fontSize: '10px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    border: `1px solid ${tab === t ? COLORS.accent : '#1E1E22'}`,
    background: tab === t ? 'rgba(170,85,227,0.08)' : 'transparent',
    color: tab === t ? COLORS.accent : COLORS.muted,
  });

  return (
    <div style={{ padding: '32px', maxWidth: '860px' }}>

      {/* Header */}
      <div style={{ marginBottom: '36px' }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
          API & SDK
        </div>
        <h1 style={{ fontFamily: 'Inter', fontSize: '22px', fontWeight: 700, color: COLORS.primary, margin: '0 0 8px' }}>
          Integration credentials
        </h1>
        <p style={{ fontFamily: 'Inter', fontSize: '14px', color: COLORS.muted, margin: 0 }}>
          Use these credentials to connect the SW1FT SDK to any payment form on your site.
        </p>
      </div>

      {/* Key card */}
      <div style={{ background: '#111115', border: '1px solid #1E1E22', padding: '24px', marginBottom: '28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>

          {/* API Key */}
          <div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: COLORS.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>
              API Key <span style={{ color: COLORS.safe, marginLeft: '8px' }}>● LIVE</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0A0A0C', border: '1px solid #1E1E22', padding: '10px 14px' }}>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: COLORS.primary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {maskedKey}
              </span>
              <button onClick={() => setShowKey(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted, padding: '2px', display: 'flex' }}>
                {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
              <CopyBtn text={apiKey} />
            </div>
          </div>

          {/* Site ID */}
          <div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: COLORS.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Site ID
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0A0A0C', border: '1px solid #1E1E22', padding: '10px 14px' }}>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: COLORS.primary, flex: 1 }}>
                {siteId}
              </span>
              <CopyBtn text={siteId} />
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #1A1A1E' }}>
          <div style={{ display: 'flex', gap: '24px' }}>
            {[
              { label: 'Owner',    value: analyst },
              { label: 'Endpoint', value: 'api.sw1ft.eu/v1' },
              { label: 'Region',   value: 'EU-WEST-1' },
            ].map(m => (
              <div key={m.label}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: COLORS.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '3px' }}>{m.label}</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.primary }}>{m.value}</div>
              </div>
            ))}
          </div>
          {rotateConfirm ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.warning }}>Rotate key?</span>
              <button onClick={rotateKey} style={{ background: COLORS.danger, border: 'none', color: '#fff', fontFamily: 'JetBrains Mono', fontSize: '10px', padding: '5px 10px', cursor: 'pointer' }}>Yes, rotate</button>
              <button onClick={() => setRotateConfirm(false)} style={{ background: 'transparent', border: '1px solid #1E1E22', color: COLORS.muted, fontFamily: 'JetBrains Mono', fontSize: '10px', padding: '5px 10px', cursor: 'pointer' }}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => setRotateConfirm(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid #1E1E22', color: COLORS.muted, fontFamily: 'JetBrains Mono', fontSize: '10px', padding: '7px 12px', cursor: 'pointer' }}>
              <RefreshCw size={11} /> Rotate key
            </button>
          )}
        </div>
      </div>

      {/* Integration snippets */}
      <div style={{ background: '#111115', border: '1px solid #1E1E22', padding: '24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.primary, fontWeight: 600 }}>Integration snippet</div>
          <a href="/docs" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.accent, textDecoration: 'none' }}>
            Full docs <ExternalLink size={11} />
          </a>
        </div>

        <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
          <button style={tabStyle('script')} onClick={() => setTab('script')}>Script tag</button>
          <button style={tabStyle('npm')}    onClick={() => setTab('npm')}>npm</button>
          <button style={tabStyle('react')}  onClick={() => setTab('react')}>React</button>
        </div>

        {tab === 'script' && <CodeBlock code={scriptSnippet()} />}
        {tab === 'npm'    && <><CodeBlock code={npmSnippet} /><CodeBlock code={esmSnippet()} /></>}
        {tab === 'react'  && <CodeBlock code={reactSnippet()} />}
      </div>

      {/* Checklist */}
      <div style={{ background: '#111115', border: '1px solid #1E1E22', padding: '24px', marginBottom: '28px' }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.primary, fontWeight: 600, marginBottom: '16px' }}>Integration checklist</div>
        {[
          { done: true,  text: 'API key generated' },
          { done: false, text: 'SDK added to checkout page' },
          { done: false, text: 'Test session received by endpoint' },
          { done: false, text: 'Risk signals appearing in Sessions tab' },
          { done: false, text: 'Intervention thresholds configured' },
        ].map(item => (
          <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: '1px solid #16161A' }}>
            <div style={{ width: '16px', height: '16px', border: `1px solid ${item.done ? COLORS.safe : '#2A2A32'}`, background: item.done ? 'rgba(0,204,122,0.1)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {item.done && <Check size={10} color={COLORS.safe} />}
            </div>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: item.done ? COLORS.primary : COLORS.muted }}>{item.text}</span>
          </div>
        ))}
      </div>

      {/* Test endpoint info */}
      <div style={{ background: 'rgba(170,85,227,0.04)', border: '1px solid rgba(170,85,227,0.15)', padding: '18px 20px' }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.accent, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Scoring endpoint</div>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', color: COLORS.primary, marginBottom: '6px' }}>POST https://api.sw1ft.eu/v1/sessions</div>
        <div style={{ fontFamily: 'Inter', fontSize: '13px', color: COLORS.muted }}>
          Include your API key in the <code style={{ fontFamily: 'JetBrains Mono', color: COLORS.accent }}>X-SW1FT-Key</code> header.
          The SDK handles this automatically. Sessions captured via SDK appear in the <strong style={{ color: COLORS.primary }}>Sessions</strong> tab of your dashboard.
        </div>
      </div>

    </div>
  );
}
