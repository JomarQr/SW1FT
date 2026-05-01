import { useState, useCallback, useMemo } from 'react';
import {
  ComposableMap, Geographies, Geography, Marker, ZoomableGroup,
} from 'react-simple-maps';
import { geoCentroid, geoBounds } from 'd3-geo';
import {
  CheckCircle, AlertTriangle, Info, MapPin, Plus, Minus, RotateCcw, ArrowLeft,
} from 'lucide-react';
import type { Session } from '../lib/mockData';

/* ══════════════════════════════════════════════════════════ types & constants */

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

type MarkerType = 'trusted' | 'new' | 'highrisk';
type RiskLevel  = 'Low' | 'Elevated' | 'High' | 'Blocked' | 'No Data';

interface LiveMarker {
  iso2: string; name: string;
  coordinates: [number, number]; type: MarkerType;
  sessions: number; maxRisk: number;
}

interface RegionPreset { id: string; label: string; center: [number, number]; zoom: number; }

interface Insight { icon: 'ok' | 'watch' | 'alert' | 'info'; text: string; }

interface CountryProfile {
  code: string; risk: RiskLevel; riskColor: string;
  type: MarkerType | 'unknown'; sessions: number; lastSeen: string;
  transactions: number; avgAmount: string; status: string;
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

/* ── ISO-2 → approx center coordinates [lon, lat] ───────────────────────── */

const ISO2_COORDS: Record<string, [number, number]> = {
  'af': [67.7, 33.9], 'al': [20.2, 41.2], 'dz': [3.0, 28.0], 'ao': [18.5, -11.2],
  'ar': [-63.6, -38.4], 'am': [45.0, 40.1], 'au': [133.8, -25.3], 'at': [14.5, 47.5],
  'az': [47.6, 40.1], 'bh': [50.5, 26.2], 'bd': [90.4, 23.7], 'by': [28.0, 53.5],
  'be': [4.5, 50.5], 'bo': [-64.7, -16.3], 'ba': [17.7, 43.9], 'bw': [24.7, -22.3],
  'br': [-51.9, -14.2], 'bg': [25.5, 42.7], 'kh': [104.9, 12.6], 'cm': [12.3, 3.9],
  'ca': [-96.8, 56.1], 'cl': [-71.5, -35.7], 'cn': [104.2, 35.9], 'co': [-74.3, 4.6],
  'cg': [15.8, -0.2], 'cd': [24.0, -2.9], 'cr': [-83.8, 9.7], 'hr': [15.2, 45.1],
  'cu': [-79.5, 21.5], 'cy': [33.4, 35.1], 'cz': [15.5, 49.8], 'dk': [10.0, 56.3],
  'do': [-70.2, 18.7], 'ec': [-77.4, -1.8], 'eg': [30.8, 26.8], 'sv': [-88.9, 13.8],
  'er': [39.8, 15.2], 'ee': [25.0, 58.6], 'et': [40.5, 9.1], 'fi': [25.7, 61.9],
  'fr': [2.2, 46.2], 'ga': [11.6, -0.8], 'ge': [43.4, 42.3], 'de': [10.5, 51.2],
  'gh': [-1.0, 7.9], 'gr': [21.8, 39.1], 'gt': [-90.2, 15.8], 'gn': [-11.8, 10.9],
  'ht': [-72.3, 18.9], 'hn': [-86.2, 15.2], 'hu': [19.5, 47.2], 'is': [-19.0, 65.0],
  'in': [78.9, 20.6], 'id': [113.9, -0.8], 'ir': [53.7, 32.4], 'iq': [43.7, 33.2],
  'ie': [-8.2, 53.4], 'il': [34.9, 31.5], 'it': [12.6, 41.9], 'jm': [-77.3, 18.1],
  'jp': [138.3, 36.2], 'jo': [36.2, 31.2], 'kz': [67.0, 48.0], 'ke': [37.9, 0.0],
  'kp': [127.5, 40.3], 'kr': [127.8, 35.9], 'xk': [20.9, 42.6], 'kw': [47.5, 29.3],
  'kg': [74.8, 41.2], 'la': [102.5, 19.9], 'lv': [24.6, 56.9], 'lb': [35.9, 33.9],
  'ly': [17.2, 26.3], 'lt': [23.9, 55.2], 'lu': [6.1, 49.8], 'mg': [46.9, -18.8],
  'my': [109.7, 4.2], 'ml': [-2.0, 17.6], 'mt': [14.4, 35.9], 'mr': [-10.9, 21.0],
  'mx': [-102.6, 23.6], 'md': [28.4, 47.4], 'mn': [103.8, 46.9], 'me': [19.4, 42.7],
  'ma': [-7.1, 31.8], 'mz': [35.5, -18.7], 'mm': [95.9, 21.9], 'na': [18.5, -22.0],
  'np': [84.1, 28.4], 'nl': [5.3, 52.3], 'nz': [174.9, -40.9], 'ni': [-85.2, 12.9],
  'ne': [8.1, 17.6], 'ng': [8.7, 9.1], 'mk': [21.7, 41.6], 'no': [8.5, 60.5],
  'om': [57.6, 22.0], 'pk': [30.4, 69.3], 'ps': [35.3, 31.9], 'pa': [-80.8, 8.5],
  'py': [-58.4, -23.4], 'pe': [-75.0, -9.2], 'ph': [122.9, 12.9], 'pl': [19.1, 51.9],
  'pt': [-8.2, 39.4], 'qa': [51.2, 25.4], 'ro': [24.9, 45.9], 'ru': [98.1, 61.5],
  'rw': [29.9, -1.9], 'sa': [45.1, 23.9], 'sn': [-14.5, 14.5], 'rs': [21.0, 44.0],
  'sl': [-11.8, 8.5], 'sk': [19.7, 48.7], 'si': [14.5, 46.1], 'so': [46.2, 5.2],
  'za': [25.1, -29.0], 'ss': [31.3, 6.9], 'es': [-3.7, 40.4], 'lk': [80.8, 7.9],
  'sd': [30.2, 15.6], 'se': [18.6, 59.3], 'ch': [8.2, 46.8], 'sy': [38.3, 35.0],
  'tw': [120.9, 23.7], 'tj': [71.3, 38.9], 'tz': [34.9, -6.4], 'th': [100.9, 15.9],
  'tg': [0.8, 8.6], 'tn': [9.6, 33.9], 'tr': [35.2, 39.0], 'tm': [59.6, 40.7],
  'ug': [32.4, 1.4], 'ua': [31.2, 48.4], 'ae': [53.8, 23.4], 'gb': [-2.0, 53.0],
  'us': [-99.1, 38.3], 'uy': [-55.8, -32.5], 'uz': [63.9, 41.4], 've': [-66.6, 6.4],
  'vn': [108.3, 14.1], 'ye': [47.6, 15.6], 'zm': [27.8, -13.1], 'zw': [29.9, -19.0],
  'sg': [103.8, 1.4], 'hk': [114.2, 22.3],
};

const ISO2_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(NAME_TO_CODE).map(([name, code]) => [code, name])
);

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

