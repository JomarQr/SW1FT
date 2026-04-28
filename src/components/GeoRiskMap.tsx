import { useState, useCallback } from 'react';
import {
  ComposableMap, Geographies, Geography, Marker, Line, ZoomableGroup,
} from 'react-simple-maps';
import { geoCentroid, geoBounds } from 'd3-geo';
import {
  CheckCircle, AlertTriangle, Info, MapPin, Plus, Minus, RotateCcw, ArrowLeft,
} from 'lucide-react';

/* ══════════════════════════════════════════════════════════ types & constants */

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

type MarkerType = 'current' | 'trusted' | 'new' | 'highrisk';
type RiskLevel  = 'Low' | 'Medium' | 'Elevated' | 'High' | 'Blocked' | 'No Data';

interface GeoMarker {
  id: string; name: string; city: string;
  coordinates: [number, number]; type: MarkerType;
  sessions: number; risk: string;
}

interface RegionPreset { id: string; label: string; center: [number, number]; zoom: number; }

interface Insight { icon: 'ok' | 'watch' | 'alert' | 'info'; text: string; }

interface CountryProfile {
  code: string; risk: RiskLevel; riskColor: string;
  type: MarkerType | 'unknown'; sessions: number; lastSeen: string;
  transactions: number; avgAmount: string; status: string;
  trustedSince?: string; distance?: string;
  insights: Insight[];
}

/* ── country name → ISO-2 (lowercase) ───────────────────────────────────── */

const NAME_TO_CODE: Record<string, string> = {
  'Afghanistan': 'af', 'Albania': 'al', 'Algeria': 'dz', 'Angola': 'ao',
  'Argentina': 'ar', 'Armenia': 'am', 'Australia': 'au', 'Austria': 'at',
  'Azerbaijan': 'az', 'Bahrain': 'bh', 'Bangladesh': 'bd', 'Belarus': 'by',
  'Belgium': 'be', 'Bolivia': 'bo', 'Bosnia and Herzegovina': 'ba',
  'Botswana': 'bw', 'Brazil': 'br', 'Bulgaria': 'bg', 'Cambodia': 'kh',
  'Cameroon': 'cm', 'Canada': 'ca', 'Chile': 'cl', 'China': 'cn',
  'Colombia': 'co', 'Congo': 'cg', 'Dem. Rep. Congo': 'cd', 'Costa Rica': 'cr',
  'Croatia': 'hr', 'Cuba': 'cu', 'Cyprus': 'cy', 'Czechia': 'cz',
  'Czech Republic': 'cz', 'Denmark': 'dk', 'Dominican Republic': 'do',
  'Ecuador': 'ec', 'Egypt': 'eg', 'El Salvador': 'sv', 'Eritrea': 'er',
  'Estonia': 'ee', 'Ethiopia': 'et', 'Finland': 'fi', 'France': 'fr',
  'Gabon': 'ga', 'Georgia': 'ge', 'Germany': 'de', 'Ghana': 'gh',
  'Greece': 'gr', 'Guatemala': 'gt', 'Guinea': 'gn', 'Haiti': 'ht',
  'Honduras': 'hn', 'Hungary': 'hu', 'Iceland': 'is', 'India': 'in',
  'Indonesia': 'id', 'Iran': 'ir', 'Iraq': 'iq', 'Ireland': 'ie',
  'Israel': 'il', 'Italy': 'it', 'Jamaica': 'jm', 'Japan': 'jp',
  'Jordan': 'jo', 'Kazakhstan': 'kz', 'Kenya': 'ke', 'North Korea': 'kp',
  'South Korea': 'kr', 'Kosovo': 'xk', 'Kuwait': 'kw', 'Kyrgyzstan': 'kg',
  'Laos': 'la', 'Latvia': 'lv', 'Lebanon': 'lb', 'Libya': 'ly',
  'Lithuania': 'lt', 'Luxembourg': 'lu', 'Madagascar': 'mg', 'Malaysia': 'my',
  'Mali': 'ml', 'Malta': 'mt', 'Mauritania': 'mr', 'Mexico': 'mx',
  'Moldova': 'md', 'Mongolia': 'mn', 'Montenegro': 'me', 'Morocco': 'ma',
  'Mozambique': 'mz', 'Myanmar': 'mm', 'Namibia': 'na', 'Nepal': 'np',
  'Netherlands': 'nl', 'New Zealand': 'nz', 'Nicaragua': 'ni', 'Niger': 'ne',
  'Nigeria': 'ng', 'North Macedonia': 'mk', 'Norway': 'no', 'Oman': 'om',
  'Pakistan': 'pk', 'Palestine': 'ps', 'Panama': 'pa', 'Paraguay': 'py',
  'Peru': 'pe', 'Philippines': 'ph', 'Poland': 'pl', 'Portugal': 'pt',
  'Qatar': 'qa', 'Romania': 'ro', 'Russia': 'ru', 'Rwanda': 'rw',
  'Saudi Arabia': 'sa', 'Senegal': 'sn', 'Serbia': 'rs', 'Sierra Leone': 'sl',
  'Slovakia': 'sk', 'Slovenia': 'si', 'Somalia': 'so', 'South Africa': 'za',
  'South Sudan': 'ss', 'Spain': 'es', 'Sri Lanka': 'lk', 'Sudan': 'sd',
  'Sweden': 'se', 'Switzerland': 'ch', 'Syria': 'sy', 'Taiwan': 'tw',
  'Tajikistan': 'tj', 'Tanzania': 'tz', 'Thailand': 'th', 'Togo': 'tg',
  'Tunisia': 'tn', 'Turkey': 'tr', 'Turkmenistan': 'tm', 'Uganda': 'ug',
  'Ukraine': 'ua', 'United Arab Emirates': 'ae', 'United Kingdom': 'gb',
  'United States of America': 'us', 'United States': 'us', 'Uruguay': 'uy',
  'Uzbekistan': 'uz', 'Venezuela': 've', 'Vietnam': 'vn', 'Yemen': 'ye',
  'Zambia': 'zm', 'Zimbabwe': 'zw',
};

