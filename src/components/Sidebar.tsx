import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Bell, BarChart2, Users, Activity, LogOut, MousePointer2, Database, KeyRound, Brain } from 'lucide-react';
import { logout } from '../lib/auth';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/dashboard/alerts', icon: Bell, label: 'Alerts' },
  { to: '/dashboard/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/dashboard/baselines', icon: Users, label: 'Baselines' },
  { to: '/dashboard/payment-capture',   icon: MousePointer2, label: 'Capture' },
  { to: '/dashboard/captured-sessions', icon: Database,      label: 'Sessions' },
  { to: '/dashboard/persona',            icon: Brain,         label: 'Persona Engine' },
  { to: '/dashboard/api-keys',          icon: KeyRound,      label: 'API & SDK' },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <aside
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: '220px',
        background: '#0F0F12',
        borderRight: '1px solid #1E1E22',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid #1E1E22' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo_chrome.png" alt="SW1FT" style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', fontWeight: 600, color: '#E8E8ED', letterSpacing: '0.02em' }}>
              SW1FT
            </div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#6B6B7A', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '1px' }}>
              v2.4.1 · EU-PSP
            </div>
          </div>
        </div>
      </div>

      {/* Nav section label */}
      <div style={{ padding: '16px 16px 6px', fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#6B6B7A', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        Workspace
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '0 8px' }}>
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const isActive = to === '/dashboard'
            ? location.pathname === '/dashboard'
            : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 10px',
                marginBottom: '2px',
                fontFamily: 'Inter',
                fontSize: '13px',
                fontWeight: isActive ? 500 : 400,
                color: isActive ? '#AA55E3' : '#6B6B7A',
                background: isActive ? 'rgba(170, 85, 227, 0.07)' : 'transparent',
                borderLeft: isActive ? '2px solid #AA55E3' : '2px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={15} />
              {label}
            </NavLink>
          );
        })}
      </nav>

      {/* System status + logout */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #1E1E22' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div className="animate-pulse-dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#00CC7A', flexShrink: 0 }} />
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#00CC7A' }}>SYSTEM LIVE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={11} color="#6B6B7A" />
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#6B6B7A' }}>EU-WEST-1 · 12ms</span>
        </div>

        {/* Analyst + logout */}
        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #1E1E22', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#6B6B7A' }}>Analyst</div>
            <div style={{ fontFamily: 'Inter', fontSize: '12px', color: '#E8E8ED', marginTop: '2px' }}>J. Springis</div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            style={{
              background: 'none',
              border: '1px solid #1E1E22',
              cursor: 'pointer',
              padding: '6px',
              color: '#6B6B7A',
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#FF3B5C'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#FF3B5C44'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6B6B7A'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#1E1E22'; }}
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
