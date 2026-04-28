import { useState, useEffect } from 'react';
import { Plus, Trash2, Shield, User, Eye, EyeOff, KeyRound } from 'lucide-react';
import { getUsers, createUser, deleteUser, saveUser, type AppUser, type Role } from '../lib/userStore';
import { getCurrentUser } from '../lib/auth';
import { COLORS } from '../lib/mockData';

const ROLE_CFG: Record<Role, { label: string; color: string; bg: string; border: string }> = {
  superadmin: { label: 'Super Admin', color: '#C890F0', bg: 'rgba(200,144,240,0.08)', border: 'rgba(200,144,240,0.25)' },
  analyst:    { label: 'Analyst',     color: COLORS.accent, bg: 'rgba(170,85,227,0.08)', border: 'rgba(170,85,227,0.25)' },
  client:     { label: 'Client',      color: COLORS.safe,   bg: 'rgba(0,204,122,0.08)',  border: 'rgba(0,204,122,0.25)'  },
};

const PERMISSIONS: [string, boolean, boolean, boolean][] = [
  ['Dashboard — own sessions only',    true,  false, false],
  ['Dashboard — all sessions',         false, true,  true ],
  ['Alerts & Analytics',               false, true,  true ],
  ['Baselines',                        false, true,  true ],
  ['Behavioral Capture',               true,  true,  true ],
  ['Captured Sessions — own only',     true,  false, false],
  ['Captured Sessions — all users',    false, true,  true ],
  ['ML Models',                        false, true,  true ],
  ['Persona Engine / Behavior Profile',false, true,  true ],
  ['API & SDK',                        false, true,  true ],
  ['User Management',                  false, false, true ],
];

function RoleBadge({ role }: { role: Role }) {
  const c = ROLE_CFG[role];
  return (
    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: c.color, background: c.bg, border: `1px solid ${c.border}`, padding: '3px 8px', letterSpacing: '0.06em' }}>
      {c.label}
    </span>
  );
}

