import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Filter, ExternalLink } from 'lucide-react';
import { ALERTS, COLORS, type Alert, type AlertStatus, type AlertSeverity, type Channel, type ScamType } from '../lib/mockData';

function riskColor(score: number): string {
  if (score >= 85) return COLORS.danger;
  if (score >= 65) return COLORS.orange;
  if (score >= 40) return COLORS.warning;
  return COLORS.safe;
}

const SEVERITY_CFG: Record<AlertSeverity, { bg: string; text: string }> = {
  CRITICAL: { bg: 'rgba(255,59,92,0.14)',  text: '#FF3B5C' },
  HIGH:     { bg: 'rgba(255,140,0,0.12)',  text: '#FF8C00' },
  MEDIUM:   { bg: 'rgba(255,184,0,0.12)',  text: '#FFB800' },
  LOW:      { bg: 'rgba(107,107,122,0.15)', text: '#6B6B7A' },
};

const STATUS_CFG: Record<AlertStatus, { text: string }> = {
  PENDING:   { text: '#FFB800' },
  REVIEWED:  { text: '#6B6B7A' },
  ESCALATED: { text: '#FF8C00' },
  BLOCKED:   { text: '#FF3B5C' },
};

function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const cfg = SEVERITY_CFG[severity];
  return (
    <span style={{ background: cfg.bg, color: cfg.text, fontFamily: 'JetBrains Mono', fontSize: '10px', fontWeight: 600, padding: '2px 7px', border: `1px solid ${cfg.text}33`, letterSpacing: '0.06em' }}>
      {severity}
    </span>
  );
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m ago`;
}

function ExpandedRow({ alert }: { alert: Alert }) {
  const navigate = useNavigate();
  return (
    <tr>
      <td colSpan={9} style={{ padding: 0, background: '#0F0F12' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #1E1E22', display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Signal Summary</div>
            {alert.signalSummary.map(s => (
              <div key={s.signal} style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.primary }}>{s.signal}</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.muted }}>{s.value}</span>
                </div>
                <div style={{ height: '3px', background: '#1E1E22' }}>
                  <div style={{ height: '100%', width: `${s.weight}%`, background: s.weight > 70 ? COLORS.danger : COLORS.orange }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {[
                ['Session', alert.sessionId],
                ['Scam Type', alert.scamType],
                ['Channel', alert.channel.toUpperCase()],
                ['Amount', `€${alert.transactionAmount.toLocaleString()}`],
                ['Status', alert.status],
                ['Time', fmtTime(alert.time)],
              ].map(([k, v]) => (
                <div key={k}>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.muted }}>{k}: </span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.primary }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <button
              onClick={() => navigate(`/dashboard/session/${alert.sessionId}`)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(170,85,227,0.08)', border: '1px solid rgba(170,85,227,0.2)', color: COLORS.accent, fontFamily: 'JetBrains Mono', fontSize: '11px', padding: '6px 12px', cursor: 'pointer' }}
            >
              <ExternalLink size={11} /> View Session
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function Alerts() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    severity: '' as AlertSeverity | '',
    channel: '' as Channel | '',
    status: '' as AlertStatus | '',
    scamType: '' as ScamType | '',
  });
  const [sortKey, setSortKey] = useState<'riskScore' | 'time' | 'transactionAmount'>('riskScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    let data = [...ALERTS];
    if (filters.severity) data = data.filter(a => a.severity === filters.severity);
    if (filters.channel) data = data.filter(a => a.channel === filters.channel);
    if (filters.status) data = data.filter(a => a.status === filters.status);
    if (filters.scamType) data = data.filter(a => a.scamType === filters.scamType);
    data.sort((a, b) => {
      let av: number, bv: number;
      if (sortKey === 'time') { av = new Date(a.time).getTime(); bv = new Date(b.time).getTime(); }
      else { av = a[sortKey]; bv = b[sortKey]; }
      return sortDir === 'desc' ? bv - av : av - bv;
    });
    return data;
  }, [filters, sortKey, sortDir]);

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  function toggleExpand(id: string) {
    setExpanded(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  function toggleSelect(id: string) {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  const selectAll = () => setSelected(new Set(filtered.map(a => a.id)));
  const clearAll = () => setSelected(new Set());

  const filterSel = (label: string, key: keyof typeof filters, opts: string[]) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.muted }}>{label}:</span>
      <select
        value={filters[key]}
        onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
        style={{ background: '#111115', border: '1px solid #1E1E22', color: filters[key] ? COLORS.accent : COLORS.muted, fontFamily: 'JetBrains Mono', fontSize: '10px', padding: '4px 8px', cursor: 'pointer', outline: 'none' }}
      >
        <option value="">ALL</option>
        {opts.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const thStyle = (key?: typeof sortKey): React.CSSProperties => ({
    textAlign: 'left', padding: '8px 12px', fontFamily: 'JetBrains Mono', fontSize: '10px', fontWeight: 500,
    letterSpacing: '0.1em', textTransform: 'uppercase', color: key && sortKey === key ? COLORS.accent : COLORS.muted,
    borderBottom: '1px solid #1E1E22', whiteSpace: 'nowrap', cursor: key ? 'pointer' : 'default',
    userSelect: 'none',
  });

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#0A0A0B' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontFamily: 'Inter', fontSize: '20px', fontWeight: 600, color: COLORS.primary, margin: '0 0 4px' }}>
          Alerts Queue
        </h1>
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.muted, margin: 0 }}>
          {filtered.length} alerts · {ALERTS.filter(a => a.status === 'PENDING').length} pending review
        </p>
      </div>

      {/* Filters */}
      <div style={{ background: '#111115', border: '1px solid #1E1E22', padding: '12px 16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: COLORS.muted }}>
          <Filter size={12} />
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Filters</span>
        </div>
        {filterSel('Severity', 'severity', ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])}
        {filterSel('Channel', 'channel', ['mobile', 'web'])}
        {filterSel('Status', 'status', ['PENDING', 'REVIEWED', 'ESCALATED', 'BLOCKED'])}
        {filterSel('Type', 'scamType', ['IMPERSONATION', 'APP', 'INVESTMENT', 'BEC', 'ROMANCE'])}
        {(filters.severity || filters.channel || filters.status || filters.scamType) && (
          <button
            onClick={() => setFilters({ severity: '', channel: '', status: '', scamType: '' })}
            style={{ background: 'none', border: 'none', color: COLORS.danger, fontFamily: 'JetBrains Mono', fontSize: '10px', cursor: 'pointer', padding: 0 }}
          >
            clear filters ×
          </button>
        )}
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div style={{ background: 'rgba(170,85,227,0.06)', border: '1px solid rgba(170,85,227,0.2)', padding: '10px 16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.accent }}>{selected.size} selected</span>
          {[
            { label: 'Mark Reviewed', color: COLORS.muted },
            { label: 'Escalate', color: COLORS.orange },
            { label: 'Block Transaction', color: COLORS.danger },
          ].map(({ label, color }) => (
            <button key={label} onClick={clearAll} style={{ background: 'none', border: `1px solid ${color}44`, color, fontFamily: 'JetBrains Mono', fontSize: '10px', padding: '4px 10px', cursor: 'pointer', letterSpacing: '0.04em' }}>
              {label}
            </button>
          ))}
          <button onClick={clearAll} style={{ background: 'none', border: 'none', color: COLORS.muted, fontFamily: 'JetBrains Mono', fontSize: '10px', cursor: 'pointer', marginLeft: 'auto' }}>× deselect all</button>
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#111115', border: '1px solid #1E1E22' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr style={{ background: '#0F0F12' }}>
              <th style={{ ...thStyle(), width: '36px', padding: '8px 12px' }}>
                <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={e => e.target.checked ? selectAll() : clearAll()}
                  style={{ accentColor: COLORS.accent, cursor: 'pointer', width: '13px', height: '13px' }} />
              </th>
              <th style={thStyle()}>Alert ID</th>
              <th style={thStyle()}>User</th>
              <th style={thStyle('riskScore')} onClick={() => toggleSort('riskScore')}>
                Risk {sortKey === 'riskScore' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th style={thStyle()}>Severity</th>
              <th style={thStyle()}>Primary Signal</th>
              <th style={thStyle()}>Channel</th>
              <th style={thStyle('transactionAmount')} onClick={() => toggleSort('transactionAmount')}>
                Amount {sortKey === 'transactionAmount' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th style={thStyle()}>Status</th>
              <th style={thStyle('time')} onClick={() => toggleSort('time')}>
                Time {sortKey === 'time' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th style={thStyle()}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(alert => (
              <>
                <tr
                  key={alert.id}
                  style={{ cursor: 'pointer', background: selected.has(alert.id) ? 'rgba(170,85,227,0.04)' : 'transparent' }}
                >
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid #1E1E22' }}>
                    <input type="checkbox" checked={selected.has(alert.id)} onChange={() => toggleSelect(alert.id)}
                      style={{ accentColor: COLORS.accent, cursor: 'pointer', width: '13px', height: '13px' }} onClick={e => e.stopPropagation()} />
                  </td>
                  <td onClick={() => toggleExpand(alert.id)} style={{ padding: '9px 12px', borderBottom: '1px solid #1E1E22', fontFamily: 'JetBrains Mono', fontSize: '12px', color: COLORS.accent }}>{alert.id}</td>
                  <td onClick={() => toggleExpand(alert.id)} style={{ padding: '9px 12px', borderBottom: '1px solid #1E1E22', fontFamily: 'JetBrains Mono', fontSize: '12px', color: COLORS.muted }}>{alert.userId}</td>
                  <td onClick={() => toggleExpand(alert.id)} style={{ padding: '9px 12px', borderBottom: '1px solid #1E1E22' }}>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', fontWeight: 600, color: riskColor(alert.riskScore) }}>{alert.riskScore}</span>
                  </td>
                  <td onClick={() => toggleExpand(alert.id)} style={{ padding: '9px 12px', borderBottom: '1px solid #1E1E22' }}>
                    <SeverityBadge severity={alert.severity} />
                  </td>
                  <td onClick={() => toggleExpand(alert.id)} style={{ padding: '9px 12px', borderBottom: '1px solid #1E1E22', fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.primary, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{alert.primarySignal}</td>
                  <td onClick={() => toggleExpand(alert.id)} style={{ padding: '9px 12px', borderBottom: '1px solid #1E1E22', fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{alert.channel}</td>
                  <td onClick={() => toggleExpand(alert.id)} style={{ padding: '9px 12px', borderBottom: '1px solid #1E1E22', fontFamily: 'JetBrains Mono', fontSize: '12px', color: COLORS.primary }}>€{alert.transactionAmount.toLocaleString()}</td>
                  <td onClick={() => toggleExpand(alert.id)} style={{ padding: '9px 12px', borderBottom: '1px solid #1E1E22', fontFamily: 'JetBrains Mono', fontSize: '11px', color: STATUS_CFG[alert.status].text, letterSpacing: '0.04em' }}>{alert.status}</td>
                  <td onClick={() => toggleExpand(alert.id)} style={{ padding: '9px 12px', borderBottom: '1px solid #1E1E22', fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.muted, whiteSpace: 'nowrap' }}>{fmtTime(alert.time)}</td>
                  <td onClick={() => toggleExpand(alert.id)} style={{ padding: '9px 12px', borderBottom: '1px solid #1E1E22', color: COLORS.muted }}>
                    {expanded.has(alert.id) ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </td>
                </tr>
                {expanded.has(alert.id) && <ExpandedRow key={`${alert.id}-exp`} alert={alert} />}
              </>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center', fontFamily: 'JetBrains Mono', fontSize: '12px', color: COLORS.muted }}>
            No alerts match the current filters
          </div>
        )}
      </div>
    </div>
  );
}
