import { useState } from 'react';
import { ComposableMap, Geographies, Geography, Marker, Line } from 'react-simple-maps';
import { CheckCircle, AlertTriangle, Info, MapPin } from 'lucide-react';

/* ── data ──────────────────────────────────────────────────────────────────── */

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

type MarkerType = 'current' | 'trusted' | 'new' | 'highrisk';

interface GeoMarker {
  id: string;
  name: string;
  city: string;
  coordinates: [number, number];
  type: MarkerType;
  sessions: number;
  risk: string;
}

const MARKERS: GeoMarker[] = [
  { id: 'riga',     name: 'Latvia',      city: 'Riga',      coordinates: [24.1,  56.9], type: 'current',  sessions: 12, risk: 'Low'      },
  { id: 'vilnius',  name: 'Lithuania',   city: 'Vilnius',   coordinates: [25.3,  54.7], type: 'trusted',  sessions: 8,  risk: 'Low'      },
  { id: 'tallinn',  name: 'Estonia',     city: 'Tallinn',   coordinates: [24.7,  59.4], type: 'trusted',  sessions: 5,  risk: 'Low'      },
  { id: 'berlin',   name: 'Germany',     city: 'Berlin',    coordinates: [13.4,  52.5], type: 'trusted',  sessions: 3,  risk: 'Low'      },
  { id: 'warsaw',   name: 'Poland',      city: 'Warsaw',    coordinates: [21.0,  52.2], type: 'trusted',  sessions: 2,  risk: 'Low'      },
  { id: 'istanbul', name: 'Turkey',      city: 'Istanbul',  coordinates: [28.9,  41.0], type: 'new',      sessions: 1,  risk: 'Elevated' },
  { id: 'dubai',    name: 'UAE',         city: 'Dubai',     coordinates: [55.3,  25.2], type: 'new',      sessions: 1,  risk: 'Elevated' },
  { id: 'lagos',    name: 'Nigeria',     city: 'Lagos',     coordinates: [3.4,    6.5], type: 'highrisk', sessions: 0,  risk: 'High'     },
  { id: 'moscow',   name: 'Russia',      city: 'Moscow',    coordinates: [37.6,  55.8], type: 'highrisk', sessions: 0,  risk: 'Blocked'  },
];

// Animated arcs FROM trusted regions TO current (Riga)
const CONNECTIONS: { from: [number, number]; to: [number, number]; delay: string }[] = [
  { from: [13.4, 52.5], to: [24.1, 56.9], delay: '0s'    }, // Berlin → Riga
  { from: [25.3, 54.7], to: [24.1, 56.9], delay: '0.8s'  }, // Vilnius → Riga
  { from: [21.0, 52.2], to: [24.1, 56.9], delay: '1.4s'  }, // Warsaw → Riga
];

const MARKER_COLORS: Record<MarkerType, { stroke: string; fill: string; glow: string }> = {
  current:  { stroke: '#AA55E3', fill: '#CC88FF', glow: 'rgba(170,85,227,0.35)'   },
  trusted:  { stroke: '#00CC7A', fill: '#00EE8A', glow: 'rgba(0,204,122,0.25)'    },
  new:      { stroke: '#FF8C00', fill: '#FFAA33', glow: 'rgba(255,140,0,0.25)'    },
  highrisk: { stroke: '#FF3B5C', fill: '#FF6680', glow: 'rgba(255,59,92,0.25)'   },
};

const TYPE_LABEL: Record<MarkerType, string> = {
  current:  'Current Session',
  trusted:  'Trusted Region',
  new:      'New Region',
  highrisk: 'High Risk',
};

const INSIGHTS = [
  { icon: 'ok',    text: 'Current session from primary trusted region (Latvia)' },
  { icon: 'ok',    text: 'Timezone CET/EET consistent with historical Baltics pattern' },
  { icon: 'ok',    text: 'Language locale EU-LV matches established user profile' },
  { icon: 'watch', text: 'First session detected from Turkey — new region flagged' },
  { icon: 'watch', text: 'UAE session logged 6 days ago — outside core region' },
  { icon: 'info',  text: 'Distance from last trusted session (Berlin): 1,380 km' },
];

/* ── helpers ───────────────────────────────────────────────────────────────── */

function insightIcon(icon: string) {
  const s = 12;
  if (icon === 'ok')    return <CheckCircle  size={s} color="#00CC7A" />;
  if (icon === 'watch') return <AlertTriangle size={s} color="#FF8C00" />;
  return <Info size={s} color="#5A5A6E" />;
}

function insightColor(icon: string) {
  if (icon === 'ok')    return '#9090A0';
  if (icon === 'watch') return '#CC7700';
  return '#4A4A5E';
}

/* ── tooltip ───────────────────────────────────────────────────────────────── */

