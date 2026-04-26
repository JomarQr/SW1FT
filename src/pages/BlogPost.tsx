import { useParams, Link, Navigate } from 'react-router-dom';
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

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = POSTS.find(p => p.slug === slug);

  if (!post) return <Navigate to="/blog" replace />;

  const color = categoryColor(post.category);
  const otherPosts = POSTS.filter(p => p.slug !== slug).slice(0, 3);

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text }}>

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav style={{ borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: 'rgba(10,10,11,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', zIndex: 50 }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '0 clamp(20px,4vw,48px)', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/logo_white.png" alt="SW1FT" style={{ height: '32px' }} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <Link to="/blog" style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: C.muted, textDecoration: 'none', letterSpacing: '0.08em' }}>← Blog</Link>
            <Link to="/docs" style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: C.muted, textDecoration: 'none', letterSpacing: '0.08em' }}>Docs</Link>
            <Link to="/dashboard" style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: C.accent, textDecoration: 'none', letterSpacing: '0.08em' }}>Dashboard →</Link>
          </div>
        </div>
      </nav>

      {/* ── Cover image ─────────────────────────────────────────────── */}
      <div style={{ width: '100%', height: 'clamp(280px, 40vw, 480px)', overflow: 'hidden', position: 'relative' }}>
        <img src={post.coverImage} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'brightness(0.5)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(10,10,11,0.85) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 'clamp(24px,4vw,56px)' }}>
          <div style={{ maxWidth: '780px', margin: '0 auto' }}>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: color, background: `${color}20`, padding: '4px 10px', border: `1px solid ${color}44` }}>
              {post.category}
            </span>
          </div>
        </div>
      </div>

      {/* ── Article ─────────────────────────────────────────────────── */}
      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '48px clamp(20px,4vw,48px) 96px' }}>

        {/* Title */}
        <h1 style={{ fontFamily: 'Inter', fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 800, color: C.text, margin: '0 0 16px', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
          {post.title}
        </h1>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: C.subtle, lineHeight: 1.65, margin: '0 0 32px' }}>
          {post.subtitle}
        </p>

        {/* Author row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '32px', borderBottom: `1px solid ${C.border}`, marginBottom: '48px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Inter', fontSize: '13px', fontWeight: 700, color }}>
            {post.author.split(' ').map(w => w[0]).join('')}
          </div>
          <div>
            <div style={{ fontFamily: 'Inter', fontSize: '13px', fontWeight: 600, color: C.text }}>{post.author}</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted }}>{post.authorRole} · {post.date} · {post.readMin} min read</div>
          </div>
        </div>

        {/* Sections */}
        {post.sections.map((section, i) => (
          <div key={i} style={{ marginBottom: '36px' }}>
            {section.heading && (
              <h2 style={{ fontFamily: 'Inter', fontSize: 'clamp(18px,2.2vw,22px)', fontWeight: 700, color: C.text, margin: '0 0 16px', lineHeight: 1.3, letterSpacing: '-0.01em' }}>
                {section.heading}
              </h2>
            )}
            {section.paragraphs.map((para, j) => (
              <p key={j} style={{ fontFamily: 'Georgia, serif', fontSize: '17px', color: '#C8C8D4', lineHeight: 1.78, margin: '0 0 20px' }}>
                {para}
              </p>
            ))}
          </div>
        ))}

        {/* Back link */}
        <div style={{ paddingTop: '48px', borderTop: `1px solid ${C.border}` }}>
          <Link to="/blog" style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: C.accent, textDecoration: 'none', letterSpacing: '0.1em' }}>
            ← Back to journal
          </Link>
        </div>
      </div>

      {/* ── More posts ──────────────────────────────────────────────── */}
      {otherPosts.length > 0 && (
        <div style={{ borderTop: `1px solid ${C.border}`, background: C.card, padding: '56px clamp(20px,4vw,48px) 80px' }}>
          <div style={{ maxWidth: '1160px', margin: '0 auto' }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: C.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '32px' }}>
              More from the journal
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }} className="blog-grid">
              {otherPosts.map(p => (
                <Link key={p.slug} to={`/blog/${p.slug}`} style={{ textDecoration: 'none' }}>
                  <div style={{ border: `1px solid ${C.border}`, overflow: 'hidden', background: '#0A0A0B', transition: 'border-color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#333')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}>
                    <div style={{ aspectRatio: '16/9', overflow: 'hidden' }}>
                      <img src={p.coverImage} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'brightness(0.75)' }} />
                    </div>
                    <div style={{ padding: '16px' }}>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: categoryColor(p.category) }}>
                        {p.category}
                      </span>
                      <h3 style={{ fontFamily: 'Inter', fontSize: '14px', fontWeight: 600, color: C.text, margin: '8px 0 0', lineHeight: 1.4 }}>
                        {p.title}
                      </h3>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
