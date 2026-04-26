import { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { ANALYTICS_DATA, SIGNAL_EFFECTIVENESS, SCAM_BREAKDOWN, EU_COUNTRY_ALERTS, COLORS } from '../lib/mockData';

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0F0F12', border: '1px solid #1E1E22', padding: '8px 12px', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>
      <div style={{ color: COLORS.muted, marginBottom: '4px' }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color ?? p.fill ?? COLORS.accent, display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
          <span style={{ color: COLORS.muted }}>{p.name}:</span>
          <span>{typeof p.value === 'number' && p.value > 1000 ? `€${p.value.toLocaleString()}` : p.value}{p.name?.includes('%') || p.name?.includes('Rate') || p.name?.includes('Accuracy') ? '%' : ''}</span>
        </div>
      ))}
    </div>
  );
};

function Card({ title, subtitle, children, style }: { title: string; subtitle?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#111115', border: '1px solid #1E1E22', ...style }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #1E1E22' }}>
        <span style={{ fontFamily: 'Inter', fontSize: '13px', fontWeight: 500, color: COLORS.primary }}>{title}</span>
        {subtitle && <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.muted, marginLeft: '10px' }}>{subtitle}</span>}
      </div>
      <div style={{ padding: '16px' }}>
        {children}
      </div>
    </div>
  );
}

// Simplified EU country grid heatmap
function EUHeatmap() {
  const max = Math.max(...EU_COUNTRY_ALERTS.map(c => c.alerts));

  function alertColor(alerts: number): string {
    const ratio = alerts / max;
    if (ratio > 0.75) return '#FF3B5C';
    if (ratio > 0.5) return '#FF8C00';
    if (ratio > 0.25) return '#FFB800';
    return '#3A4A38';
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '16px' }}>
        {EU_COUNTRY_ALERTS.map(c => (
          <div key={c.code} style={{ background: '#0F0F12', border: `1px solid ${alertColor(c.alerts)}44`, padding: '10px 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', fontWeight: 600, color: COLORS.primary }}>{c.code}</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: alertColor(c.alerts), fontWeight: 600 }}>{c.alerts}</span>
            </div>
            <div style={{ height: '3px', background: '#1E1E22' }}>
              <div style={{ height: '100%', width: `${(c.alerts / max) * 100}%`, background: alertColor(c.alerts) }} />
            </div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: COLORS.muted, marginTop: '3px' }}>{c.name}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '8px 0', borderTop: '1px solid #1E1E22' }}>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.muted }}>Density:</span>
        {[
          { label: 'High (>35)', color: '#FF3B5C' },
          { label: 'Med (15–35)', color: '#FF8C00' },
          { label: 'Low (5–15)', color: '#FFB800' },
          { label: 'Minimal (<5)', color: '#3A4A38' },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '10px', height: '10px', background: color }} />
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.muted }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0F0F12', border: '1px solid #1E1E22', padding: '8px 12px', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>
      <div style={{ color: payload[0].payload.fill ?? COLORS.accent }}>{payload[0].name}</div>
      <div style={{ color: COLORS.primary }}>{payload[0].value}%</div>
    </div>
  );
};