interface TooltipState {
  x: number;
  y: number;
  marker: GeoMarker;
}

/* ── component ─────────────────────────────────────────────────────────────── */

export default function GeoRiskMap() {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [geoLoaded, setGeoLoaded] = useState(false);

  return (
    <div style={{ background: '#0A0A0C', border: '1px solid #1A1A1F', position: 'relative' }}>

      {/* ── header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #1A1A1F', background: '#0B0B0E' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MapPin size={13} color="#AA55E3" />
          <div>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', fontWeight: 700, color: '#3A3A4E', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              Global Risk Intelligence Map
            </span>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#2A2A3A', marginLeft: '10px', letterSpacing: '0.06em' }}>
              Live geographic context of payment activity
            </span>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {(Object.entries(MARKER_COLORS) as [MarkerType, typeof MARKER_COLORS[MarkerType]][]).map(([type, col]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: col.stroke, boxShadow: `0 0 4px ${col.glow}` }} />
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#2E2E3E', letterSpacing: '0.08em' }}>{TYPE_LABEL[type]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── main body: map + info panel ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px' }}>

        {/* map */}
        <div style={{ position: 'relative', background: '#09090B', borderRight: '1px solid #1A1A1F', overflow: 'hidden' }}>
          {!geoLoaded && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#2E2E3E', letterSpacing: '0.12em' }}>LOADING INTELLIGENCE LAYER…</span>
            </div>
          )}

          <ComposableMap
            projection="geoEqualEarth"
            projectionConfig={{ scale: 185, center: [20, 22] }}
            style={{ width: '100%', height: '400px' }}
          >
            {/* Ocean backdrop */}
            <rect x={0} y={0} width="100%" height="100%" fill="#09090B" />

            <Geographies geography={GEO_URL} onError={() => {}} >
              {({ geographies }) => {
                if (!geoLoaded && geographies.length > 0) setTimeout(() => setGeoLoaded(true), 0);
                return geographies.map(geo => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    style={{
                      default: { fill: '#0E0E12', stroke: '#1C1C22', strokeWidth: 0.4, outline: 'none' },
                      hover:   { fill: '#141418', stroke: '#2A2A36', strokeWidth: 0.5, outline: 'none' },
                      pressed: { fill: '#1A1A20', stroke: '#2A2A36', strokeWidth: 0.5, outline: 'none' },
                    }}
                  />
                ));
              }}
            </Geographies>

            {/* Connection arcs (trusted → current) */}
            {CONNECTIONS.map((c, i) => (
              <Line
                key={i}
                from={c.from}
                to={c.to}
                stroke="rgba(170,85,227,0.30)"
                strokeWidth={1}
                strokeLinecap="round"
                strokeDasharray="5 7"
                style={{
                  animation: `geo-dash 3s linear ${c.delay} infinite`,
                }}
              />
            ))}

            {/* Markers */}
            {MARKERS.map(m => {
              const col = MARKER_COLORS[m.type];
              const isCurrent = m.type === 'current';
              const r = isCurrent ? 6 : m.type === 'trusted' ? 4 : 4;
              return (
                <Marker
                  key={m.id}
                  coordinates={m.coordinates}
                  onMouseEnter={(e: React.MouseEvent) => setTooltip({ x: e.clientX, y: e.clientY, marker: m })}
                  onMouseMove={(e: React.MouseEvent)  => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                  onMouseLeave={() => setTooltip(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {isCurrent ? (
                    /* Multi-ring pulse for current location */
                    <g style={{ transformOrigin: '0 0' }}>
                      <circle r={22} fill="none" stroke={col.stroke} strokeWidth={0.5} opacity={0.12}
                        style={{ animation: 'geo-ring 2.4s ease-out 0s infinite', transformOrigin: '0 0' }} />
                      <circle r={16} fill="none" stroke={col.stroke} strokeWidth={0.8} opacity={0.20}
                        style={{ animation: 'geo-ring 2.4s ease-out 0.5s infinite', transformOrigin: '0 0' }} />
                      <circle r={10} fill="none" stroke={col.stroke} strokeWidth={1} opacity={0.35}
                        style={{ animation: 'geo-ring 2.4s ease-out 1.0s infinite', transformOrigin: '0 0' }} />
                      {/* Glow halo */}
                      <circle r={r + 3} fill={col.stroke} opacity={0.15} />
                      {/* Outer ring */}
                      <circle r={r} fill="none" stroke={col.stroke} strokeWidth={1.5} />
                      {/* Solid fill */}
                      <circle r={r - 2} fill={col.fill} />
                      <circle r={2}    fill="#FFFFFF" opacity={0.7} />
                    </g>
                  ) : (
                    <g style={{ transformOrigin: '0 0' }}>
                      <circle r={r + 4} fill={col.stroke} opacity={0.1} />
                      <circle r={r}     fill="none" stroke={col.stroke} strokeWidth={1} />
                      <circle r={r - 2} fill={col.fill} opacity={0.85} />
                    </g>
                  )}
                </Marker>
              );
            })}
          </ComposableMap>

          {/* Vignette overlay for depth */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse 90% 90% at 50% 50%, transparent 60%, rgba(9,9,11,0.6) 100%)',
          }} />
        </div>

        {/* ── right info panel ──────────────────────────────────────────────── */}
        <div style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>

          {/* Current session */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #1A1A1F' }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', fontWeight: 700, color: '#3A3A4E', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Current Session
            </div>
            {[
              ['Country',        'Latvia'],
              ['City',           'Riga'],
              ['Geo Confidence', 'High'],
              ['Risk Level',     'Low'],
              ['Session Count',  '12 sessions'],
              ['Timezone',       'EET (UTC+2)'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #131316' }}>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#3A3A4E' }}>{label}</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: label === 'Risk Level' ? '#00CC7A' : label === 'Geo Confidence' ? '#AA55E3' : '#9090A0' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Historical pattern */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #1A1A1F' }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', fontWeight: 700, color: '#3A3A4E', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Historical Pattern
            </div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#3A3A4E', marginBottom: '4px' }}>Primary Region</div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#00CC7A' }}>Baltic States</div>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#3A3A4E', marginBottom: '5px' }}>Known Regions</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {['Latvia', 'Lithuania', 'Estonia', 'Germany', 'Poland'].map(r => (
                  <span key={r} style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#00CC7A', background: 'rgba(0,204,122,0.06)', border: '1px solid rgba(0,204,122,0.18)', padding: '2px 6px', letterSpacing: '0.06em' }}>{r}</span>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#3A3A4E', marginBottom: '5px' }}>Flagged Regions</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {['Turkey', 'UAE'].map(r => (
                  <span key={r} style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF8C00', background: 'rgba(255,140,0,0.06)', border: '1px solid rgba(255,140,0,0.18)', padding: '2px 6px', letterSpacing: '0.06em' }}>{r}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Risk insights */}
          <div style={{ padding: '14px 16px', flex: 1 }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', fontWeight: 700, color: '#3A3A4E', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Geo Risk Insights
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {INSIGHTS.map((ins, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
                  <div style={{ flexShrink: 0, marginTop: '1px' }}>{insightIcon(ins.icon)}</div>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: insightColor(ins.icon), lineHeight: 1.5, letterSpacing: '0.02em' }}>
                    {ins.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── bottom metrics strip ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: '1px solid #1A1A1F' }}>
        {[
          { label: 'Trusted Regions',       value: '5',    sub: 'Latvia, LT, EE, DE, PL', color: '#00CC7A' },
          { label: 'New Regions / Month',    value: '2',    sub: 'Turkey, UAE flagged',      color: '#FF8C00' },
          { label: 'Geo Risk Score',         value: '18',   sub: 'out of 100',               color: '#AA55E3' },
          { label: 'Last Region Change',     value: '14d',  sub: 'Riga → Berlin → Riga',    color: '#5A5A6E' },
        ].map(({ label, value, sub, color }, i) => (
          <div
            key={label}
            style={{
              padding: '12px 16px',
              borderRight: i < 3 ? '1px solid #1A1A1F' : 'none',
              background: '#0B0B0E',
            }}
          >
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', fontWeight: 600, color: '#2A2A3A', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '5px' }}>{label}</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '20px', fontWeight: 700, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#2A2A3A', marginTop: '4px', letterSpacing: '0.04em' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── floating tooltip ─────────────────────────────────────────────────── */}
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x + 14,
            top: tooltip.y - 44,
            zIndex: 9999,
            background: '#0E0E12',
            border: `1px solid ${MARKER_COLORS[tooltip.marker.type].stroke}44`,
            padding: '8px 12px',
            pointerEvents: 'none',
            minWidth: '130px',
            boxShadow: `0 4px 24px rgba(0,0,0,0.6)`,
          }}
        >
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', fontWeight: 600, color: MARKER_COLORS[tooltip.marker.type].stroke, marginBottom: '4px' }}>
            {tooltip.marker.city}, {tooltip.marker.name}
          </div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#4A4A5E', marginBottom: '2px' }}>
            {tooltip.marker.sessions > 0 ? `${tooltip.marker.sessions} historical session${tooltip.marker.sessions !== 1 ? 's' : ''}` : 'No sessions — flagged region'}
          </div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: MARKER_COLORS[tooltip.marker.type].stroke }}>
            {TYPE_LABEL[tooltip.marker.type]}  ·  Risk: {tooltip.marker.risk}
          </div>
        </div>
      )}
    </div>
  );
}
