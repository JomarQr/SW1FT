import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

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
      background: '#080809', borderBottom: '1px solid #1A1A1F',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px', zIndex: 60, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', fontWeight: 700, color: '#AA55E3', letterSpacing: '0.15em' }}>SW1FT</span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#2A2A36', margin: '0 9px', userSelect: 'none' }}>▸</span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#9090A0', letterSpacing: '0.05em' }}>{pageName}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', paddingRight: '16px' }}>
          <div className="animate-pulse-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#00CC7A', flexShrink: 0 }} />
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#00CC7A', letterSpacing: '0.1em' }}>LIVE</span>
        </div>
        <span style={{ color: '#222228', marginRight: '16px', fontSize: '11px' }}>|</span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#55556A', paddingRight: '16px' }}>EU-WEST-1 · 12ms</span>
        <span style={{ color: '#222228', marginRight: '16px', fontSize: '11px' }}>|</span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#55556A', paddingRight: '16px' }}>
          CET <span style={{ color: '#C8C8D4' }}>{cetTime}</span>
        </span>
        <span style={{ color: '#222228', marginRight: '16px', fontSize: '11px' }}>|</span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#55556A' }}>J. Springis</span>
      </div>
    </div>
  );
}