/* ── region presets ──────────────────────────────────────────────────────── */

const REGION_PRESETS: RegionPreset[] = [
  { id: 'world',    label: 'World',       center: [20,  22],  zoom: 1   },
  { id: 'europe',   label: 'Europe',      center: [15,  52],  zoom: 3.5 },
  { id: 'baltics',  label: 'Baltics',     center: [25,  57],  zoom: 9   },
  { id: 'mideast',  label: 'Middle East', center: [45,  28],  zoom: 3.5 },
  { id: 'africa',   label: 'Africa',      center: [20,   0],  zoom: 2.5 },
  { id: 'americas', label: 'Americas',    center: [-75, 15],  zoom: 1.8 },
  { id: 'asia',     label: 'Asia',        center: [105, 30],  zoom: 2   },
];

/* ── markers ─────────────────────────────────────────────────────────────── */

const MARKERS: GeoMarker[] = [
  { id: 'riga',     name: 'Latvia',    city: 'Riga',     coordinates: [24.1, 56.9], type: 'current',  sessions: 12, risk: 'Low'      },
  { id: 'vilnius',  name: 'Lithuania', city: 'Vilnius',  coordinates: [25.3, 54.7], type: 'trusted',  sessions: 8,  risk: 'Low'      },
  { id: 'tallinn',  name: 'Estonia',   city: 'Tallinn',  coordinates: [24.7, 59.4], type: 'trusted',  sessions: 5,  risk: 'Low'      },
  { id: 'berlin',   name: 'Germany',   city: 'Berlin',   coordinates: [13.4, 52.5], type: 'trusted',  sessions: 3,  risk: 'Low'      },
  { id: 'warsaw',   name: 'Poland',    city: 'Warsaw',   coordinates: [21.0, 52.2], type: 'trusted',  sessions: 2,  risk: 'Low'      },
  { id: 'istanbul', name: 'Turkey',    city: 'Istanbul', coordinates: [28.9, 41.0], type: 'new',      sessions: 1,  risk: 'Elevated' },
  { id: 'dubai',    name: 'United Arab Emirates', city: 'Dubai', coordinates: [55.3, 25.2], type: 'new', sessions: 1, risk: 'Elevated' },
  { id: 'lagos',    name: 'Nigeria',   city: 'Lagos',    coordinates: [3.4,   6.5], type: 'highrisk', sessions: 0,  risk: 'High'     },
  { id: 'moscow',   name: 'Russia',    city: 'Moscow',   coordinates: [37.6, 55.8], type: 'highrisk', sessions: 0,  risk: 'Blocked'  },
];

const CONNECTIONS: { from: [number, number]; to: [number, number]; delay: string }[] = [
  { from: [13.4, 52.5], to: [24.1, 56.9], delay: '0s'   },
  { from: [25.3, 54.7], to: [24.1, 56.9], delay: '0.9s' },
  { from: [21.0, 52.2], to: [24.1, 56.9], delay: '1.7s' },
];

const MCOL: Record<MarkerType, { stroke: string; fill: string; glow: string }> = {
  current:  { stroke: 'var(--accent)', fill: 'var(--accent-lt)', glow: 'rgba(170,85,227,0.4)'  },
  trusted:  { stroke: 'var(--green)', fill: 'var(--green)', glow: 'rgba(0,204,122,0.3)'   },
  new:      { stroke: 'var(--orange)', fill: 'var(--orange)', glow: 'rgba(255,140,0,0.3)'   },
  highrisk: { stroke: 'var(--red)', fill: 'var(--red)', glow: 'rgba(255,59,92,0.3)'   },
};

