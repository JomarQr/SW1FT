import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Bell, BarChart2, Users, MousePointer2,
  Database, KeyRound, Brain, ScanFace, LogOut, Activity,
} from 'lucide-react';
import { logout } from '../lib/auth';

const NAV_GROUPS = [
  {
    label: 'Monitor',
    items: [
      { to: '/dashboard',            icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/dashboard/alerts',     icon: Bell,            label: 'Alerts' },
      { to: '/dashboard/analytics',  icon: BarChart2,       label: 'Analytics' },
      { to: '/dashboard/baselines',  icon: Users,           label: 'Baselines' },
    ],
  },
  {
    label: 'Data',
    items: [
      { to: '/dashboard/payment-capture',   icon: MousePointer2, label: 'Capture' },
      { to: '/dashboard/captured-sessions', icon: Database,      label: 'Sessions' },
    ],
  },
  {
    label: 'Engine',
    items: [
      { to: '/dashboard/persona',           icon: Brain,    label: 'Persona Engine' },
      { to: '/dashboard/behavior-profile',  icon: ScanFace, label: 'Behavior Profile' },
    ],
  },
  {
    label: 'Config',
    items: [
      { to: '/dashboard/api-keys', icon: KeyRound, label: 'API & SDK' },
    ],
  },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function isActive(to: string) {
    return to === '/dashboard'
      ? location.pathname === '/dashboard'
      : location.pathname.startsWith(to);
  }

  return (
    <aside style={{
      position: 'fixed', left: 0, top: '32px', bottom: 0, width: '200px',
      background: '#09090B', borderRight: '1px solid #1A1A1F',
      display: 'flex', flexDirection: 'column', zIndex: 50,
    }}>
      {/* Brand strip */}
      <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid #1A1A1F' }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', fontWeight: 700, color: '#E8E8ED', letterSpacing: '0.1em' }}>
          SW1FT
        </div>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#3A3A4A', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '2px' }}>
          Fraud Intelligence Platform
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0 0' }}>
        {NAV_GROUPS.map(group => (
          <div key={group.label} style={{ marginBottom: '4px' }}>
            {/* Section label */}
            <div style={{
              padding: '6px 14px 3px',
              fontFamily: 'JetBrains Mono', fontSize: '8px', fontWeight: 600,
              color: '#36364A', letterSpacing: '0.18em', textTransform: 'uppercase',
            }}>
              {group.label}
            </div>

            {/* Items */}
            {group.items.map(({ to, icon: Icon, label }) => {
              const active = isActive(to);
              return (
                <NavLink
                  key={to}
                  to={to}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '7px 14px',
                    fontFamily: 'Inter', fontSize: '12px',
                    fontWeight: active ? 500 : 400,
                    color: active ? '#C890F0' : '#5A5A6E',
                    background: active ? 'rgba(170,85,227,0.07)' : 'transparent',
                    borderLeft: active ? '2px solid #9944CC' : '2px solid transparent',
                    textDecoration: 'none',
                    transition: 'color 0.12s, background 0.12s',
                    letterSpacing: '0.01em',
                  }}
                  onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = '#9090A8'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; } }}
                  onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = '#5A5A6E'; (e.currentTarget as HTMLElement).style.background = 'transparent'; } }}
                >
                  <Icon size={13} strokeWidth={active ? 2 : 1.5} />
                  {label}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* System status + logout */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid #1A1A1F' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
          <Activity size={10} color="#36364A" />
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#36364A', letterSpacing: '0.08em' }}>
            EU-WEST-1 · 12ms
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#36364A', letterSpacing: '0.06em' }}>ANALYST</div>
            <div style={{ fontFamily: 'Inter', fontSize: '11px', color: '#9090A0', marginTop: '2px' }}>J. Springis</div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            style={{
              background: 'none', border: '1px solid #1A1A1F', cursor: 'pointer',
              padding: '5px', color: '#36364A', display: 'flex', alignItems: 'center',
              transition: 'color 0.12s, border-color 0.12s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#FF3B5C'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#FF3B5C44'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#36364A'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#1A1A1F'; }}
          >
            <LogOut size={12} />
          </button>
        </div>
      </div>
    </aside>
  );
}
