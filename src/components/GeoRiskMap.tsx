import { useState, useCallback } from 'react';
import {
  ComposableMap, Geographies, Geography, Marker, Line, ZoomableGroup,
} from 'react-simple-maps';
import { CheckCircle, AlertTriangle, Info, MapPin, Plus, Minus, RotateCcw } from 'lucide-react';

/* ── constants ─────────────────────────────────────────────────────────────── */

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

interface RegionPreset {
  id: string;
  label: string;
  center: [number, number];
  zoom: number;
}

const REGION_PRESETS: RegionPreset[] = [
  { id: 'world',    label: 'World',       center: [20,   22],  zoom: 1   },
  { id: 'europe',   label: 'Europe',      center: [15,   52],  zoom: 3.5 },
  { id: 'baltics',  label: 'Baltics',     center: [24.5, 57],  zoom: 9   },
  { id: 'mideast',  label: 'Middle East', center: [45,   28],  zoom: 3.5 },
  { id: 'africa',   label: 'Africa',      center: [20,    0],  zoom: 2.5 },
  { id: 'americas', label: 'Americas',    center: [-75,  15],  zoom: 1.8 },
  { id: 'asia',     label: 'Asia',        center: [105,  30],  zoom: 2   },
];

const MARKERS: GeoMarker[] = [
  { id: 'riga',     name: 'Latvia',    city: 'Riga',      coordinates: [24.1,  56.9], type: 'current',  sessions: 12, risk: 'Low'      },
  { id: 'vilnius',  name: 'Lithuania', city: 'Vilnius',   coordinates: [25.3,  54.7], type: 'trusted',  sessions: 8,  risk: 'Low'      },
  { id: 'tallinn',  name: 'Estonia',   city: 'Tallinn',   coordinates: [24.7,  59.4], type: 'trusted',  sessions: 5,  risk: 'Low'      },
  { id: 'berlin',   name: 'Germany',   city: 'Berlin',    coordinates: [13.4,  52.5], type: 'trusted',  sessions: 3,  risk: 'Low'      },
  { id: 'warsaw',   name: 'Poland',    city: 'Warsaw',    coordinates: [21.0,  52.2], type: 'trusted',  sessions: 2,  risk: 'Low'      },
  { id: 'istanbul', name: 'Turkey',    city: 'Istanbul',  coordinates: [28.9,  41.0], type: 'new',      sessions: 1,  risk: 'Elevated' },
  { id: 'dubai',    name: 'UAE',       city: 'Dubai',     coordinates: [55.3,  25.2], type: 'new',      sessions: 1,  risk: 'Elevated' },
  { id: 'lagos',    name: 'Nigeria',   city: 'Lagos',     coordinates: [3.4,    6.5], type: 'highrisk', sessions: 0,  risk: 'High'     },
  { id: 'moscow',   name: 'Russia',    city: 'Moscow',    coordinates: [37.6,  55.8], type: 'highrisk', sessions: 0,  risk: 'Blocked'  },
];

const CONNECTIONS: { from: [number, number]; to: [number, number]; delay: string }[] = [
  { from: [13.4, 52.5], to: [24.1, 56.9], delay: '0s'   },
  { from: [25.3, 54.7], to: [24.1, 56.9], delay: '0.9s' },
  { from: [21.0, 52.2], to: [24.1, 56.9], delay: '1.7s' },
];

const MARKER_COLORS: Record<MarkerType, { stroke: string; fill: string; glow: string }> = {
  current:  { stroke: '#AA55E3', fill: '#CC88FF', glow: 'rgba(170,85,227,0.4)'  },
  trusted:  { stroke: '#00CC7A', fill: '#00EE8A', glow: 'rgba(0,204,122,0.3)'   },
  new:      { stroke: '#FF8C00', fill: '#FFAA33', glow: 'rgba(255,140,0,0.3)'   },
  highrisk: { stroke: '#FF3B5C', fill: '#FF6680', glow: 'rgba(255,59,92,0.3)'   },
};