const MLABEL: Record<MarkerType, string> = {
  current: 'Current Session', trusted: 'Trusted Region',
  new: 'New Region', highrisk: 'High Risk',
};

/* ── country profiles ────────────────────────────────────────────────────── */

const PROFILES: Record<string, CountryProfile> = {
  'Latvia': {
    code: 'LV', risk: 'Low', riskColor: 'var(--green)', type: 'current',
    sessions: 12, lastSeen: '2 minutes ago', transactions: 12, avgAmount: '€3,200',
    status: 'PRIMARY REGION', trustedSince: 'Jan 2023',
    distance: '0 km (home)',
    insights: [
      { icon: 'ok',    text: 'Primary session origin — 12 sessions over 14 months' },
      { icon: 'ok',    text: 'Consistent EET timezone across all sessions' },
      { icon: 'ok',    text: 'Device fingerprint stable — no hardware changes detected' },
      { icon: 'ok',    text: 'No geo anomalies in last 90 days' },
      { icon: 'info',  text: 'User locale LV-LV matches region consistently' },
    ],
  },
  'Lithuania': {
    code: 'LT', risk: 'Low', riskColor: 'var(--green)', type: 'trusted',
    sessions: 8, lastSeen: '3 days ago', transactions: 8, avgAmount: '€2,800',
    status: 'TRUSTED', trustedSince: 'Mar 2023', distance: '290 km from Riga',
    insights: [
      { icon: 'ok',   text: '8 sessions recorded — established secondary region' },
      { icon: 'ok',   text: 'Adjacent Baltic region, 290 km from primary location' },
      { icon: 'ok',   text: 'EET timezone match — consistent with user pattern' },
      { icon: 'info', text: 'Typical business travel pattern observed' },
    ],
  },
  'Estonia': {
    code: 'EE', risk: 'Low', riskColor: 'var(--green)', type: 'trusted',
    sessions: 5, lastSeen: '8 days ago', transactions: 5, avgAmount: '€3,100',
    status: 'TRUSTED', trustedSince: 'May 2023', distance: '310 km from Riga',
    insights: [
      { icon: 'ok',   text: '5 sessions — known regional travel destination' },
      { icon: 'ok',   text: 'Northern Baltic region, 310 km from Riga' },
      { icon: 'ok',   text: 'Seasonal pattern consistent with historical behaviour' },
    ],
  },
  'Germany': {
    code: 'DE', risk: 'Low', riskColor: 'var(--green)', type: 'trusted',
    sessions: 3, lastSeen: '22 days ago', transactions: 3, avgAmount: '€4,600',
    status: 'TRUSTED', trustedSince: 'Sep 2023', distance: '1,380 km from Riga',
    insights: [
      { icon: 'ok',    text: '3 sessions — likely business travel to Berlin' },
      { icon: 'ok',    text: 'CET timezone shift recorded and expected' },
      { icon: 'info',  text: 'Higher transaction amounts consistent with business context' },
      { icon: 'info',  text: 'Last arc routed Berlin → Riga same-day return' },
    ],
  },
  'Poland': {
    code: 'PL', risk: 'Low', riskColor: 'var(--green)', type: 'trusted',
    sessions: 2, lastSeen: '31 days ago', transactions: 2, avgAmount: '€1,800',
    status: 'TRUSTED', trustedSince: 'Nov 2023', distance: '640 km from Riga',
    insights: [
      { icon: 'ok',   text: '2 sessions — transit-pattern consistent with travel' },
      { icon: 'ok',   text: 'CET timezone, adjacent to known Baltic corridor' },
      { icon: 'info', text: 'Low transaction volume — monitoring recommended' },
    ],
  },
  'Turkey': {
    code: 'TR', risk: 'Elevated', riskColor: 'var(--orange)', type: 'new',
    sessions: 1, lastSeen: '6 days ago', transactions: 1, avgAmount: '€780',
    status: 'NEW REGION', distance: '2,100 km from Riga',
    insights: [
      { icon: 'watch', text: 'First session ever recorded from Turkey' },
      { icon: 'watch', text: 'Geographic distance from primary: 2,100 km' },
      { icon: 'watch', text: "TRT timezone — 2h ahead of user's normal EET" },
      { icon: 'info',  text: 'Low transaction amount — below typical average' },
      { icon: 'info',  text: 'Recommend step-up authentication on next session' },
    ],
  },
  'United Arab Emirates': {
    code: 'AE', risk: 'Elevated', riskColor: 'var(--orange)', type: 'new',
    sessions: 1, lastSeen: '6 days ago', transactions: 1, avgAmount: '€920',
    status: 'NEW REGION', distance: '4,800 km from Riga',
    insights: [
      { icon: 'watch', text: 'First session from UAE — outside known travel pattern' },
      { icon: 'watch', text: '4,800 km from primary region — significant deviation' },
      { icon: 'watch', text: 'Gulf Standard Time — 3h ahead of EET' },
      { icon: 'alert', text: 'Concurrent Baltic session within 24h window — verify travel' },
    ],
  },
  'Nigeria': {
    code: 'NG', risk: 'High', riskColor: 'var(--red)', type: 'highrisk',
    sessions: 0, lastSeen: 'Never', transactions: 0, avgAmount: '—',
    status: 'HIGH RISK', distance: '6,700 km from Riga',
    insights: [
      { icon: 'alert', text: 'No sessions on record — region blocked by policy' },
      { icon: 'alert', text: 'Elevated APP fraud origin rate — EU PSP watchlist' },
      { icon: 'alert', text: 'Any session from this region triggers auto-review' },
      { icon: 'info',  text: 'Block enforced since Jan 2024 — PSP directive' },
    ],
  },
  'Russia': {
    code: 'RU', risk: 'Blocked', riskColor: 'var(--red)', type: 'highrisk',
    sessions: 0, lastSeen: 'Never', transactions: 0, avgAmount: '—',
    status: 'BLOCKED',
    insights: [
      { icon: 'alert', text: 'Region blocked — regulatory restriction (EU sanctions)' },
      { icon: 'alert', text: 'All payment sessions from RU are auto-rejected' },
      { icon: 'alert', text: 'VPN/proxy detection active for this region' },
      { icon: 'info',  text: 'Policy enforced since Feb 2022' },
    ],
  },
};

