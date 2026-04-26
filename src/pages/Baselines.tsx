import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Search, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { BASELINES, COLORS, type BaselineHealth, type UserBaseline } from '../lib/mockData';

const HEALTH_CFG: Record<BaselineHealth, { bg: string; text: string; label: string }> = {
  HEALTHY:    { bg: 'rgba(0,204,122,0.12)',  text: '#00CC7A', label: 'HEALTHY' },
  DEGRADING:  { bg: 'rgba(255,184,0,0.12)',  text: '#FFB800', label: 'DEGRADING' },
  COLD_START: { bg: 'rgba(107,107,122,0.15)', text: '#6B6B7A', label: 'COLD START' },
};

function HealthBadge({ status }: { status: BaselineHealth }) {
  const cfg = HEALTH_CFG[status];
  return (
    <span style={{ background: cfg.bg, color: cfg.text, fontFamily: 'JetBrains Mono', fontSize: '10px', fontWeight: 600, padding: '2px 7px', border: `1px solid ${cfg.text}33`, letterSpacing: '0.06em' }}>
      {cfg.label}
    </span>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 70 ? COLORS.safe : value >= 40 ? COLORS.warning : COLORS.muted;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '60px', height: '3px', background: '#1E1E22' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color }} />
      </div>
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color }}>{value}</span>
    </div>
  );
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ExpandedBaseline({ b }: { b: UserBaseline }) {
  const s = b.signals;
  const rows = [
    { label: 'Avg pre-confirmation pause', value: `${s.avgPreConfirmationPause.toFixed(2)}s`, sd: `± ${s.sdPreConfirmationPause.toFixed(2)}s` },
    { label: 'Avg typing cadence (CPM)', value: `${s.avgTypingCadence}`, sd: `± ${s.sdTypingCadence}` },
    { label: 'Avg scroll depth', value: `${s.avgScrollDepth}%`, sd: `± ${s.sdScrollDepth}%` },
    { label: 'Avg session duration', value: `${s.avgSessionDuration}s`, sd: `± ${s.sdSessionDuration}s` },
  ];

  return (
    <tr>
      <td colSpan={8} style={{ padding: 0, background: '#0A0A0B' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #1E1E22', display: 'flex', gap: '40px' }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Baseline Signal Ranges
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {rows.map(row => (
                <div key={row.label} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.muted, width: '220px', flexShrink: 0 }}>{row.label}</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.primary, width: '70px' }}>{row.value}</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.muted }}>{row.sd}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Enrollment Info
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.muted }}>
                Enrolled: <span style={{ color: COLORS.primary }}>{fmtDate(b.enrolledDate)}</span>
              </div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.muted }}>
                Country: <span style={{ color: COLORS.primary }}>{b.country}</span>
              </div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.muted }}>
                Sessions needed for HEALTHY: <span style={{ color: b.baselineSessions >= 30 ? COLORS.safe : COLORS.warning }}>{Math.max(0, 30 - b.baselineSessions)} more</span>
              </div>
            </div>
          </div>
          {b.healthStatus === 'COLD_START' && (
            <div style={{ background: 'rgba(255,184,0,0.06)', border: '1px solid rgba(255,184,0,0.2)', padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <Clock size={14} color={COLORS.warning} style={{ marginTop: '1px', flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.warning, fontWeight: 600, marginBottom: '4px' }}>COLD START</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.muted, lineHeight: 1.5 }}>
                  Baseline requires ≥30 sessions.<br />
                  {b.baselineSessions} of 30 collected ({Math.round((b.baselineSessions / 30) * 100)}%).<br />
                  Anomaly detection in fallback mode.
                </div>
              </div>
            </div>
          )}
          {b.healthStatus === 'DEGRADING' && (
            <div style={{ background: 'rgba(255,184,0,0.06)', border: '1px solid rgba(255,184,0,0.2)', padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <AlertTriangle size={14} color={COLORS.warning} style={{ marginTop: '1px', flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.warning, fontWeight: 600, marginBottom: '4px' }}>BASELINE DEGRADING</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.muted, lineHeight: 1.5 }}>
                  Signal drift detected. Confidence at {b.confidenceScore}%.<br />
                  Consider baseline reset after analyst review.
                </div>
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function Baselines() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [healthFilter, setHealthFilter] = useState<BaselineHealth | ''>('');
  const [sortKey, setSortKey] = useState<'baselineSessions' | 'confidenceScore' | 'anomalyCount' | 'lastActive'>('confidenceScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    let data = [...BASELINES];
    if (search) data = data.filter(b => b.userId.toLowerCase().includes(search.toLowerCase()));
    if (healthFilter) data = data.filter(b => b.healthStatus === healthFilter);
    data.sort((a, b) => {
      let av: number, bv: number;
      if (sortKey === 'lastActive') { av = new Date(a.lastActive).getTime(); bv = new Date(b.lastActive).getTime(); }
      else { av = a[sortKey]; bv = b[sortKey]; }
      return sortDir === 'desc' ? bv - av : av - bv;
    });
    return data;
  }, [search, healthFilter, sortKey, sortDir]);

  function toggleExpand(id: string) {
    setExpanded(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  const thStyle = (key?: typeof sortKey): React.CSSProperties => ({
    textAlign: 'left', padding: '8px 12px', fontFamily: 'JetBrains Mono', fontSize: '10px', fontWeight: 500,
    letterSpacing: '0.1em', textTransform: 'uppercase', color: key && sortKey === key ? COLORS.accent : COLORS.muted,
    borderBottom: '1px solid #1E1E22', whiteSpace: 'nowrap', cursor: key ? 'pointer' : 'default', userSelect: 'none',
  });

  const healthCounts = {
    HEALTHY:    BASELINES.filter(b => b.healthStatus === 'HEALTHY').length,
    DEGRADING:  BASELINES.filter(b => b.healthStatus === 'DEGRADING').length,
    COLD_START: BASELINES.filter(b => b.healthStatus === 'COLD_START').length,
  };

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#0A0A0B' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontFamily: 'Inter', fontSize: '20px', fontWeight: 600, color: COLORS.primary, margin: '0 0 4px' }}>
          User Baseline Manager
        </h1>
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.muted, margin: 0 }}>
          {BASELINES.length} enrolled users · behavioral profiles for anomaly detection
        </p>
      </div>

      {/* Health summary */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        {([
          { status: 'HEALTHY' as BaselineHealth,    icon: CheckCircle,    count: healthCounts.HEALTHY },
          { status: 'DEGRADING' as BaselineHealth,  icon: AlertTriangle,  count: healthCounts.DEGRADING },
          { status: 'COLD_START' as BaselineHealth, icon: Clock,          count: healthCounts.COLD_START },
        ]).map(({ status, icon: Icon, count }) => {
          const cfg = HEALTH_CFG[status];
          return (
            <div
              key={status}
              onClick={() => setHealthFilter(f => f === status ? '' : status)}
              style={{ flex: 1, background: healthFilter === status ? `${cfg.text}15` : '#111115', border: `1px solid ${healthFilter === status ? cfg.text + '44' : '#1E1E22'}`, padding: '14px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.15s' }}
            >
              <div>
                <div style={{ fontFamily: 'Inter', fontSize: '11px', color: COLORS.muted, marginBottom: '6px' }}>{cfg.label}</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '24px', fontWeight: 600, color: cfg.text }}>{count}</div>
              </div>
              <Icon size={20} color={cfg.text} />
            </div>
          );
        })}
      </div>

      {/* Search + filter */}
      <div style={{ background: '#111115', border: '1px solid #1E1E22', padding: '10px 16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <Search size={12} color={COLORS.muted} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search user ID..."
            style={{ background: 'none', border: 'none', outline: 'none', fontFamily: 'JetBrains Mono', fontSize: '12px', color: COLORS.primary, flex: 1 }}
          />
        </div>
        {healthFilter && (
          <button onClick={() => setHealthFilter('')} style={{ background: 'none', border: 'none', color: COLORS.danger, fontFamily: 'JetBrains Mono', fontSize: '10px', cursor: 'pointer', padding: 0 }}>
            clear filter ×
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: '#111115', border: '1px solid #1E1E22' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr style={{ background: '#0F0F12' }}>
              <th style={thStyle()}>User ID</th>
              <th style={thStyle('baselineSessions')} onClick={() => toggleSort('baselineSessions')}>
                Sessions {sortKey === 'baselineSessions' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th style={thStyle('confidenceScore')} onClick={() => toggleSort('confidenceScore')}>
                Confidence {sortKey === 'confidenceScore' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th style={thStyle('lastActive')} onClick={() => toggleSort('lastActive')}>
                Last Active {sortKey === 'lastActive' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th style={thStyle('anomalyCount')} onClick={() => toggleSort('anomalyCount')}>
                Anomalies {sortKey === 'anomalyCount' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th style={thStyle()}>Country</th>
              <th style={thStyle()}>Health Status</th>
              <th style={thStyle()}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => (
              <>
                <tr
                  key={b.userId}
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleExpand(b.userId)}
                >
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #1E1E22', fontFamily: 'JetBrains Mono', fontSize: '12px', color: COLORS.accent }}>{b.userId}</td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #1E1E22' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: b.baselineSessions < 30 ? COLORS.warning : COLORS.primary }}>
                        {b.baselineSessions}
                      </span>
                      {b.baselineSessions < 30 && <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: COLORS.warning }}>COLD</span>}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #1E1E22' }}>
                    <ConfidenceBar value={b.confidenceScore} />
                  </td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #1E1E22', fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.muted }}>{fmtTime(b.lastActive)}</td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #1E1E22', fontFamily: 'JetBrains Mono', fontSize: '12px', color: b.anomalyCount > 5 ? COLORS.warning : COLORS.primary }}>{b.anomalyCount}</td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #1E1E22', fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.muted }}>{b.country}</td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #1E1E22' }}>
                    <HealthBadge status={b.healthStatus} />
                  </td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #1E1E22', color: COLORS.muted }}>
                    {expanded.has(b.userId) ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </td>
                </tr>
                {expanded.has(b.userId) && <ExpandedBaseline key={`${b.userId}-exp`} b={b} />}
              </>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center', fontFamily: 'JetBrains Mono', fontSize: '12px', color: COLORS.muted }}>
            No baselines match the current filters
          </div>
        )}
      </div>
    </div>
  );
}
