import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';

const ROUTE_NAMES: Record<string, string> = {
  '/dashboard':                    'Live Operations',
  '/dashboard/alerts':             'Alerts Queue',
  '/dashboard/analytics':          'Analytics',
  '/dashboard/baselines':          'Baselines',
  '/dashboard/payment-capture':    'Behavior Capture',
  '/dashboard/captured-sessions':  'Captured Sessions',
  '/dashboard/persona':            'Persona Engine',
  '/dashboard/behavior-profile':   'Behavior Profile',
  '/dashboard/api-keys':           'API & SDK',
};

function useClock() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

export default function TopBar() {
  const { pathname } = useLocation();
  const now = useClock();
  const { isDark, toggle } = useTheme();

  const pageName =
    Object.entries(ROUTE_NAMES)
      .sort((a, b) => b[0].length - a[0].length)
      .find(([p]) => pathname === p || pathname.startsWith(p + '/'))?.[1] ?? '—';

  const cetTime = now.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Berlin',
  });

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: '32px',
      background: 'var(--bg)', borderBottom: '1px solid var(--bdr)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px', zIndex: 60, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.15em' }}>SW1FT</span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--bdr2)', margin: '0 9px', userSelect: 'none' }}>▸</span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--t2)', letterSpacing: '0.05em' }}>{pageName}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', paddingRight: '16px' }}>
          <div className="animate-pulse-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--green)', letterSpacing: '0.1em' }}>LIVE</span>
        </div>
        <span style={{ color: 'var(--t5)', marginRight: '16px', fontSize: '11px' }}>|</span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--t3)', paddingRight: '16px' }}>EU-WEST-1 · 12ms</span>
        <span style={{ color: 'var(--t5)', marginRight: '16px', fontSize: '11px' }}>|</span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--t3)', paddingRight: '16px' }}>
          CET <span style={{ color: 'var(--t1)' }}>{cetTime}</span>
        </span>
        <span style={{ color: 'var(--t5)', marginRight: '16px', fontSize: '11px' }}>|</span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--t3)', paddingRight: '16px' }}>J. Springis</span>
        <button
          onClick={toggle}
          title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          style={{
            background: 'none', border: '1px solid var(--bdr)', cursor: 'pointer',
            padding: '3px 5px', display: 'flex', alignItems: 'center',
            color: 'var(--t3)', transition: 'color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--t3)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--bdr)'; }}
        >
          {isDark ? <Sun size={11} /> : <Moon size={11} />}
        </button>
      </div>
    </div>
  );
}