/* ── marker colours ──────────────────────────────────────────────────────── */

const MCOL: Record<MarkerType, { stroke: string; fill: string }> = {
  trusted:  { stroke: 'var(--green)',  fill: 'var(--green)'  },
  new:      { stroke: 'var(--orange)', fill: 'var(--orange)' },
  highrisk: { stroke: 'var(--red)',    fill: 'var(--red)'    },
};

const MLABEL: Record<MarkerType, string> = {
  trusted: 'Safe', new: 'Watch', highrisk: 'High Risk',
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

/* ── helpers ─────────────────────────────────────────────────────────────── */

function typeFromMaxRisk(maxRisk: number): MarkerType {
  if (maxRisk >= 65) return 'highrisk';
  if (maxRisk >= 40) return 'new';
  return 'trusted';
}

function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 85) return 'Blocked';
  if (score >= 65) return 'High';
  if (score >= 40) return 'Elevated';
  return 'Low';
}

function riskColorFromScore(score: number): string {
  if (score >= 65) return 'var(--red)';
  if (score >= 40) return 'var(--orange)';
  return 'var(--green)';
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function buildLiveProfile(
  countryName: string,
  iso2: string,
  countrySessions: Session[],
): CountryProfile {
  if (!countrySessions.length) return DEFAULT_PROFILE;

  const maxRisk = Math.max(...countrySessions.map(s => s.riskScore));
  const risk = riskLevelFromScore(maxRisk);
  const riskColor = riskColorFromScore(maxRisk);
  const type = typeFromMaxRisk(maxRisk);

  const sorted = [...countrySessions].sort((a, b) =>
    new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
  );
  const lastSeen = formatRelativeTime(sorted[0].startTime);

  const totalAmount = countrySessions.reduce((sum, s) => sum + (s.transactionAmount ?? 0), 0);
  const txWithAmount = countrySessions.filter(s => (s.transactionAmount ?? 0) > 0);
  const avgAmount = txWithAmount.length > 0
    ? `€${Math.round(totalAmount / txWithAmount.length).toLocaleString('en')}`
    : '—';

  const alertSessions = countrySessions.filter(s => s.status === 'ALERT' || s.status === 'BLOCKED');
  const watchSessions = countrySessions.filter(s => s.status === 'WATCH');

  const insights: Insight[] = [];
  const riskIcon: Insight['icon'] = risk === 'Low' ? 'ok' : risk === 'Elevated' ? 'watch' : 'alert';
  insights.push({ icon: riskIcon, text: `${countrySessions.length} session${countrySessions.length !== 1 ? 's' : ''} recorded from ${countryName}` });
  if (alertSessions.length > 0)
    insights.push({ icon: 'alert', text: `${alertSessions.length} high-risk session${alertSessions.length !== 1 ? 's' : ''} detected` });
  if (watchSessions.length > 0)
    insights.push({ icon: 'watch', text: `${watchSessions.length} session${watchSessions.length !== 1 ? 's' : ''} flagged for review` });
  if (maxRisk < 40)
    insights.push({ icon: 'ok', text: 'All sessions within normal risk parameters' });
  insights.push({ icon: 'info', text: `Most recent activity: ${lastSeen}` });
  if (maxRisk >= 40)
    insights.push({ icon: 'info', text: `Peak risk score: ${maxRisk}/100` });

  return {
    code: iso2.toUpperCase(), risk, riskColor, type,
    sessions: countrySessions.length,
    lastSeen,
    transactions: txWithAmount.length,
    avgAmount,
    status: risk === 'Blocked' ? 'BLOCKED' : risk === 'High' ? 'HIGH RISK' : risk === 'Elevated' ? 'ELEVATED' : 'ACTIVE',
    insights,
  };
}

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

export default function GeoRiskMap({ sessions = [] }: { sessions?: Session[] }) {
  const [zoom,          setZoom]          = useState(1);
  const [center,        setCenter]        = useState<[number, number]>([20, 22]);
  const [activeRegion,  setActiveRegion]  = useState('world');
  const [selectedGeo,   setSelectedGeo]   = useState<string | null>(null);
  const [selectedCode,  setSelectedCode]  = useState<string | null>(null);
  const [profile,       setProfile]       = useState<CountryProfile | null>(null);
  const [tooltip,       setTooltip]       = useState<{ x: number; y: number; marker: LiveMarker } | null>(null);
  const [geoLoaded,     setGeoLoaded]     = useState(false);

  /* ── build live markers from real sessions ─────────────────────────────── */

  const liveMarkers = useMemo((): LiveMarker[] => {
    if (!sessions.length) return [];

    const byCountry = new Map<string, { count: number; maxRisk: number }>();
    for (const s of sessions) {
      const iso2 = (s.country ?? 'GB').toLowerCase();
      const existing = byCountry.get(iso2);
      if (existing) {
        existing.count++;
        existing.maxRisk = Math.max(existing.maxRisk, s.riskScore);
      } else {
        byCountry.set(iso2, { count: 1, maxRisk: s.riskScore });
      }
    }

    return Array.from(byCountry.entries())
      .map(([iso2, data]): LiveMarker | null => {
        const coords = ISO2_COORDS[iso2];
        if (!coords) return null;
        return {
          iso2,
          name: ISO2_NAME[iso2] ?? iso2.toUpperCase(),
          coordinates: coords,
          type: typeFromMaxRisk(data.maxRisk),
          sessions: data.count,
          maxRisk: data.maxRisk,
        };
      })
      .filter((m): m is LiveMarker => m !== null);
  }, [sessions]);

  const iso2ToMaxRisk = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of liveMarkers) map.set(m.iso2, m.maxRisk);
    return map;
  }, [liveMarkers]);

  /* ── summary stats ─────────────────────────────────────────────────────── */

  const stats = useMemo(() => {
    const total   = sessions.length;
    const high    = sessions.filter(s => s.riskScore >= 65).length;
    const avgRisk = total > 0 ? Math.round(sessions.reduce((s, x) => s + x.riskScore, 0) / total) : 0;
    const countries = liveMarkers.length;
    const topCountries = [...liveMarkers].sort((a, b) => b.sessions - a.sessions).slice(0, 5);
    return { total, high, avgRisk, countries, topCountries };
  }, [sessions, liveMarkers]);

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

  function handleCountryClick(geo: GeoJSON.Feature) {
    const name  = (geo.properties as Record<string, string>)?.name ?? '—';
    const { center: c, zoom: z } = getCountryView(geo);
    setCenter(c); setZoom(z); setActiveRegion('');
    setSelectedGeo(name);
    const iso2 = NAME_TO_CODE[name] ?? null;
    setSelectedCode(iso2);
    const countrySessions = iso2
      ? sessions.filter(s => (s.country ?? 'GB').toLowerCase() === iso2)
      : [];
    setProfile(iso2 ? buildLiveProfile(name, iso2, countrySessions) : DEFAULT_PROFILE);
  }

  function handleMarkerClick(m: LiveMarker) {
    const tgt = Math.min(10, Math.max(zoom * 2, 5));
    setCenter(m.coordinates); setZoom(tgt); setActiveRegion('');
    setSelectedGeo(m.name);
    setSelectedCode(m.iso2);
    const countrySessions = sessions.filter(s => (s.country ?? 'GB').toLowerCase() === m.iso2);
    setProfile(buildLiveProfile(m.name, m.iso2, countrySessions));
  }

  function clearSelection() {
    setSelectedGeo(null); setSelectedCode(null); setProfile(null);
    applyRegion(REGION_PRESETS[0]);
  }

  function zoomIn()  { setZoom(z => Math.min(15, +(z * 1.5).toFixed(2)));  setActiveRegion(''); }
  function zoomOut() { setZoom(z => Math.max(0.7, +(z / 1.5).toFixed(2))); setActiveRegion(''); }

  const mS = 1 / zoom;

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
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: c.stroke }} />
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
                    const name       = geo.properties?.name ?? '';
                    const isSelected = name === selectedGeo;
                    const iso2       = NAME_TO_CODE[name] ?? null;
                    const maxRisk    = iso2 ? (iso2ToMaxRisk.get(iso2) ?? -1) : -1;

                    const baseColor = maxRisk >= 0
                      ? maxRisk >= 65 ? 'rgba(255,59,92,0.10)'
                      : maxRisk >= 40 ? 'rgba(255,140,0,0.09)'
                      : 'rgba(0,204,122,0.07)'
                      : 'var(--surface)';
                    const selColor = maxRisk >= 0
                      ? maxRisk >= 65 ? 'rgba(255,59,92,0.24)'
                      : maxRisk >= 40 ? 'rgba(255,140,0,0.22)'
                      : 'rgba(0,204,122,0.20)'
                      : 'rgba(255,255,255,0.06)';
                    const borderCol = maxRisk >= 0
                      ? maxRisk >= 65 ? 'rgba(255,59,92,0.45)'
                      : maxRisk >= 40 ? 'rgba(255,140,0,0.40)'
                      : 'rgba(0,204,122,0.35)'
                      : 'var(--bdr)';

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onClick={() => handleCountryClick(geo as unknown as GeoJSON.Feature)}
                        style={{
                          default: {
                            fill: isSelected ? selColor : baseColor,
                            stroke: isSelected ? borderCol : maxRisk >= 0 ? borderCol : 'var(--bdr)',
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

              {/* Live session markers */}
              {liveMarkers.map(m => {
                const col   = MCOL[m.type];
                const isSel = m.name === selectedGeo;
                const r     = 3.5 * mS;
                return (
                  <Marker key={m.iso2} coordinates={m.coordinates}
                    onClick={() => handleMarkerClick(m)}
                    onMouseEnter={(e: React.MouseEvent) => setTooltip({ x: e.clientX, y: e.clientY, marker: m })}
                    onMouseMove={(e: React.MouseEvent)  => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                    onMouseLeave={() => setTooltip(null)}
                    style={{ cursor: 'pointer' }}>
                    <g>
                      {isSel && <circle r={r * 2.4} fill={col.stroke} opacity={0.15} />}
                      <circle r={r * 1.8} fill={col.stroke} opacity={0.10} />
                      <circle r={r}       fill="none" stroke={col.stroke} strokeWidth={1 * mS} />
                      <circle r={r * 0.6} fill={col.fill} opacity={0.9} />
                    </g>
                  </Marker>
                );
              })}
            </ZoomableGroup>
          </ComposableMap>

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

              <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--bdr)' }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', fontWeight: 700, color: 'var(--t5)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Session Statistics
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    { label: 'Sessions',     value: String(profile.sessions),                                   color: profile.riskColor },
                    { label: 'Transactions', value: profile.transactions > 0 ? String(profile.transactions) : '—', color: 'var(--t2)' },
                    { label: 'Avg Amount',   value: profile.avgAmount,                                          color: 'var(--t2)' },
                    { label: 'Last Seen',    value: profile.lastSeen,                                           color: profile.sessions > 0 ? 'var(--t2)' : 'var(--t4)' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: 'var(--surface)', border: '1px solid #151520', padding: '7px 9px' }}>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '7px', color: 'var(--t5)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '3px' }}>{label}</div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', fontWeight: 600, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

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
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', fontWeight: 700, color: 'var(--t5)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '8px' }}>Session Summary</div>
                {sessions.length === 0 ? (
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--t5)', padding: '8px 0' }}>
                    No sessions captured yet. Connect the SDK to begin collecting geo data.
                  </div>
                ) : (
                  <>
                    {[
                      ['Total Sessions',   String(stats.total),     ''],
                      ['Unique Countries', String(stats.countries),  'var(--accent)'],
                      ['High Risk',        String(stats.high),       stats.high > 0 ? 'var(--red)' : 'var(--green)'],
                      ['Avg Risk Score',   `${stats.avgRisk}/100`,   stats.avgRisk >= 65 ? 'var(--red)' : stats.avgRisk >= 40 ? 'var(--orange)' : 'var(--green)'],
                    ].map(([lbl, val, col]) => (
                      <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--card)' }}>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--bdr2)' }}>{lbl}</span>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: col || '#7878A0' }}>{val}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {stats.topCountries.length > 0 && (
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bdr)' }}>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', fontWeight: 700, color: 'var(--t5)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '8px' }}>Top Countries</div>
                  {stats.topCountries.map(m => {
                    const col = MCOL[m.type];
                    return (
                      <div key={m.iso2} onClick={() => handleMarkerClick(m)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--card)', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: col.stroke, flexShrink: 0 }} />
                          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--t3)' }}>{m.name}</span>
                        </div>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: col.stroke }}>{m.sessions} session{m.sessions !== 1 ? 's' : ''}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ padding: '12px 14px', flex: 1 }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', fontWeight: 700, color: 'var(--t5)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '8px' }}>Geo Risk Insights</div>
                {sessions.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '6px' }}>
                    {insightIcon('info')}
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '8px', color: 'var(--t4)', lineHeight: 1.55 }}>
                      Deploy the SDK on your payment pages to start mapping real transaction origins
                    </span>
                  </div>
                ) : [
                  stats.high === 0
                    ? { icon: 'ok'    as const, text: 'No high-risk sessions detected across all regions' }
                    : { icon: 'alert' as const, text: `${stats.high} high-risk session${stats.high !== 1 ? 's' : ''} require attention` },
                  stats.countries > 1
                    ? { icon: 'info' as const, text: `Sessions spanning ${stats.countries} countries` }
                    : { icon: 'info' as const, text: 'All sessions from a single country' },
                  { icon: 'info' as const, text: 'Click a country or marker for detailed breakdown' },
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
          { label: 'Active Countries',    value: String(stats.countries),                           sub: stats.countries > 0 ? stats.topCountries.slice(0, 3).map(m => m.iso2.toUpperCase()).join(' · ') : 'no data', color: 'var(--green)'  },
          { label: 'High Risk Sessions',  value: String(stats.high),                                sub: 'ALERT + BLOCKED',   color: stats.high > 0 ? 'var(--red)' : 'var(--green)'   },
          { label: 'Avg Risk Score',      value: stats.total > 0 ? `${stats.avgRisk}` : '—',        sub: 'out of 100',        color: 'var(--accent)' },
          { label: 'Total Sessions',      value: String(stats.total),                               sub: 'live + SDK',        color: 'var(--t3)'     },
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
          boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
        }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', fontWeight: 600, color: MCOL[tooltip.marker.type].stroke, marginBottom: '3px' }}>
            {tooltip.marker.name}
          </div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--t4)', marginBottom: '2px' }}>
            {tooltip.marker.sessions} session{tooltip.marker.sessions !== 1 ? 's' : ''} · max risk {tooltip.marker.maxRisk}
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