const TYPE_LABEL: Record<MarkerType, string> = {
  current:  'Current Session',
  trusted:  'Trusted Region',
  new:      'New Region',
  highrisk: 'High Risk',
};

const INSIGHTS = [
  { icon: 'ok',    text: 'Current session from primary trusted region (Latvia)'    },
  { icon: 'ok',    text: 'Timezone EET consistent with Baltics pattern'            },
  { icon: 'ok',    text: 'Locale EU-LV matches established user profile'           },
  { icon: 'watch', text: 'First session from Turkey — new region flagged'          },
  { icon: 'watch', text: 'UAE session logged 6d ago — outside core region'         },
  { icon: 'info',  text: 'Distance from last trusted session (Berlin): 1,380 km'  },
];

/* ── helpers ───────────────────────────────────────────────────────────────── */

function insightIcon(icon: string) {
  const s = 11;
  if (icon === 'ok')    return <CheckCircle   size={s} color="#00CC7A" />;
  if (icon === 'watch') return <AlertTriangle size={s} color="#FF8C00" />;
  return                       <Info          size={s} color="#4A4A5E" />;
}

function insightColor(icon: string) {
  if (icon === 'ok')    return '#7A7A90';
  if (icon === 'watch') return '#CC7700';
  return '#3A3A52';
}

/* ── zoom control button ────────────────────────────────────────────────────── */

function ZoomBtn({ onClick, children, title }: { onClick: () => void; children: React.ReactNode; title?: string }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hover ? '#1A1A22' : '#111116',
        border: '1px solid #242430',
        color: hover ? '#E0E0E8' : '#4A4A5E',
        cursor: 'pointer',
        transition: 'background 0.12s, color 0.12s',
      }}
    >
      {children}
    </button>
  );
}

/* ── component ─────────────────────────────────────────────────────────────── */