export default function Analytics() {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');

  const data = period === 'weekly' ? ANALYTICS_DATA : ANALYTICS_DATA.map((d, i) => ({
    ...d,
    week: i === 0 ? 'Feb' : i === 2 ? 'Mar' : 'Apr',
    sessionsMonitored: d.sessionsMonitored * 4.2,
    lossPrevented: d.lossPrevented * 4.2,
    baselineLoss: d.baselineLoss * 4.2,
    alertsTriggered: d.alertsTriggered * 4,
  })).filter((_, i) => i % 2 === 0);

  const latestWeek = ANALYTICS_DATA[ANALYTICS_DATA.length - 1];

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#0A0A0B' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'Inter', fontSize: '20px', fontWeight: 600, color: COLORS.primary, margin: '0 0 4px' }}>Analytics</h1>
          <p style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.muted, margin: 0 }}>6-week performance report · EU-PSP deployment</p>
        </div>
        <div style={{ display: 'flex', border: '1px solid #1E1E22', overflow: 'hidden' }}>
          {(['weekly', 'monthly'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              background: period === p ? 'rgba(170,85,227,0.1)' : '#111115',
              border: 'none', color: period === p ? COLORS.accent : COLORS.muted,
              fontFamily: 'JetBrains Mono', fontSize: '10px', padding: '6px 14px', cursor: 'pointer',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              borderRight: p === 'weekly' ? '1px solid #1E1E22' : 'none',
            }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI strip */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Alert Accuracy', value: `${latestWeek.alertAccuracy}%`, sub: '↑ 7.7pp since week 1', color: COLORS.safe },
          { label: 'False Positive Rate', value: `${latestWeek.falsePositiveRate}%`, sub: '↓ 2.7pp since week 1', color: COLORS.accent },
          { label: 'Loss Prevented (wk)', value: `€${(latestWeek.lossPrevented / 1000).toFixed(0)}K`, sub: `vs €${(latestWeek.baselineLoss / 1000).toFixed(0)}K without system`, color: COLORS.warning },
          { label: 'Sessions (wk)', value: latestWeek.sessionsMonitored.toLocaleString(), sub: '+19.5% since week 1', color: COLORS.muted },
        ].map(({ label, value, sub, color }) => (
          <div key={label} style={{ flex: 1, background: '#111115', border: '1px solid #1E1E22', padding: '16px' }}>
            <div style={{ fontFamily: 'Inter', fontSize: '11px', color: COLORS.muted, marginBottom: '8px' }}>{label}</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '22px', fontWeight: 600, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.muted, marginTop: '5px' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Trend chart: accuracy + FP rate */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
        <Card title="Alert Accuracy & False Positive Rate Trend" style={{ flex: 1 }}>
          <div style={{ height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: COLORS.muted, fontFamily: 'JetBrains Mono', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: COLORS.muted, fontFamily: 'JetBrains Mono', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="alertAccuracy" name="Accuracy %" stroke={COLORS.safe} strokeWidth={2} dot={{ r: 3, fill: COLORS.safe }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="falsePositiveRate" name="FP Rate %" stroke={COLORS.danger} strokeWidth={2} dot={{ r: 3, fill: COLORS.danger }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: '20px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #1E1E22' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '20px', height: '2px', background: COLORS.safe }} /><span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.muted }}>Alert Accuracy</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '20px', height: '2px', background: COLORS.danger }} /><span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.muted }}>False Positive Rate</span></div>
          </div>
        </Card>

        {/* Loss prevented */}
        <Card title="Loss Prevented vs Baseline (€)" style={{ flex: 1 }}>
          <div style={{ height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: COLORS.muted, fontFamily: 'JetBrains Mono', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: COLORS.muted, fontFamily: 'JetBrains Mono', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `€${(v / 1000).toFixed(0)}K`} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="baselineLoss" name="Without SW1FT" fill="#1E1E22" radius={0} />
                <Bar dataKey="lossPrevented" name="With SW1FT" fill={COLORS.accent} radius={0} fillOpacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: '20px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #1E1E22' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: '#1E1E22', border: '1px solid #2A2A32' }} /><span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.muted }}>Without system</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: COLORS.accent, opacity: 0.8 }} /><span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.muted }}>Prevented</span></div>
          </div>
        </Card>
      </div>

      {/* Signal effectiveness + EU map */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
        <Card title="Signal Effectiveness — True Catches vs False Positives" style={{ flex: 1 }}>
          <div style={{ height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SIGNAL_EFFECTIVENESS} layout="vertical" margin={{ top: 5, right: 10, bottom: 0, left: 130 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" horizontal={false} />
                <XAxis type="number" tick={{ fill: COLORS.muted, fontFamily: 'JetBrains Mono', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <YAxis dataKey="signal" type="category" tick={{ fill: COLORS.primary, fontFamily: 'JetBrains Mono', fontSize: 10 }} axisLine={false} tickLine={false} width={125} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="catches" name="True Catches %" fill={COLORS.safe} radius={0} fillOpacity={0.85} />
                <Bar dataKey="falsePositives" name="False Positives %" fill={COLORS.danger} radius={0} fillOpacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="EU Alert Density — Past 7 Days" style={{ flex: '0 0 360px' }}>
          <EUHeatmap />
        </Card>
      </div>

      {/* Scam typology */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <Card title="Scam Typology Breakdown" style={{ flex: '0 0 400px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ height: '200px', width: '200px', flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={SCAM_BREAKDOWN} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" stroke="none">
                    {SCAM_BREAKDOWN.map((entry, i) => (
                      <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1 }}>
              {SCAM_BREAKDOWN.map(s => (
                <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', background: s.color, flexShrink: 0 }} />
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: COLORS.primary }}>{s.name}</span>
                  </div>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', fontWeight: 600, color: s.color }}>{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Sessions Monitored Over Time" style={{ flex: 1 }}>
          <div style={{ height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E22" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: COLORS.muted, fontFamily: 'JetBrains Mono', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: COLORS.muted, fontFamily: 'JetBrains Mono', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="sessionsMonitored" name="Sessions" fill={COLORS.accent} radius={0} fillOpacity={0.6} />
                <Bar dataKey="alertsTriggered" name="Alerts" fill={COLORS.danger} radius={0} fillOpacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