const DEFAULT_PROFILE: CountryProfile = {
  code: '??', risk: 'No Data', riskColor: 'var(--t4)', type: 'unknown',
  sessions: 0, lastSeen: '—', transactions: 0, avgAmount: '—',
  status: 'NO SESSION DATA',
  insights: [
    { icon: 'info', text: 'No payment sessions recorded from this region' },
    { icon: 'info', text: 'Geographic monitoring not yet active here' },
    { icon: 'info', text: 'Deploy SDK to begin collecting regional session data' },
  ],
};

/* ── flag image ──────────────────────────────────────────────────────────── */

function FlagImg({ code, height = 22 }: { code: string; height?: number }) {
  if (code === '??') return (
    <svg width={height * 1.5} height={height} viewBox="0 0 36 24" fill="none">
      <rect width="36" height="24" fill="var(--bdr2)" rx="2"/>
      <text x="18" y="17" textAnchor="middle" fontSize="14" fill="var(--t4)">?</text>
    </svg>
  );
  return (
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      alt={code}
      style={{ height: `${height}px`, width: 'auto', display: 'block', objectFit: 'contain' }}
    />
  );
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

function getCountryView(geo: GeoJSON.Feature): { center: [number, number]; zoom: number } {
  const centroid = geoCentroid(geo);
  const bounds   = geoBounds(geo);
  const lonSpan  = Math.abs(bounds[1][0] - bounds[0][0]);
  const latSpan  = Math.abs(bounds[1][1] - bounds[0][1]);
  const maxSpan  = Math.max(lonSpan, latSpan);

  let zoom = 5;
  if      (maxSpan > 120) zoom = 1.6;
  else if (maxSpan > 60)  zoom = 2.2;
  else if (maxSpan > 25)  zoom = 3.5;
  else if (maxSpan > 10)  zoom = 5.5;
  else if (maxSpan > 4)   zoom = 8;
  else                    zoom = 11;

  return { center: [centroid[0], centroid[1]], zoom };
}

function riskBadge(risk: RiskLevel, color: string) {
  return (
    <span style={{
      fontFamily: 'JetBrains Mono', fontSize: '9px', fontWeight: 700,
      color, background: `${color}18`, border: `1px solid ${color}44`,
      padding: '2px 7px', letterSpacing: '0.1em',
    }}>
      {risk.toUpperCase()}
    </span>
  );
}

function insightIcon(icon: Insight['icon']) {
  const s = 11;
  if (icon === 'ok')    return <CheckCircle   size={s} color="var(--green)" />;
  if (icon === 'alert') return <AlertTriangle size={s} color="var(--red)" />;
  if (icon === 'watch') return <AlertTriangle size={s} color="var(--orange)" />;
  return                       <Info          size={s} color="var(--t3)" />;
}

function insightTextColor(icon: Insight['icon']) {
  if (icon === 'ok')    return 'var(--t3)';
  if (icon === 'alert') return '#CC3344';
  if (icon === 'watch') return '#CC7700';
  return 'var(--t4)';
}

/* ── zoom button ─────────────────────────────────────────────────────────── */

function ZoomBtn({ onClick, children, title }: { onClick: () => void; children: React.ReactNode; title?: string }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hov ? 'var(--bdr)' : 'var(--card)', border: '1px solid var(--t5)',
        color: hov ? 'var(--t1)' : 'var(--t3)', cursor: 'pointer',
        transition: 'background 0.1s, color 0.1s',
      }}>
      {children}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════ component ══ */