export default function AdminPanel() {
  const me = getCurrentUser();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', displayName: '', role: 'client' as Role });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [editPwId, setEditPwId] = useState<string | null>(null);
  const [newPw, setNewPw] = useState('');

  useEffect(() => { setUsers(getUsers()); }, []);

  function refresh() { setUsers(getUsers()); }

  function notify(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(''), 3000);
  }

  function handleCreate() {
    setError('');
    if (!form.username.trim() || !form.password.trim()) {
      setError('Username and password are required');
      return;
    }
    const result = createUser({ ...form, createdBy: me?.username ?? 'admin' });
    if (!result.ok) { setError(result.error ?? 'Error'); return; }
    notify(`Account "${form.username}" created`);
    setForm({ username: '', password: '', displayName: '', role: 'client' });
    setShowForm(false);
    refresh();
  }

  function handleDelete(u: AppUser) {
    if (u.id === me?.id) return;
    if (!confirm(`Delete account "${u.username}"? This cannot be undone.`)) return;
    deleteUser(u.id);
    refresh();
    notify(`Account "${u.username}" deleted`);
  }

  function handleRoleChange(u: AppUser, role: Role) {
    if (u.id === me?.id) return;
    saveUser({ ...u, role });
    refresh();
  }

  function handlePwSave(u: AppUser) {
    if (!newPw.trim()) return;
    saveUser({ ...u, password: newPw });
    setEditPwId(null);
    setNewPw('');
    notify('Password updated');
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg)', border: '1px solid var(--bdr2)',
    color: 'var(--t1)', fontFamily: 'JetBrains Mono', fontSize: '12px',
    padding: '9px 11px', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: '16px', minHeight: '100%', background: 'var(--bg)' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <div style={{ fontFamily: 'Inter', fontSize: '16px', fontWeight: 600, color: 'var(--t1)', marginBottom: '4px' }}>
            User Management
          </div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--t4)' }}>
            {users.length} account{users.length !== 1 ? 's' : ''} · superadmin access only
          </div>
        </div>
        <button
          onClick={() => { setShowForm(s => !s); setError(''); }}
          style={{ display: 'flex', alignItems: 'center', gap: '7px', background: COLORS.accent, border: 'none', color: 'var(--bg)', fontFamily: 'JetBrains Mono', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '9px 16px', cursor: 'pointer' }}
        >
          <Plus size={12} /> New Account
        </button>
      </div>

      {flash && (
        <div style={{ background: 'rgba(0,204,122,0.07)', border: '1px solid rgba(0,204,122,0.2)', padding: '9px 14px', fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.safe, marginBottom: '12px' }}>
          ✓ {flash}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--bdr)', padding: '16px', marginBottom: '14px' }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--t4)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '14px' }}>
            Create Account
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'var(--t4)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '5px' }}>Username</label>
              <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="e.g. acme_corp" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'var(--t4)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '5px' }}>Display Name</label>
              <input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} placeholder="Full name" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'var(--t4)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '5px' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Temporary password" style={{ ...inputStyle, paddingRight: '32px' }} />
                <button tabIndex={-1} type="button" onClick={() => setShowPw(s => !s)} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 0 }}>
                  {showPw ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'var(--t4)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '5px' }}>Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                style={{ background: 'var(--bg)', border: '1px solid var(--bdr2)', color: 'var(--t1)', fontFamily: 'JetBrains Mono', fontSize: '12px', padding: '9px 11px', outline: 'none', cursor: 'pointer', height: '39px' }}>
                <option value="client">Client</option>
                <option value="analyst">Analyst</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>
          </div>
          {error && (
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.danger, marginTop: '10px' }}>✗ {error}</div>
          )}
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            <button onClick={handleCreate}
              style={{ background: COLORS.accent, border: 'none', color: 'var(--bg)', fontFamily: 'JetBrains Mono', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 20px', cursor: 'pointer' }}>
              Create Account
            </button>
            <button onClick={() => { setShowForm(false); setError(''); }}
              style={{ background: 'transparent', border: '1px solid var(--bdr)', color: 'var(--t4)', fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.08em', padding: '8px 14px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Users table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--bdr)', overflow: 'hidden', marginBottom: '14px' }}>
        <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--bdr)', background: 'var(--bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', fontWeight: 600, color: 'var(--t4)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Accounts</span>
        </div>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr style={{ background: 'var(--bg)' }}>
              {['User', 'Username', 'Role', 'Password', 'Created', 'Created By', ''].map((h, i) => (
                <th key={i} style={{ padding: '5px 12px', fontFamily: 'JetBrains Mono', fontSize: '8px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--bdr2)', borderBottom: '1px solid var(--bdr)', textAlign: 'left', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const isMe = u.id === me?.id;
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--card)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.015)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Display name */}
                  <td style={{ padding: '9px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--card)', border: '1px solid var(--bdr)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {u.role === 'superadmin' ? <Shield size={12} color={COLORS.accent} /> : <User size={12} color="var(--t4)" />}
                      </div>
                      <div>
                        <div style={{ fontFamily: 'Inter', fontSize: '12px', color: 'var(--t1)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                          {u.displayName || u.username}
                          {isMe && <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: COLORS.accent, marginLeft: '8px', letterSpacing: '0.1em' }}>YOU</span>}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Username */}
                  <td style={{ padding: '9px 12px', fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--t3)', whiteSpace: 'nowrap' }}>
                    {u.username}
                  </td>

                  {/* Role */}
                  <td style={{ padding: '9px 12px' }}>
                    {isMe ? (
                      <RoleBadge role={u.role} />
                    ) : (
                      <select value={u.role} onChange={e => handleRoleChange(u, e.target.value as Role)}
                        style={{ background: ROLE_CFG[u.role].bg, border: `1px solid ${ROLE_CFG[u.role].border}`, color: ROLE_CFG[u.role].color, fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.06em', padding: '4px 8px', cursor: 'pointer', outline: 'none' }}>
                        <option value="client">Client</option>
                        <option value="analyst">Analyst</option>
                        <option value="superadmin">Super Admin</option>
                      </select>
                    )}
                  </td>

                  {/* Password */}
                  <td style={{ padding: '9px 12px' }}>
                    {editPwId === u.id ? (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={newPw}
                          onChange={e => setNewPw(e.target.value)}
                          placeholder="New password"
                          autoFocus
                          style={{ background: 'var(--bg)', border: '1px solid var(--bdr2)', color: 'var(--t1)', fontFamily: 'JetBrains Mono', fontSize: '11px', padding: '4px 8px', outline: 'none', width: '130px' }}
                        />
                        <button onClick={() => handlePwSave(u)}
                          style={{ background: COLORS.accent, border: 'none', color: 'var(--bg)', fontFamily: 'JetBrains Mono', fontSize: '9px', fontWeight: 600, padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          Save
                        </button>
                        <button onClick={() => { setEditPwId(null); setNewPw(''); }}
                          style={{ background: 'none', border: '1px solid var(--bdr)', color: 'var(--t4)', fontFamily: 'JetBrains Mono', fontSize: '9px', padding: '4px 8px', cursor: 'pointer' }}>
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditPwId(u.id); setNewPw(''); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: '1px solid var(--bdr)', color: 'var(--t4)', fontFamily: 'JetBrains Mono', fontSize: '9px', padding: '4px 9px', cursor: 'pointer', transition: 'color 0.12s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--t2)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--t4)')}
                      >
                        <KeyRound size={10} /> Change
                      </button>
                    )}
                  </td>

                  {/* Created */}
                  <td style={{ padding: '9px 12px', fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--t4)', whiteSpace: 'nowrap' }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>

                  {/* Created by */}
                  <td style={{ padding: '9px 12px', fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--t4)' }}>
                    {u.createdBy}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                    {!isMe && (
                      <button onClick={() => handleDelete(u)} title="Delete account"
                        style={{ background: 'none', border: '1px solid var(--bdr)', color: 'var(--t4)', cursor: 'pointer', padding: '5px 8px', display: 'inline-flex', alignItems: 'center', transition: 'color 0.12s, border-color 0.12s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = COLORS.danger; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,59,92,0.3)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--bdr)'; }}
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Role permission matrix */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--bdr)', overflow: 'hidden' }}>
        <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--bdr)', background: 'var(--bg)' }}>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', fontWeight: 600, color: 'var(--t4)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Role Permissions</span>
        </div>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr style={{ background: 'var(--bg)' }}>
              <th style={{ padding: '6px 14px', fontFamily: 'JetBrains Mono', fontSize: '8px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--bdr2)', borderBottom: '1px solid var(--bdr)', textAlign: 'left' }}>Permission</th>
              {(['client', 'analyst', 'superadmin'] as Role[]).map(r => (
                <th key={r} style={{ padding: '6px 20px', fontFamily: 'JetBrains Mono', fontSize: '8px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: ROLE_CFG[r].color, borderBottom: '1px solid var(--bdr)', textAlign: 'center' }}>
                  {ROLE_CFG[r].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map(([perm, client, analyst, sa]) => (
              <tr key={perm} style={{ borderBottom: '1px solid var(--card)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.01)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '7px 14px', fontFamily: 'Inter', fontSize: '11px', color: 'var(--t3)' }}>{perm}</td>
                {[client, analyst, sa].map((v, i) => (
                  <td key={i} style={{ padding: '7px 20px', textAlign: 'center', fontFamily: 'JetBrains Mono', fontSize: '12px', color: v ? COLORS.safe : 'var(--card)', fontWeight: v ? 700 : 400 }}>
                    {v ? '✓' : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
