import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { login, isAuthenticated } from '../lib/auth';
import { COLORS } from '../lib/mockData';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) navigate('/dashboard', { replace: true });
  }, [navigate]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate a brief auth delay (feels more real)
    setTimeout(() => {
      if (login(username, password)) {
        navigate('/dashboard', { replace: true });
      } else {
        setError('Invalid credentials. Access denied.');
        setLoading(false);
      }
    }, 600);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#0A0A0B',
    border: '1px solid #1E1E22',
    color: COLORS.primary,
    fontFamily: 'JetBrains Mono',
    fontSize: '13px',
    padding: '12px 14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0B',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
    }}>

      {/* Subtle grid bg */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, #1E1E22 1px, transparent 1px)',
        backgroundSize: '28px 28px', opacity: 0.4,
      }} />

      <div style={{ position: 'relative', width: '100%', maxWidth: '380px', padding: '0 24px' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px', justifyContent: 'center' }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'rgba(170,85,227,0.08)',
            border: '1px solid rgba(170,85,227,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={18} color={COLORS.accent} />
          </div>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '15px', fontWeight: 600, color: COLORS.primary, letterSpacing: '0.02em' }}>
              SW1FT
            </div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: COLORS.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Analyst Access
            </div>
          </div>
        </div>

        {/* Card */}
        <div style={{ background: '#111115', border: '1px solid #1E1E22', padding: '36px 32px' }}>
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontFamily: 'Inter', fontSize: '18px', fontWeight: 600, color: COLORS.primary, margin: '0 0 6px' }}>
              Sign in
            </h1>
            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.muted, margin: 0 }}>
              Authorised personnel only
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Username */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
                Username
              </label>
              <input
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = COLORS.accent)}
                onBlur={e => (e.target.style.borderColor = '#1E1E22')}
                placeholder="username"
                required
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  style={{ ...inputStyle, paddingRight: '44px' }}
                  onFocus={e => (e.target.style.borderColor = COLORS.accent)}
                  onBlur={e => (e.target.style.borderColor = '#1E1E22')}
                  placeholder="••••••••••"
                  required
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPass(s => !s)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: COLORS.muted }}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,59,92,0.08)', border: '1px solid rgba(255,59,92,0.2)', padding: '10px 12px', marginBottom: '20px' }}>
                <AlertCircle size={13} color={COLORS.danger} />
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.danger }}>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: loading ? 'rgba(170,85,227,0.5)' : COLORS.accent,
                border: 'none',
                color: '#0A0A0B',
                fontFamily: 'JetBrains Mono',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '13px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {loading ? 'Verifying...' : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Demo credentials hint */}
        <div style={{ marginTop: '20px', padding: '14px 16px', background: 'rgba(170,85,227,0.04)', border: '1px solid rgba(170,85,227,0.1)' }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.muted, letterSpacing: '0.08em', marginBottom: '6px', textTransform: 'uppercase' }}>
            Demo credentials
          </div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.accent }}>
            analyst / sentinel2026
          </div>
        </div>

        {/* Footer note */}
        <div style={{ marginTop: '32px', textAlign: 'center', fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#2A2A32' }}>
          SW1FT · EU-WEST-1 · v2.4.1
        </div>
      </div>
    </div>
  );
}