export default function GeoRiskMap() {
  const [zoom,         setZoom]         = useState(1);
  const [center,       setCenter]       = useState<[number, number]>([20, 22]);
  const [activeRegion, setActiveRegion] = useState<string>('world');
  const [tooltip,      setTooltip]      = useState<{ x: number; y: number; marker: GeoMarker } | null>(null);
  const [hoveredGeo,   setHoveredGeo]   = useState<string | null>(null);
  const [geoLoaded,    setGeoLoaded]    = useState(false);

  /* Keep zoom/center in sync when ZoomableGroup fires onMoveEnd */
  const handleMoveEnd = useCallback(
    ({ zoom: z, coordinates }: { zoom: number; coordinates: [number, number] }) => {
      setZoom(z);
      setCenter(coordinates);
      setActiveRegion('');          // deselect preset on manual pan/zoom
    },
    [],
  );

  function applyRegion(preset: RegionPreset) {
    setZoom(preset.zoom);
    setCenter(preset.center);
    setActiveRegion(preset.id);
  }

  function handleMarkerClick(marker: GeoMarker) {
    // Zoom in on the marker — pick a zoom level relative to current
    const targetZoom = Math.min(10, Math.max(zoom * 2, 5));
    setZoom(targetZoom);
    setCenter(marker.coordinates);
    setActiveRegion('');
  }

  function zoomIn()    { setZoom(z => Math.min(15, parseFloat((z * 1.5).toFixed(2)))); setActiveRegion(''); }
  function zoomOut()   { setZoom(z => Math.max(0.8, parseFloat((z / 1.5).toFixed(2)))); setActiveRegion(''); }
  function resetView() { applyRegion(REGION_PRESETS[0]); }

  /* Marker sizes scale inversely with zoom for consistent screen size */
  const mScale = 1 / zoom;

  return (
    <div style={{ background: '#0A0A0C', border: '1px solid #1A1A1F', position: 'relative' }}>

      {/* ── header ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '9px 14px', borderBottom: '1px solid #1A1A1F', background: '#0B0B0E',
        flexWrap: 'wrap', gap: '8px',
      }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={12} color="#AA55E3" />
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', fontWeight: 700, color: '#3A3A4E', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Global Risk Intelligence Map
          </span>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#242430', marginLeft: '4px' }}>
            scroll to zoom · drag to pan
          </span>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {(Object.entries(MARKER_COLORS) as [MarkerType, typeof MARKER_COLORS[MarkerType]][]).map(([type, col]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: col.stroke, boxShadow: `0 0 5px ${col.glow}` }} />
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#2A2A3A', letterSpacing: '0.06em' }}>{TYPE_LABEL[type]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── region preset bar ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0', padding: '0 14px', borderBottom: '1px solid #1A1A1F', background: '#09090B', overflowX: 'auto' }}>
        {REGION_PRESETS.map((preset, i) => {
          const isActive = activeRegion === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => applyRegion(preset)}
              style={{
                padding: '7px 12px',
                fontFamily: 'JetBrains Mono', fontSize: '9px', fontWeight: isActive ? 600 : 400,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: isActive ? '#AA55E3' : '#3A3A4E',
                background: isActive ? 'rgba(170,85,227,0.07)' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid #AA55E3' : '2px solid transparent',
                borderRight: i < REGION_PRESETS.length - 1 ? '1px solid #151519' : 'none',
                cursor: 'pointer',
                transition: 'color 0.12s, background 0.12s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.color = '#7A7A9A'; } }}
              onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.color = '#3A3A4E'; } }}
            >
              {preset.label}
            </button>
          );
        })}

        {/* spacer + zoom readout */}
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#242430', paddingRight: '4px', whiteSpace: 'nowrap' }}>
          {zoom.toFixed(1)}×
        </span>
      </div>

      {/* ── map + info panel ───────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 272px' }}>

        {/* map canvas */}
        <div style={{ position: 'relative', background: '#08080A', borderRight: '1px solid #1A1A1F', overflow: 'hidden' }}>

          {/* Loading overlay */}
          {!geoLoaded && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3, background: '#08080A' }}>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#242430', letterSpacing: '0.14em' }}>
                LOADING INTELLIGENCE LAYER…
              </span>
            </div>
          )}

          <ComposableMap
            projection="geoEqualEarth"
            projectionConfig={{ scale: 185 }}
            style={{ width: '100%', height: '420px' }}
          >
            <ZoomableGroup
              zoom={zoom}
              center={center}
              onMoveEnd={handleMoveEnd}
              minZoom={0.7}
              maxZoom={16}
              translateExtent={[[-600, -400], [1400, 800]]}
            >
              {/* Ocean background */}
              <rect x={-1000} y={-1000} width={3000} height={3000} fill="#08080A" />

              <Geographies geography={GEO_URL}>
                {({ geographies }) => {
                  if (!geoLoaded && geographies.length > 0) setTimeout(() => setGeoLoaded(true), 0);
                  return geographies.map(geo => {
                    const isHov = hoveredGeo === geo.rsmKey;
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onMouseEnter={() => setHoveredGeo(geo.rsmKey)}
                        onMouseLeave={() => setHoveredGeo(null)}
                        style={{
                          default: { fill: '#0D0D11', stroke: '#1A1A22', strokeWidth: 0.4 * mScale, outline: 'none' },
                          hover:   { fill: '#151520', stroke: '#2E2E3E', strokeWidth: 0.5 * mScale, outline: 'none', cursor: 'pointer' },
                          pressed: { fill: '#1A1A28', stroke: '#2E2E3E', strokeWidth: 0.5 * mScale, outline: 'none' },
                        }}
                      />
                    );
                  });
                }}
              </Geographies>

              {/* Connection arcs */}
              {CONNECTIONS.map((c, i) => (
                <Line
                  key={i}
                  from={c.from}
                  to={c.to}
                  stroke="rgba(170,85,227,0.28)"
                  strokeWidth={1.2 * mScale}
                  strokeLinecap="round"
                  strokeDasharray={`${5 * mScale} ${7 * mScale}`}
                  style={{ animation: `geo-dash 3s linear ${c.delay} infinite` }}
                />
              ))}

              {/* Markers */}
              {MARKERS.map(m => {
                const col = MARKER_COLORS[m.type];
                const isCurrent = m.type === 'current';
                const r = (isCurrent ? 5.5 : 3.5) * mScale;
                return (
                  <Marker
                    key={m.id}
                    coordinates={m.coordinates}
                    onClick={() => handleMarkerClick(m)}
                    onMouseEnter={(e: React.MouseEvent) => setTooltip({ x: e.clientX, y: e.clientY, marker: m })}
                    onMouseMove={(e: React.MouseEvent)  => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                    onMouseLeave={() => setTooltip(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {isCurrent ? (
                      <g>
                        {/* Pulse rings */}
                        <circle r={r * 4.5} fill="none" stroke={col.stroke} strokeWidth={0.4 * mScale} opacity={0.10}
                          style={{ animation: 'geo-ring 2.5s ease-out 0s infinite', transformOrigin: '0 0' }} />
                        <circle r={r * 3.2} fill="none" stroke={col.stroke} strokeWidth={0.6 * mScale} opacity={0.18}
                          style={{ animation: 'geo-ring 2.5s ease-out 0.6s infinite', transformOrigin: '0 0' }} />
                        <circle r={r * 2}   fill="none" stroke={col.stroke} strokeWidth={0.9 * mScale} opacity={0.30}
                          style={{ animation: 'geo-ring 2.5s ease-out 1.1s infinite', transformOrigin: '0 0' }} />
                        {/* Glow halo */}
                        <circle r={r * 1.5} fill={col.stroke} opacity={0.15} />
                        {/* Outer ring */}
                        <circle r={r}       fill="none" stroke={col.stroke} strokeWidth={1.2 * mScale} />
                        {/* Fill */}
                        <circle r={r * 0.6} fill={col.fill} />
                        <circle r={r * 0.25} fill="#FFFFFF" opacity={0.7} />
                      </g>
                    ) : (
                      <g>
                        <circle r={r * 1.8} fill={col.stroke} opacity={0.10} />
                        <circle r={r}       fill="none" stroke={col.stroke} strokeWidth={1 * mScale} />
                        <circle r={r * 0.6} fill={col.fill} opacity={0.9} />
                      </g>
                    )}
                  </Marker>
                );
              })}
            </ZoomableGroup>
          </ComposableMap>

          {/* Vignette */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse 92% 92% at 50% 50%, transparent 55%, rgba(8,8,10,0.65) 100%)' }} />

          {/* Zoom controls — bottom right */}
          <div style={{ position: 'absolute', bottom: '12px', right: '12px', display: 'flex', flexDirection: 'column', gap: '3px', zIndex: 4 }}>
            <ZoomBtn onClick={zoomIn}    title="Zoom in">  <Plus      size={12} /> </ZoomBtn>
            <ZoomBtn onClick={zoomOut}   title="Zoom out"> <Minus     size={12} /> </ZoomBtn>
            <ZoomBtn onClick={resetView} title="Reset">    <RotateCcw size={11} /> </ZoomBtn>
          </div>

          {/* Hovered geo label */}
          {hoveredGeo && (
            <div style={{ position: 'absolute', bottom: '12px', left: '12px', zIndex: 4,
              fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#3A3A4E', letterSpacing: '0.08em', pointerEvents: 'none' }}>
              {/* just a subtle indicator that hover is active */}
              <span style={{ color: '#242430' }}>click any marker to zoom</span>
            </div>
          )}
        </div>

        {/* ── right info panel ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Current session */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #1A1A1F' }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', fontWeight: 700, color: '#2E2E3E', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Current Session
            </div>
            {[
              ['Country',        'Latvia',         ''],
              ['City',           'Riga',           ''],
              ['Geo Confidence', 'High',           '#AA55E3'],
              ['Risk Level',     'Low',            '#00CC7A'],
              ['Sessions',       '12 sessions',    ''],
              ['Timezone',       'EET (UTC+2)',     ''],
            ].map(([label, value, color]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #111116' }}>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#2E2E3E' }}>{label}</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: color || '#8080A0' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Historical pattern */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #1A1A1F' }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', fontWeight: 700, color: '#2E2E3E', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Historical Pattern
            </div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#2E2E3E', marginBottom: '4px' }}>Primary Region</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#00CC7A', marginBottom: '8px' }}>Baltic States</div>

            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#2E2E3E', marginBottom: '5px' }}>Known Regions</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '8px' }}>
              {['Latvia', 'Lithuania', 'Estonia', 'Germany', 'Poland'].map(r => (
                <span key={r} style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#00CC7A', background: 'rgba(0,204,122,0.06)', border: '1px solid rgba(0,204,122,0.15)', padding: '2px 5px', letterSpacing: '0.04em' }}>{r}</span>
              ))}
            </div>

            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#2E2E3E', marginBottom: '5px' }}>Flagged</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
              {['Turkey', 'UAE'].map(r => (
                <span key={r} style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#FF8C00', background: 'rgba(255,140,0,0.06)', border: '1px solid rgba(255,140,0,0.15)', padding: '2px 5px', letterSpacing: '0.04em' }}>{r}</span>
              ))}
            </div>
          </div>

          {/* Geo risk insights */}
          <div style={{ padding: '12px 14px', flex: 1, overflowY: 'auto' }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', fontWeight: 700, color: '#2E2E3E', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Geo Risk Insights
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {INSIGHTS.map((ins, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <div style={{ flexShrink: 0, marginTop: '1px' }}>{insightIcon(ins.icon)}</div>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: insightColor(ins.icon), lineHeight: 1.55, letterSpacing: '0.02em' }}>
                    {ins.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── bottom metrics ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: '1px solid #1A1A1F' }}>
        {[
          { label: 'Trusted Regions',    value: '5',   sub: 'LV · LT · EE · DE · PL',  color: '#00CC7A' },
          { label: 'New Regions / Month', value: '2',   sub: 'Turkey, UAE flagged',       color: '#FF8C00' },
          { label: 'Geo Risk Score',      value: '18',  sub: 'out of 100',                color: '#AA55E3' },
          { label: 'Last Region Change',  value: '14d', sub: 'Riga → Berlin → Riga',     color: '#4A4A5E' },
        ].map(({ label, value, sub, color }, i) => (
          <div key={label} style={{ padding: '10px 14px', borderRight: i < 3 ? '1px solid #1A1A1F' : 'none', background: '#0B0B0E' }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', fontWeight: 600, color: '#242430', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '20px', fontWeight: 700, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#242430', marginTop: '3px', letterSpacing: '0.04em' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── floating marker tooltip ─────────────────────────────────────────── */}
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x + 14, top: tooltip.y - 50, zIndex: 9999,
          background: '#0E0E14', border: `1px solid ${MARKER_COLORS[tooltip.marker.type].stroke}55`,
          padding: '8px 12px', pointerEvents: 'none', minWidth: '140px',
          boxShadow: `0 8px 32px rgba(0,0,0,0.7), 0 0 12px ${MARKER_COLORS[tooltip.marker.type].glow}`,
        }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', fontWeight: 600, color: MARKER_COLORS[tooltip.marker.type].stroke, marginBottom: '4px' }}>
            {tooltip.marker.city}, {tooltip.marker.name}
          </div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#3A3A52', marginBottom: '2px' }}>
            {tooltip.marker.sessions > 0
              ? `${tooltip.marker.sessions} session${tooltip.marker.sessions !== 1 ? 's' : ''}`
              : 'No sessions · Flagged region'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: MARKER_COLORS[tooltip.marker.type].stroke }}>
              {TYPE_LABEL[tooltip.marker.type]}
            </span>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: '#2A2A3A', marginLeft: '10px' }}>
              click to zoom
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