export default function GeoRiskMap() {
  const [zoom,          setZoom]          = useState(1);
  const [center,        setCenter]        = useState<[number, number]>([20, 22]);
  const [activeRegion,  setActiveRegion]  = useState('world');
  const [selectedGeo,   setSelectedGeo]   = useState<string | null>(null);
  const [selectedCode,  setSelectedCode]  = useState<string | null>(null);
  const [profile,       setProfile]       = useState<CountryProfile | null>(null);
  const [tooltip,       setTooltip]       = useState<{ x: number; y: number; marker: GeoMarker } | null>(null);
  const [geoLoaded,     setGeoLoaded]     = useState(false);

  const handleMoveEnd = useCallback(
    ({ zoom: z, coordinates }: { zoom: number; coordinates: [number, number] }) => {
      setZoom(z);
      setCenter(coordinates);
      setActiveRegion('');
    }, [],
  );

  function applyRegion(r: RegionPreset) {
    setZoom(r.zoom); setCenter(r.center); setActiveRegion(r.id);
  }

  function resolveCode(name: string): string | null {
    const p = PROFILES[name];
    if (p) return p.code.toLowerCase();
    return NAME_TO_CODE[name] ?? null;
  }

  function handleCountryClick(geo: GeoJSON.Feature) {
    const name   = (geo.properties as Record<string, string>)?.name ?? '—';
    const { center: c, zoom: z } = getCountryView(geo);
    setCenter(c);
    setZoom(z);
    setActiveRegion('');
    setSelectedGeo(name);
    setSelectedCode(resolveCode(name));
    setProfile(PROFILES[name] ?? DEFAULT_PROFILE);
  }

  function handleMarkerClick(m: GeoMarker) {
    const tgt = Math.min(10, Math.max(zoom * 2, 5));
    setCenter(m.coordinates);
    setZoom(tgt);
    setActiveRegion('');
    setSelectedGeo(m.name);
    setSelectedCode(resolveCode(m.name));
    setProfile(PROFILES[m.name] ?? DEFAULT_PROFILE);
  }

  function clearSelection() {
    setSelectedGeo(null);
    setSelectedCode(null);
    setProfile(null);
    applyRegion(REGION_PRESETS[0]);
  }

  function zoomIn()  { setZoom(z => Math.min(15, +(z * 1.5).toFixed(2)));  setActiveRegion(''); }
  function zoomOut() { setZoom(z => Math.max(0.7, +(z / 1.5).toFixed(2))); setActiveRegion(''); }

  const mS = 1 / zoom; // marker scale factor

  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--bdr)', position: 'relative' }}>

      {/* ── header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', borderBottom: '1px solid var(--bdr)', background: 'var(--bg)', flexWrap: 'wrap', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={12} color="var(--accent)" />
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', fontWeight: 700, color: 'var(--t4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Global Risk Intelligence Map
          </span>
          {selectedGeo && (
            <>
              <span style={{ color: 'var(--t5)', fontFamily: 'JetBrains Mono', fontSize: '9px' }}>▸</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--accent)' }}>{selectedGeo}</span>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {(Object.entries(MCOL) as [MarkerType, typeof MCOL[MarkerType]][]).map(([t, c]) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: c.stroke, boxShadow: `0 0 5px ${c.glow}` }} />
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'var(--t5)', letterSpacing: '0.06em' }}>{MLABEL[t]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── region preset bar ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px', borderBottom: '1px solid var(--bdr)', background: 'var(--bg)', overflowX: 'auto' }}>
        {REGION_PRESETS.map((r, i) => {
          const active = activeRegion === r.id;
          return (
            <button key={r.id} onClick={() => applyRegion(r)} style={{
              padding: '7px 11px', fontFamily: 'JetBrains Mono', fontSize: '9px',
              fontWeight: active ? 600 : 400, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: active ? 'var(--accent)' : 'var(--t4)',
              background: active ? 'var(--accent-bg)' : 'transparent',
              border: 'none',
              borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
              borderRight: i < REGION_PRESETS.length - 1 ? '1px solid var(--bdr)' : 'none',
              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color 0.1s',
            }}>
              {r.label}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'var(--bdr)', paddingRight: '2px', whiteSpace: 'nowrap' }}>{zoom.toFixed(1)}×</span>
      </div>

      {/* ── map + panel ────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 288px' }}>

        {/* MAP */}
        <div style={{ position: 'relative', background: 'var(--bg)', borderRight: '1px solid var(--bdr)', overflow: 'hidden' }}>
          {!geoLoaded && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3, background: 'var(--bg)' }}>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#242434', letterSpacing: '0.14em' }}>LOADING INTELLIGENCE LAYER…</span>
            </div>
          )}

          <ComposableMap projection="geoEqualEarth" projectionConfig={{ scale: 185 }} style={{ width: '100%', height: '440px' }}>
            <ZoomableGroup zoom={zoom} center={center} onMoveEnd={handleMoveEnd} minZoom={0.7} maxZoom={16}
              translateExtent={[[-600, -400], [1400, 820]]}>
              <rect x={-1000} y={-1000} width={3000} height={3000} fill="var(--bg)" />

              <Geographies geography={GEO_URL}>
                {({ geographies }) => {
                  if (!geoLoaded && geographies.length > 0) setTimeout(() => setGeoLoaded(true), 0);
                  return geographies.map(geo => {
                    const name      = geo.properties?.name ?? '';
                    const isSelected = name === selectedGeo;
                    const prof      = PROFILES[name];
                    const baseColor = prof
                      ? prof.type === 'current'  ? 'rgba(170,85,227,0.12)'
                      : prof.type === 'trusted'  ? 'rgba(0,204,122,0.08)'
                      : prof.type === 'new'      ? 'rgba(255,140,0,0.08)'
                      : prof.type === 'highrisk' ? 'rgba(255,59,92,0.08)'
                      : 'var(--surface)'
                      : 'var(--surface)';
                    const selColor = prof
                      ? prof.type === 'current'  ? 'rgba(170,85,227,0.30)'
                      : prof.type === 'trusted'  ? 'rgba(0,204,122,0.22)'
                      : prof.type === 'new'      ? 'rgba(255,140,0,0.22)'
                      : prof.type === 'highrisk' ? 'rgba(255,59,92,0.22)'
                      : 'rgba(255,255,255,0.06)'
                      : 'rgba(255,255,255,0.06)';
                    const borderCol = prof
                      ? prof.type === 'current'  ? 'rgba(170,85,227,0.5)'
                      : prof.type === 'trusted'  ? 'rgba(0,204,122,0.4)'
                      : prof.type === 'new'      ? 'rgba(255,140,0,0.4)'
                      : prof.type === 'highrisk' ? 'rgba(255,59,92,0.4)'
                      : 'var(--bdr2)'
                      : 'var(--bdr)';

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onClick={() => handleCountryClick(geo as unknown as GeoJSON.Feature)}
                        style={{
                          default: {
                            fill: isSelected ? selColor : baseColor,
                            stroke: isSelected ? borderCol : 'var(--bdr)',
                            strokeWidth: isSelected ? 0.8 * mS : 0.4 * mS,
                            outline: 'none',
                          },
                          hover: {
                            fill: selColor,
                            stroke: borderCol,
                            strokeWidth: 0.7 * mS,
                            outline: 'none',
                            cursor: 'pointer',
                          },
                          pressed: {
                            fill: selColor,
                            stroke: borderCol,
                            strokeWidth: 0.7 * mS,
                            outline: 'none',
                          },
                        }}
                      />
                    );
                  });
                }}
              </Geographies>

              {/* Connection arcs */}
              {CONNECTIONS.map((c, i) => (
                <Line key={i} from={c.from} to={c.to}
                  stroke="rgba(170,85,227,0.25)" strokeWidth={1.2 * mS}
                  strokeLinecap="round"
                  strokeDasharray={`${5 * mS} ${7 * mS}`}
                  style={{ animation: `geo-dash 3s linear ${c.delay} infinite` }} />
              ))}

              {/* Markers */}
              {MARKERS.map(m => {
                const col      = MCOL[m.type];
                const isCur    = m.type === 'current';
                const isSel    = m.name === selectedGeo;
                const r        = (isCur ? 5.5 : 3.5) * mS;
                const ringMult = isSel ? 1.4 : 1;
                return (
                  <Marker key={m.id} coordinates={m.coordinates}
                    onClick={() => handleMarkerClick(m)}
                    onMouseEnter={(e: React.MouseEvent) => setTooltip({ x: e.clientX, y: e.clientY, marker: m })}
                    onMouseMove={(e: React.MouseEvent)  => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                    onMouseLeave={() => setTooltip(null)}
                    style={{ cursor: 'pointer' }}>
                    {isCur ? (
                      <g>
                        <circle r={r * 4.5 * ringMult} fill="none" stroke={col.stroke} strokeWidth={0.4 * mS} opacity={0.10}
                          style={{ animation: 'geo-ring 2.5s ease-out 0s infinite', transformOrigin: '0 0' }} />
                        <circle r={r * 3   * ringMult} fill="none" stroke={col.stroke} strokeWidth={0.6 * mS} opacity={0.18}
                          style={{ animation: 'geo-ring 2.5s ease-out 0.6s infinite', transformOrigin: '0 0' }} />
                        <circle r={r * 1.8 * ringMult} fill="none" stroke={col.stroke} strokeWidth={0.9 * mS} opacity={0.28}
                          style={{ animation: 'geo-ring 2.5s ease-out 1.1s infinite', transformOrigin: '0 0' }} />
                        <circle r={r * 1.4} fill={col.stroke} opacity={0.15} />
                        <circle r={r}       fill="none" stroke={col.stroke} strokeWidth={1.2 * mS} />
                        <circle r={r * 0.6} fill={col.fill} />
                        <circle r={r * 0.24} fill="#FFFFFF" opacity={0.7} />
                      </g>
                    ) : (
                      <g>
                        {isSel && <circle r={r * 2.2} fill={col.stroke} opacity={0.15} />}
                        <circle r={r * 1.8} fill={col.stroke} opacity={0.10} />
                        <circle r={r}       fill="none" stroke={col.stroke} strokeWidth={1 * mS} />
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
            background: 'radial-gradient(ellipse 92% 92% at 50% 50%, transparent 55%, rgba(8,8,10,0.6) 100%)' }} />

          {/* Zoom controls */}
          <div style={{ position: 'absolute', bottom: '12px', right: '12px', display: 'flex', flexDirection: 'column', gap: '3px', zIndex: 4 }}>
            <ZoomBtn onClick={zoomIn}    title="Zoom in">     <Plus      size={11} /></ZoomBtn>
            <ZoomBtn onClick={zoomOut}   title="Zoom out">    <Minus     size={11} /></ZoomBtn>
            <ZoomBtn onClick={() => applyRegion(REGION_PRESETS[0])} title="Reset view"><RotateCcw size={10} /></ZoomBtn>
          </div>

          {/* Hint */}
          <div style={{ position: 'absolute', bottom: '12px', left: '12px', fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'var(--bdr2)', letterSpacing: '0.08em', pointerEvents: 'none', zIndex: 4 }}>
            click any country or marker
          </div>
        </div>

        {/* ── SIDE PANEL ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', maxHeight: '440px' }}>

          {profile && selectedGeo ? (
            /* ── COUNTRY DETAIL ── */
            <>
              {/* Country header */}
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bdr)', background: 'var(--bg)' }}>
                <button onClick={clearSelection} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', fontFamily: 'JetBrains Mono', fontSize: '8px', letterSpacing: '0.08em', padding: 0, marginBottom: '10px', transition: 'color 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--t4)')}>
                  <ArrowLeft size={10} /> BACK TO OVERVIEW
                </button>

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  <div>
                    <div style={{ marginBottom: '6px', lineHeight: 1 }}><FlagImg code={selectedCode ?? '??'} height={20} /></div>
                    <div style={{ fontFamily: 'Inter', fontSize: '14px', fontWeight: 600, color: 'var(--t1)', marginBottom: '3px' }}>{selectedGeo}</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'var(--bdr2)', letterSpacing: '0.08em' }}>ISO: {selectedCode?.toUpperCase() ?? profile.code}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {riskBadge(profile.risk, profile.riskColor)}
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'var(--bdr2)', letterSpacing: '0.08em', marginTop: '5px' }}>{profile.status}</div>
                  </div>
                </div>
              </div>

              {/* Session stats */}
              <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--bdr)' }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', fontWeight: 700, color: 'var(--t5)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Session Statistics
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  {[
                    { label: 'Sessions',     value: String(profile.sessions), color: profile.riskColor },
                    { label: 'Transactions', value: profile.transactions > 0 ? String(profile.transactions) : '—', color: 'var(--t2)' },
                    { label: 'Avg Amount',   value: profile.avgAmount,   color: 'var(--t2)' },
                    { label: 'Last Seen',    value: profile.lastSeen,    color: profile.sessions > 0 ? 'var(--t2)' : 'var(--t4)' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: 'var(--surface)', border: '1px solid #151520', padding: '7px 9px' }}>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', color: 'var(--t5)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '3px' }}>{label}</div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', fontWeight: 600, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
                    </div>
                  ))}
                </div>
                {[
                  profile.trustedSince && ['Trusted Since', profile.trustedSince, 'var(--green)'],
                  profile.distance     && ['Distance',      profile.distance,      'var(--t3)'],
                ].filter(Boolean).map(([label, value, color]) => (
                  <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--card)' }}>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'var(--t5)' }}>{label as string}</span>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: color as string }}>{value as string}</span>
                  </div>
                ))}
              </div>

              {/* Insights */}
              <div style={{ padding: '11px 14px', flex: 1 }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', fontWeight: 700, color: 'var(--t5)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Risk Assessment
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {profile.insights.map((ins, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                      <div style={{ flexShrink: 0, marginTop: '1px' }}>{insightIcon(ins.icon)}</div>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: insightTextColor(ins.icon), lineHeight: 1.55, letterSpacing: '0.02em' }}>
                        {ins.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* ── DEFAULT OVERVIEW ── */
            <>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bdr)' }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', fontWeight: 700, color: 'var(--t5)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '8px' }}>Current Session</div>
                {[
                  ['Country',        'Latvia',       ''],
                  ['City',           'Riga',         ''],
                  ['Geo Confidence', 'High',         'var(--accent)'],
                  ['Risk Level',     'Low',          'var(--green)'],
                  ['Sessions',       '12 sessions',  ''],
                  ['Timezone',       'EET (UTC+2)',   ''],
                ].map(([lbl, val, col]) => (
                  <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--card)' }}>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--bdr2)' }}>{lbl}</span>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: col || '#7878A0' }}>{val}</span>
                  </div>
                ))}
              </div>

              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bdr)' }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', fontWeight: 700, color: 'var(--t5)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '8px' }}>Historical Pattern</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--t5)', marginBottom: '4px' }}>Primary Region</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--green)', marginBottom: '8px' }}>Baltic States</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--t5)', marginBottom: '5px' }}>Known Regions</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '8px' }}>
                  {['Latvia', 'Lithuania', 'Estonia', 'Germany', 'Poland'].map(r => (
                    <span key={r} style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'var(--green)', background: 'rgba(0,204,122,0.06)', border: '1px solid rgba(0,204,122,0.14)', padding: '2px 5px' }}>{r}</span>
                  ))}
                </div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--t5)', marginBottom: '5px' }}>Flagged</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                  {['Turkey', 'UAE'].map(r => (
                    <span key={r} style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'var(--orange)', background: 'rgba(255,140,0,0.06)', border: '1px solid rgba(255,140,0,0.14)', padding: '2px 5px' }}>{r}</span>
                  ))}
                </div>
              </div>

              <div style={{ padding: '12px 14px', flex: 1 }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', fontWeight: 700, color: 'var(--t5)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '8px' }}>Geo Risk Insights</div>
                {[
                  { icon: 'ok'    as const, text: 'Current session from primary trusted region' },
                  { icon: 'ok'    as const, text: 'EET timezone consistent with Baltics pattern' },
                  { icon: 'ok'    as const, text: 'Locale EU-LV matches established user profile' },
                  { icon: 'watch' as const, text: 'First session from Turkey — new region flagged' },
                  { icon: 'watch' as const, text: 'UAE session logged 6d ago — outside core region' },
                  { icon: 'info'  as const, text: 'Distance from last trusted session: 1,380 km' },
                ].map((ins, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '6px' }}>
                    <div style={{ flexShrink: 0, marginTop: '1px' }}>{insightIcon(ins.icon)}</div>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: insightTextColor(ins.icon), lineHeight: 1.55 }}>{ins.text}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── bottom metrics ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: '1px solid var(--bdr)' }}>
        {[
          { label: 'Trusted Regions',    value: '5',   sub: 'LV · LT · EE · DE · PL', color: 'var(--green)' },
          { label: 'New Regions / Month', value: '2',   sub: 'Turkey, UAE flagged',      color: 'var(--orange)' },
          { label: 'Geo Risk Score',      value: '18',  sub: 'out of 100',               color: 'var(--accent)' },
          { label: 'Last Region Change',  value: '14d', sub: 'Riga → Berlin → Riga',    color: 'var(--t3)' },
        ].map(({ label, value, sub, color }, i) => (
          <div key={label} style={{ padding: '10px 14px', borderRight: i < 3 ? '1px solid var(--bdr)' : 'none', background: 'var(--bg)' }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', fontWeight: 600, color: 'var(--bdr)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '20px', fontWeight: 700, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'var(--bdr)', marginTop: '3px' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── marker tooltip ───────────────────────────────────────────────────── */}
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x + 14, top: tooltip.y - 52, zIndex: 9999,
          background: '#0E0E14', border: `1px solid ${MCOL[tooltip.marker.type].stroke}55`,
          padding: '8px 12px', pointerEvents: 'none', minWidth: '140px',
          boxShadow: `0 8px 32px rgba(0,0,0,0.7), 0 0 10px ${MCOL[tooltip.marker.type].glow}`,
        }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', fontWeight: 600, color: MCOL[tooltip.marker.type].stroke, marginBottom: '3px' }}>
            {tooltip.marker.city}, {tooltip.marker.name}
          </div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--t4)', marginBottom: '2px' }}>
            {tooltip.marker.sessions > 0 ? `${tooltip.marker.sessions} sessions` : 'No sessions · Flagged'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: MCOL[tooltip.marker.type].stroke }}>{MLABEL[tooltip.marker.type]}</span>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'var(--t5)', marginLeft: '10px' }}>click to zoom</span>
          </div>
        </div>
      )}
    </div>
  );
}
