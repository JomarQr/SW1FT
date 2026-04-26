import { Link } from 'react-router-dom';
import { POSTS } from '../data/blogPosts';

const C = {
  bg:     '#0A0A0B',
  card:   '#111115',
  border: '#1E1E22',
  accent: '#AA55E3',
  muted:  '#6B6B7A',
  text:   '#E8E8ED',
  subtle: '#9A9AAA',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Fraud Trends':    '#AA55E3',
  'Regulation':      '#5588E3',
  'Technology':      '#55C3E3',
  'Behavioral':      '#55E3AA',
  'Risk Management': '#E3AA55',
  'Industry':        '#E35588',
};

function categoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? C.accent;
}

export default function Blog() {
  const [featured, ...rest] = POSTS;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text }}>

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav style={{ borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: 'rgba(10,10,11,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', zIndex: 50 }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '0 clamp(20px,4vw,48px)', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/logo_white.png" alt="SW1FT" style={{ height: '32px' }} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <Link to="/docs" style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: C.muted, textDecoration: 'none', letterSpacing: '0.08em' }}>Docs</Link>
            <Link to="/dashboard" style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: C.accent, textDecoration: 'none', letterSpacing: '0.08em' }}>Dashboard →</Link>
          </div>
        </div>
      </nav>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '64px clamp(20px,4vw,48px) 56px' }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '12px' }}>
          SW1FT Journal
        </div>
        <h1 style={{ fontFamily: 'Inter', fontSize: 'clamp(28px,4vw,42px)', fontWeight: 800, color: C.text, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
          Payment fraud, <span style={{ color: C.accent }}>explained.</span>
        </h1>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: '17px', color: C.subtle, maxWidth: '520px', lineHeight: 1.6, margin: 0 }}>
          Research, analysis, and perspective on behavioral fraud detection, payment security, and the evolving threat landscape.
        </p>
      </div>

      {/* ── Featured post ───────────────────────────────────────────── */}
      <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '0 clamp(20px,4vw,48px) 56px' }}>
        <Link to={`/blog/${featured.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', border: `1px solid ${C.border}`, overflow: 'hidden' }}
            className="blog-featured-grid">
            <div style={{ aspectRatio: '16/9', overflow: 'hidden', position: 'relative' }}>
              <img
                src={featured.coverImage}
                alt={featured.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'brightness(0.85)' }}
              />
            </div>
            <div style={{ background: C.card, padding: 'clamp(28px,4vw,48px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: categoryColor(featured.category), background: `${categoryColor(featured.category)}18`, padding: '4px 10px', border: `1px solid ${categoryColor(featured.category)}44` }}>
                  {featured.category}
                </span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted }}>{featured.readMin} min read</span>
              </div>
              <h2 style={{ fontFamily: 'Inter', fontSize: 'clamp(18px,2.2vw,26px)', fontWeight: 700, color: C.text, margin: '0 0 12px', lineHeight: 1.25, letterSpacing: '-0.01em' }}>
                {featured.title}
              </h2>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: '15px', color: C.subtle, lineHeight: 1.65, margin: '0 0 28px' }}>
                {featured.subtitle}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 'auto' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: `${categoryColor(featured.category)}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Inter', fontSize: '11px', fontWeight: 600, color: categoryColor(featured.category) }}>
                  {featured.author.split(' ').map(w => w[0]).join('')}
                </div>
                <div>
                  <div style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 600, color: C.text }}>{featured.author}</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted }}>{featured.authorRole} · {featured.date}</div>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* ── Post grid ───────────────────────────────────────────────── */}
      <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '0 clamp(20px,4vw,48px) 96px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }} className="blog-grid">
          {rest.map(post => (
            <Link key={post.slug} to={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
              <article style={{ border: `1px solid ${C.border}`, background: C.card, overflow: 'hidden', transition: 'border-color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#333')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}>
                <div style={{ aspectRatio: '16/9', overflow: 'hidden' }}>
                  <img src={post.coverImage} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'brightness(0.8)', transition: 'transform 0.4s' }}
                    onMouseEnter={e => ((e.target as HTMLImageElement).style.transform = 'scale(1.04)')}
                    onMouseLeave={e => ((e.target as HTMLImageElement).style.transform = 'scale(1)')} />
                </div>
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: categoryColor(post.category), background: `${categoryColor(post.category)}18`, padding: '3px 8px', border: `1px solid ${categoryColor(post.category)}44` }}>
                      {post.category}
                    </span>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted }}>{post.readMin} min</span>
                  </div>
                  <h3 style={{ fontFamily: 'Inter', fontSize: '15px', fontWeight: 700, color: C.text, margin: '0 0 8px', lineHeight: 1.35, letterSpacing: '-0.01em' }}>
                    {post.title}
                  </h3>
                  <p style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: C.subtle, lineHeight: 1.6, margin: '0 0 16px' }}>
                    {post.subtitle}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '14px', borderTop: `1px solid ${C.border}` }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: `${categoryColor(post.category)}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter', fontSize: '9px', fontWeight: 700, color: categoryColor(post.category), flexShrink: 0 }}>
                      {post.author.split(' ').map(w => w[0]).join('')}
                    </div>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted }}>{post.author} · {post.date}</span>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
