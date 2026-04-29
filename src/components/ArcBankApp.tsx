import { useState, useEffect } from 'react';
import PhoneFrame from './PhoneFrame';
import {
  ChevronLeft, Bell, Send, CreditCard, TrendingUp, MoreHorizontal,
  Plus, Shield, CheckCircle, Home, ArrowLeftRight, LayoutGrid, Settings,
  Zap,
} from 'lucide-react';

// ─── Mobile design tokens ──────────────────────────────────────────────────────
const M = {
  bg:      '#0A0A0F',
  surface: '#111118',
  card:    '#18181F',
  border:  '#232330',
  blue:    '#3B7EFF',
  blueDim: 'rgba(59,126,255,0.14)',
  green:   '#05D989',
  red:     '#FF3B30',
  amber:   '#FF9F0A',
  t1:      '#FFFFFF',
  t2:      '#9898B0',
  t3:      '#56566A',
  t4:      '#323245',
};

// ─── Desktop design tokens (unchanged) ────────────────────────────────────────
const B = {
  bg:      '#0A0C10',
  surface: '#12151C',
  card:    '#181C26',
  border:  '#1E2230',
  blue:    '#2563EB',
  blueLt:  '#3B82F6',
  green:   '#10B981',
  red:     '#EF4444',
  t1:      '#F1F5F9',
  t2:      '#94A3B8',
  t3:      '#475569',
};

export const RECIPIENTS = [
  { id: 'r1', name: 'Alice Johnson', bank: 'Barclays', avatar: 'AJ', color: '#7C3AED' },
  { id: 'r2', name: 'Bob Smith',     bank: 'HSBC',     avatar: 'BS', color: '#2563EB' },
  { id: 'r3', name: 'Carl Martinez', bank: 'Lloyds',   avatar: 'CM', color: '#059669' },
  { id: 'r4', name: 'Diana Lee',     bank: 'Natwest',  avatar: 'DL', color: '#DC2626' },
];

const RECENT_TXN = [
  { name: 'Tesco',   cat: 'Groceries',    amount: -18.50,   day: 'Today',     bg: '#0074C8', initial: 'T' },
  { name: 'Netflix', cat: 'Subscription', amount: -9.99,    day: 'Yesterday', bg: '#E50914', initial: 'N' },
  { name: 'Salary',  cat: 'Income',       amount: +2400.00, day: '1 Jan',     bg: '#05D989', initial: '↑' },
  { name: 'Amazon',  cat: 'Shopping',     amount: -67.80,   day: '31 Dec',    bg: '#FF9900', initial: 'A' },
  { name: 'Spotify', cat: 'Subscription', amount: -9.99,    day: '30 Dec',    bg: '#1DB954', initial: 'S' },
];

type Recipient = typeof RECIPIENTS[0];
type Screen = 'home' | 'send' | 'amount' | 'confirm' | 'done';

// ─── App props ─────────────────────────────────────────────────────────────────
export interface ArcBankAppProps {
  onStart:      () => void;
  onConfirm:    (amount: number) => void;
  onHoverStart: () => void;
  onHoverEnd:   () => void;
  submitted:    boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// MOBILE UI PRIMITIVES
// ══════════════════════════════════════════════════════════════════════════════

function BottomNav({ active }: { active: 'home' | 'send' | 'cards' | 'more' }) {
  const items = [
    { id: 'home',  icon: Home,            label: 'Home'     },
    { id: 'send',  icon: ArrowLeftRight,  label: 'Payments' },
    { id: 'cards', icon: CreditCard,      label: 'Cards'    },
    { id: 'more',  icon: LayoutGrid,      label: 'More'     },
  ] as const;
  return (
    <div style={{
      position: 'sticky', bottom: 0,
      background: M.surface,
      borderTop: `1px solid ${M.border}`,
      display: 'flex', padding: '10px 0 6px',
    }}>
      {items.map(({ id, icon: Icon, label }) => {
        const on = active === id;
        return (
          <button key={id} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: on ? M.blue : M.t3, padding: '2px 0',
          }}>
            <Icon size={21} strokeWidth={on ? 2.2 : 1.6} />
            <span style={{ fontSize: '10px', fontWeight: on ? 600 : 400, letterSpacing: '0.01em' }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function CardVisual() {
  return (
    <div style={{
      width: '100%',
      background: 'linear-gradient(135deg, #1B1B2B 0%, #131320 55%, #0E0E1C 100%)',
      borderRadius: '18px',
      padding: '20px 22px 18px',
      position: 'relative',
      overflow: 'hidden',
      aspectRatio: '1.586',
    }}>
      {/* Subtle holographic shine band */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(108deg, transparent 35%, rgba(120,120,255,0.04) 50%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      {/* Faint circle emboss bottom-right */}
      <div style={{
        position: 'absolute', bottom: '-40px', right: '-30px',
        width: '160px', height: '160px', borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.04)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-20px', right: '-10px',
        width: '120px', height: '120px', borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.03)',
        pointerEvents: 'none',
      }} />

      {/* Top row: logo + contactless */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          {/* Overlapping circles logo */}
          <div style={{ position: 'relative', width: '28px', height: '16px', flexShrink: 0 }}>
            <div style={{ position: 'absolute', left: 0, width: '16px', height: '16px', borderRadius: '50%', background: M.blue }} />
            <div style={{ position: 'absolute', right: 0, width: '16px', height: '16px', borderRadius: '50%', background: '#60A5FA', opacity: 0.8 }} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.12em' }}>ARCBANK</span>
        </div>
        {/* Contactless — 3 arcs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {[10, 15, 20].map((s, i) => (
            <div key={i} style={{
              width: `${s}px`, height: `${s}px`, borderRadius: '50%',
              border: '1.5px solid rgba(255,255,255,0.35)',
              clipPath: 'polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)',
              marginLeft: i > 0 ? '-6px' : 0,
            }} />
          ))}
        </div>
      </div>

      {/* Chip */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          width: '34px', height: '26px',
          background: 'linear-gradient(145deg, #CFA94A 0%, #E8C86A 30%, #B8900C 60%, #D4AF37 100%)',
          borderRadius: '5px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gridTemplateRows: '1fr 1fr 1fr',
          gap: '2px', padding: '4px',
        }}>
          {Array(9).fill(0).map((_, i) => (
            <div key={i} style={{
              background: i === 4 ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.08)',
              borderRadius: '1px',
            }} />
          ))}
        </div>
      </div>

      {/* Card number */}
      <div style={{
        fontSize: '14px', fontWeight: 400, letterSpacing: '0.22em',
        color: 'rgba(255,255,255,0.6)',
        fontFamily: 'monospace', marginBottom: '14px',
      }}>
        ●●●● ●●●● ●●●● 4291
      </div>

      {/* Bottom: name, expiry, network */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '3px' }}>Card Holder</div>
          <div style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.05em' }}>J. SPRINGIS</div>
        </div>
        <div>
          <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '3px' }}>Expires</div>
          <div style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>03/27</div>
        </div>
        {/* VISA wordmark */}
        <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 800, fontSize: '18px', color: 'rgba(255,255,255,0.55)', letterSpacing: '-0.5px' }}>
          VISA
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MOBILE SCREENS
// ══════════════════════════════════════════════════════════════════════════════

function MobileHome({ onSend }: { onSend: () => void }) {
  return (
    <div style={{ background: M.bg, minHeight: '100%', fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '16px 22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '12px', color: M.t3, fontWeight: 400, marginBottom: '2px' }}>Good morning</div>
          <div style={{ fontSize: '19px', fontWeight: 700, color: M.t1, letterSpacing: '-0.4px' }}>Jevgenijs</div>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>JS</span>
          </div>
          <div style={{
            position: 'absolute', top: '1px', right: '1px',
            width: '9px', height: '9px', borderRadius: '50%',
            background: M.red, border: `2px solid ${M.bg}`,
          }} />
        </div>
      </div>

      {/* Balance */}
      <div style={{ padding: '20px 22px 4px' }}>
        <div style={{ fontSize: '11px', color: M.t3, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>Available balance</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1px', marginBottom: '4px' }}>
          <span style={{ fontSize: '40px', fontWeight: 700, color: M.t1, letterSpacing: '-2px', lineHeight: 1 }}>£2,847</span>
          <span style={{ fontSize: '24px', fontWeight: 500, color: M.t2, letterSpacing: '-1px' }}>.50</span>
        </div>
        <div style={{ fontSize: '12px', color: M.t3 }}>Current Account  ·  ●●●● 4291</div>
      </div>

      {/* Spending progress */}
      <div style={{ margin: '14px 22px', padding: '12px 14px', background: M.surface, borderRadius: '12px', border: `1px solid ${M.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: M.t2 }}>Spent this month</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: M.t1 }}>£847 <span style={{ color: M.t3, fontWeight: 400 }}>/ £2,000</span></span>
        </div>
        <div style={{ height: '4px', background: M.card, borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: '42.4%', height: '100%', background: `linear-gradient(90deg, ${M.blue}, #6BA3FF)`, borderRadius: '2px' }} />
        </div>
      </div>

      {/* Card */}
      <div style={{ padding: '0 22px 18px' }}>
        <CardVisual />
      </div>

      {/* Quick actions */}
      <div style={{ padding: '0 22px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          {[
            { icon: Send,           label: 'Send',    id: 'send',    primary: true  },
            { icon: Plus,           label: 'Add',     id: 'add',     primary: false },
            { icon: Zap,            label: 'Request', id: 'req',     primary: false },
            { icon: MoreHorizontal, label: 'More',    id: 'more',    primary: false },
          ].map(({ icon: Icon, label, id, primary }) => (
            <button key={id} onClick={() => id === 'send' ? onSend() : undefined}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px', background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%',
                background: primary ? M.blue : M.card,
                border: primary ? 'none' : `1px solid ${M.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: primary ? `0 4px 16px rgba(59,126,255,0.35)` : 'none',
              }}>
                <Icon size={20} color={primary ? '#fff' : M.t2} strokeWidth={primary ? 2 : 1.6} />
              </div>
              <span style={{ fontSize: '12px', color: M.t2, fontWeight: 500 }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Transactions */}
      <div style={{ flex: 1, padding: '0 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '16px', fontWeight: 600, color: M.t1 }}>Transactions</span>
          <span style={{ fontSize: '13px', color: M.blue, fontWeight: 500 }}>See all</span>
        </div>
        <div>
          {RECENT_TXN.map((t, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              paddingTop: i > 0 ? '14px' : '0',
              paddingBottom: '14px',
              borderBottom: i < RECENT_TXN.length - 1 ? `1px solid ${M.border}` : 'none',
            }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '13px',
                background: t.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{t.initial}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 500, color: M.t1 }}>{t.name}</div>
                <div style={{ fontSize: '11px', color: M.t3, marginTop: '2px' }}>{t.day}  ·  {t.cat}</div>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: t.amount > 0 ? M.green : M.t1, flexShrink: 0 }}>
                {t.amount > 0 ? '+' : '−'}£{Math.abs(t.amount).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: '16px' }} />
      <BottomNav active="home" />
    </div>
  );
}

function MobileSend({ onBack, onSelect }: { onBack: () => void; onSelect: (r: Recipient) => void }) {
  return (
    <div style={{ background: M.bg, minHeight: '100%', fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 22px 0' }}>
        {/* Back */}
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: M.blue, cursor: 'pointer', padding: 0, marginBottom: '20px', fontSize: '16px', fontWeight: 500 }}>
          <ChevronLeft size={20} />Back
        </button>

        <div style={{ fontSize: '22px', fontWeight: 700, color: M.t1, letterSpacing: '-0.5px', marginBottom: '4px' }}>Send money</div>
        <div style={{ fontSize: '14px', color: M.t3, marginBottom: '20px' }}>Choose a recipient</div>

        {/* Search bar */}
        <div style={{ background: M.surface, border: `1px solid ${M.border}`, borderRadius: '12px', padding: '12px 16px', marginBottom: '22px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={M.t3} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <span style={{ fontSize: '15px', color: M.t3 }}>Search payees or sort codes...</span>
        </div>

        <div style={{ fontSize: '11px', fontWeight: 600, color: M.t3, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>Recent payees</div>
      </div>

      {/* Payee list */}
      <div style={{ flex: 1, padding: '0 22px' }}>
        {RECIPIENTS.map((r, i) => (
          <button key={r.id} onClick={() => onSelect(r)}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0',
              background: 'transparent', border: 'none',
              borderBottom: i < RECIPIENTS.length - 1 ? `1px solid ${M.border}` : 'none',
              cursor: 'pointer', textAlign: 'left', width: '100%',
            }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 2px 8px ${r.color}55` }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{r.avatar}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '15px', fontWeight: 500, color: M.t1 }}>{r.name}</div>
              <div style={{ fontSize: '12px', color: M.t3, marginTop: '2px' }}>{r.bank}</div>
            </div>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: M.card, border: `1px solid ${M.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ChevronLeft size={13} color={M.t3} style={{ transform: 'rotate(180deg)' }} />
            </div>
          </button>
        ))}

        {/* Add new */}
        <button style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 0', background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', marginTop: '4px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: M.blueDim, border: `1.5px dashed ${M.blue}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Plus size={18} color={M.blue} />
          </div>
          <span style={{ fontSize: '15px', fontWeight: 500, color: M.blue }}>Add new payee</span>
        </button>
      </div>

      <BottomNav active="send" />
    </div>
  );
}

function MobileAmount({ recipient, onBack, onContinue }: { recipient: Recipient; onBack: () => void; onContinue: (amt: string) => void }) {
  const [digits, setDigits] = useState('0');

  function press(k: string) {
    if (k === '⌫') { setDigits(d => d.length <= 1 ? '0' : d.slice(0, -1)); return; }
    if (k === '.') { if (!digits.includes('.')) setDigits(d => d + '.'); return; }
    if (digits === '0') { setDigits(k); return; }
    if ((digits.split('.')[1]?.length ?? 0) >= 2) return;
    setDigits(d => d + k);
  }

  const numVal = parseFloat(digits) || 0;
  const intPart = digits.split('.')[0];
  const decPart = digits.includes('.') ? '.' + (digits.split('.')[1] ?? '') : '';

  return (
    <div style={{ background: M.bg, height: '100%', fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '16px 22px 0' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: M.blue, cursor: 'pointer', padding: 0, marginBottom: '20px', fontSize: '16px', fontWeight: 500 }}>
          <ChevronLeft size={20} />Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: recipient.color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 12px ${recipient.color}55` }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{recipient.avatar}</span>
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: M.t1 }}>To {recipient.name}</div>
            <div style={{ fontSize: '12px', color: M.t3 }}>{recipient.bank}</div>
          </div>
        </div>
      </div>

      {/* Amount display */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 22px' }}>
        <div style={{ fontSize: '11px', color: M.t3, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '16px' }}>Enter amount</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', marginBottom: '8px' }}>
          <span style={{ fontSize: '28px', fontWeight: 400, color: numVal > 0 ? M.t2 : M.t4 }}>£</span>
          <span style={{ fontSize: '52px', fontWeight: 700, color: numVal > 0 ? M.t1 : M.t3, letterSpacing: '-2px', lineHeight: 1 }}>
            {parseInt(intPart || '0').toLocaleString('en-GB')}
          </span>
          <span style={{ fontSize: '38px', fontWeight: 600, color: numVal > 0 ? M.t2 : M.t3, letterSpacing: '-1px' }}>{decPart}</span>
        </div>
        <div style={{ fontSize: '12px', color: M.t3 }}>Available: £2,847.50</div>

        {/* Quick amounts */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
          {['50', '100', '250', '500'].map(a => (
            <button key={a} onClick={() => setDigits(a)} style={{ padding: '6px 14px', background: M.surface, border: `1px solid ${M.border}`, borderRadius: '20px', fontSize: '13px', fontWeight: 500, color: M.t2, cursor: 'pointer' }}>
              £{a}
            </button>
          ))}
        </div>
      </div>

      {/* Numpad */}
      <div style={{ padding: '0 22px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '12px' }}>
          {['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(k => (
            <button key={k} onClick={() => press(k)}
              style={{
                height: '60px',
                background: k === '⌫' ? 'transparent' : M.surface,
                border: k === '⌫' ? 'none' : `1px solid ${M.border}`,
                borderRadius: '14px',
                fontSize: k === '⌫' ? '22px' : '24px',
                fontWeight: k === '⌫' ? 400 : 400,
                color: k === '⌫' ? M.t2 : M.t1,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              {k === '⌫' ? (
                <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
                  <path d="M8 1L1 8L8 15M1 8H21" stroke={M.t2} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : k}
            </button>
          ))}
        </div>
        <button onClick={() => numVal > 0 && onContinue(digits)} disabled={numVal <= 0}
          style={{
            width: '100%', height: '56px',
            background: numVal > 0 ? M.blue : M.surface,
            border: 'none', borderRadius: '16px',
            fontSize: '16px', fontWeight: 600,
            color: numVal > 0 ? '#fff' : M.t3,
            cursor: numVal > 0 ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s',
            boxShadow: numVal > 0 ? '0 4px 18px rgba(59,126,255,0.4)' : 'none',
          }}>
          Continue
        </button>
      </div>
    </div>
  );
}

function MobileConfirm({ recipient, amount, onBack, onConfirm }: { recipient: Recipient; amount: string; onBack: () => void; onConfirm: () => void }) {
  const [sec, setSec] = useState(0);
  useEffect(() => { const t = setInterval(() => setSec(s => s + 1), 1000); return () => clearInterval(t); }, []);
  const fmt = (v: string) => `£${parseFloat(v).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;

  return (
    <div style={{ background: M.bg, minHeight: '100%', fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif' }}>
      <div style={{ padding: '16px 22px 24px' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: M.blue, cursor: 'pointer', padding: 0, marginBottom: '20px', fontSize: '16px', fontWeight: 500 }}>
          <ChevronLeft size={20} />Back
        </button>

        <div style={{ fontSize: '22px', fontWeight: 700, color: M.t1, letterSpacing: '-0.5px', marginBottom: '4px' }}>Review transfer</div>
        <div style={{ fontSize: '14px', color: M.t3, marginBottom: '24px' }}>Check details before confirming</div>

        {/* Amount hero */}
        <div style={{ textAlign: 'center', padding: '28px 0', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: M.t3, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Sending</div>
          <div style={{ fontSize: '46px', fontWeight: 700, color: M.t1, letterSpacing: '-2px', marginBottom: '8px' }}>{fmt(amount)}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: recipient.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#fff' }}>{recipient.avatar}</span>
            </div>
            <span style={{ fontSize: '14px', color: M.t2 }}>to {recipient.name}</span>
          </div>
        </div>

        {/* Details card */}
        <div style={{ background: M.surface, border: `1px solid ${M.border}`, borderRadius: '16px', padding: '4px 0', marginBottom: '16px' }}>
          {[
            ['From',    'Current Account  ·  ●●●● 4291'],
            ['To',      `${recipient.name}  ·  ${recipient.bank}`],
            ['Arrives', 'Today, instantly'],
            ['Fee',     'No charge'],
          ].map(([l, v], i, arr) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: i < arr.length - 1 ? `1px solid ${M.border}` : 'none' }}>
              <span style={{ fontSize: '14px', color: M.t3 }}>{l}</span>
              <span style={{ fontSize: '14px', fontWeight: 500, color: M.t1 }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Scam warning */}
        <div style={{ display: 'flex', gap: '12px', background: 'rgba(255,159,10,0.07)', border: '1px solid rgba(255,159,10,0.2)', borderRadius: '12px', padding: '14px', marginBottom: '24px' }}>
          <Shield size={18} color={M.amber} style={{ flexShrink: 0, marginTop: '1px' }} />
          <div style={{ fontSize: '13px', color: M.t2, lineHeight: 1.55 }}>
            Banks never ask you to move money to a <em style={{ fontStyle: 'normal', color: M.t1 }}>"safe account"</em>. Only send to people you know.
          </div>
        </div>

        {sec >= 3 && (
          <div style={{ textAlign: 'center', marginBottom: '14px', fontSize: '11px', color: M.t4, fontFamily: 'monospace' }}>
            reviewing for {sec}s
          </div>
        )}

        <button onClick={onConfirm}
          style={{ width: '100%', height: '56px', background: M.blue, border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: 600, color: '#fff', cursor: 'pointer', marginBottom: '10px', boxShadow: '0 4px 18px rgba(59,126,255,0.4)' }}>
          Confirm transfer
        </button>
        <button onClick={onBack}
          style={{ width: '100%', height: '52px', background: 'transparent', border: `1px solid ${M.border}`, borderRadius: '16px', fontSize: '16px', fontWeight: 500, color: M.t2, cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function AppDoneScreen({ recipient, amount }: { recipient: Recipient; amount: string }) {
  const fmt = (v: string) => `£${parseFloat(v).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;
  return (
    <div style={{ background: M.bg, minHeight: '100%', fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 28px', textAlign: 'center' }}>
      {/* Animated check ring */}
      <div style={{ position: 'relative', marginBottom: '28px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(5,217,137,0.1)', border: '1px solid rgba(5,217,137,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircle size={38} color={M.green} strokeWidth={1.8} />
        </div>
      </div>

      <div style={{ fontSize: '13px', fontWeight: 600, color: M.green, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Transfer complete</div>
      <div style={{ fontSize: '44px', fontWeight: 700, color: M.t1, letterSpacing: '-2px', marginBottom: '8px' }}>{fmt(amount)}</div>
      <div style={{ fontSize: '15px', color: M.t2, marginBottom: '32px' }}>
        Sent to <span style={{ color: M.t1, fontWeight: 500 }}>{recipient.name}</span>
      </div>

      {/* Reference */}
      <div style={{ background: M.surface, border: `1px solid ${M.border}`, borderRadius: '14px', padding: '14px 18px', width: '100%', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', color: M.t3 }}>Reference</span>
          <span style={{ fontSize: '13px', fontWeight: 500, color: M.t1 }}>ARCB-{Date.now().toString(36).slice(-6).toUpperCase()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', color: M.t3 }}>Arrives</span>
          <span style={{ fontSize: '13px', fontWeight: 500, color: M.green }}>Now</span>
        </div>
      </div>

      <div style={{ background: 'rgba(59,126,255,0.06)', border: '1px solid rgba(59,126,255,0.14)', borderRadius: '10px', padding: '10px 14px', width: '100%' }}>
        <div style={{ fontSize: '10px', color: M.t3, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '3px' }}>SW1FT behavioral capture</div>
        <div style={{ fontSize: '12px', color: M.t2 }}>Session recorded · channel: mobile</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MOBILE APP WRAPPER
// ══════════════════════════════════════════════════════════════════════════════

export function MobileArcBankApp({ onStart, onConfirm, onHoverStart, onHoverEnd, submitted }: ArcBankAppProps) {
  const [screen, setScreen] = useState<Screen>('home');
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [amount, setAmount] = useState('0');

  function handleSend() { onStart(); setScreen('send'); }
  function handleSelect(r: Recipient) { setRecipient(r); setScreen('amount'); }
  function handleAmount(a: string) { setAmount(a); onHoverStart(); setScreen('confirm'); }
  function handleConfirm() { onHoverEnd(); onConfirm(parseFloat(amount) || 47.99); setScreen('done'); }

  return (
    <PhoneFrame height={700}>
      {screen === 'home'    && <MobileHome onSend={handleSend} />}
      {screen === 'send'    && <MobileSend onBack={() => setScreen('home')} onSelect={handleSelect} />}
      {screen === 'amount'  && recipient && <MobileAmount recipient={recipient} onBack={() => setScreen('send')} onContinue={handleAmount} />}
      {screen === 'confirm' && recipient && <MobileConfirm recipient={recipient} amount={amount} onBack={() => setScreen('amount')} onConfirm={handleConfirm} />}
      {screen === 'done'    && recipient && <AppDoneScreen recipient={recipient} amount={amount} />}
    </PhoneFrame>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DESKTOP SCREENS (unchanged)
// ══════════════════════════════════════════════════════════════════════════════

function DesktopLayout({ activeNav, children }: { activeNav: string; children: React.ReactNode }) {
  const navItems = [
    { icon: Home,            label: 'Dashboard' },
    { icon: ArrowLeftRight,  label: 'Payments'  },
    { icon: CreditCard,      label: 'Cards'     },
    { icon: LayoutGrid,      label: 'More'      },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: B.bg, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ height: '52px', background: B.surface, borderBottom: `1px solid ${B.border}`, display: 'flex', alignItems: 'center', padding: '0 20px', gap: '0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '32px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: B.blue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontWeight: 800, fontSize: '14px', color: '#fff' }}>A</span>
          </div>
          <span style={{ fontSize: '15px', fontWeight: 700, color: B.t1, letterSpacing: '-0.2px' }}>ArcBank</span>
        </div>
        <div style={{ display: 'flex', flex: 1, gap: '2px' }}>
          {navItems.map(({ icon: Icon, label }) => (
            <button key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: label === activeNav ? 'rgba(37,99,235,0.1)' : 'transparent', border: 'none', color: label === activeNav ? B.blueLt : B.t2, borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: label === activeNav ? 600 : 400 }}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative' }}><Bell size={18} color={B.t2} /><div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '7px', height: '7px', background: B.red, borderRadius: '50%' }} /></div>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg,#7C3AED,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>JS</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: '220px', background: B.surface, borderRight: `1px solid ${B.border}`, padding: '20px 14px', flexShrink: 0, overflowY: 'auto' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: B.t3, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px', padding: '0 8px' }}>My Accounts</div>
          {[
            { name: 'Current Account', number: '····4291', balance: '£2,847.50', color: B.blue },
            { name: 'Savings',         number: '····8832', balance: '£5,000.00', color: B.green },
          ].map(a => (
            <div key={a.name} style={{ padding: '12px', background: B.card, borderRadius: '10px', marginBottom: '8px', cursor: 'pointer', border: `1px solid ${B.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: a.color }} />
                <span style={{ fontSize: '12px', color: B.t2 }}>{a.name}</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: B.t1 }}>{a.balance}</div>
              <div style={{ fontSize: '11px', color: B.t3, marginTop: '2px' }}>{a.number}</div>
            </div>
          ))}
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: B.t3, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px', padding: '0 8px' }}>Quick</div>
            {[
              { icon: Send,          label: 'Send Money'  },
              { icon: ArrowLeftRight, label: 'Transfers'  },
              { icon: Settings,      label: 'Settings'    },
            ].map(({ icon: Icon, label }) => (
              <button key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '9px 10px', background: 'transparent', border: 'none', color: B.t2, borderRadius: '8px', cursor: 'pointer', fontSize: '13px', textAlign: 'left' }}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function DesktopHome({ onSend }: { onSend: () => void }) {
  return (
    <DesktopLayout activeNav="Dashboard">
      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '22px', fontWeight: 700, color: B.t1, marginBottom: '2px' }}>Good morning, J. Springis</div>
        <div style={{ fontSize: '13px', color: B.t2 }}>Here's your financial overview</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px', marginTop: '20px' }}>
        <div style={{ background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Current Account</div>
          <div style={{ fontSize: '30px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>£2,847.50</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>•••• •••• •••• 4291</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg,#065F46,#059669)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Savings</div>
          <div style={{ fontSize: '30px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>£5,000.00</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>•••• •••• •••• 8832</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '28px' }}>
        <button onClick={onSend} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: B.blue, border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          <Send size={14} /> Send Money
        </button>
        {[{ icon: CreditCard, label: 'Pay' }, { icon: TrendingUp, label: 'Top Up' }].map(({ icon: Icon, label }) => (
          <button key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: B.surface, border: `1px solid ${B.border}`, borderRadius: '10px', color: B.t2, fontSize: '14px', cursor: 'pointer' }}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: '15px', fontWeight: 600, color: B.t1, marginBottom: '12px' }}>Recent Transactions</div>
      <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: '12px', overflow: 'hidden' }}>
        {RECENT_TXN.map((t, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', borderBottom: i < RECENT_TXN.length - 1 ? `1px solid ${B.border}` : 'none' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{t.initial}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 500, color: B.t1 }}>{t.name}</div>
              <div style={{ fontSize: '12px', color: B.t3 }}>{t.cat} · {t.day}</div>
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: t.amount > 0 ? B.green : B.t1 }}>
              {t.amount > 0 ? '+' : '−'}£{Math.abs(t.amount).toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </DesktopLayout>
  );
}

function DesktopSend({ onBack, onSelect }: { onBack: () => void; onSelect: (r: Recipient) => void }) {
  return (
    <DesktopLayout activeNav="Payments">
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: B.t2, cursor: 'pointer', marginBottom: '20px', padding: 0, fontSize: '14px' }}>
        <ChevronLeft size={16} /> Back
      </button>
      <div style={{ fontSize: '22px', fontWeight: 700, color: B.t1, marginBottom: '4px' }}>New Payment</div>
      <div style={{ fontSize: '14px', color: B.t2, marginBottom: '24px' }}>Choose a recipient to send money to</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {RECIPIENTS.map(r => (
          <button key={r.id} onClick={() => onSelect(r)}
            style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '18px 20px', background: B.surface, border: `1px solid ${B.border}`, borderRadius: '12px', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = B.blue)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = B.border)}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{r.avatar}</span>
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: B.t1 }}>{r.name}</div>
              <div style={{ fontSize: '13px', color: B.t3, marginTop: '2px' }}>{r.bank}</div>
            </div>
          </button>
        ))}
        <button style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '18px 20px', background: 'transparent', border: `1px dashed ${B.border}`, borderRadius: '12px', cursor: 'pointer', color: B.blueLt }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={20} color={B.blueLt} />
          </div>
          <span style={{ fontSize: '15px', fontWeight: 500 }}>Add new payee</span>
        </button>
      </div>
    </DesktopLayout>
  );
}

function DesktopAmount({ recipient, onBack, onContinue }: { recipient: Recipient; onBack: () => void; onContinue: (a: string) => void }) {
  const [value, setValue] = useState('');
  const numVal = parseFloat(value) || 0;
  return (
    <DesktopLayout activeNav="Payments">
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: B.t2, cursor: 'pointer', marginBottom: '20px', padding: 0, fontSize: '14px' }}>
        <ChevronLeft size={16} /> Back
      </button>
      <div style={{ maxWidth: '480px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: recipient.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{recipient.avatar}</span>
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: B.t1 }}>Send to {recipient.name}</div>
            <div style={{ fontSize: '13px', color: B.t3 }}>{recipient.bank}</div>
          </div>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: B.t3, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>Amount</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '24px', fontWeight: 600, color: B.t2 }}>£</span>
            <input type="number" min="0" step="0.01" value={value} onChange={e => setValue(e.target.value)} placeholder="0.00"
              style={{ width: '100%', paddingLeft: '36px', paddingRight: '16px', paddingTop: '16px', paddingBottom: '16px', background: B.surface, border: `1px solid ${B.border}`, borderRadius: '12px', fontSize: '28px', fontWeight: 700, color: B.t1, outline: 'none', fontVariantNumeric: 'tabular-nums', boxSizing: 'border-box' }}
              onFocus={e => (e.target.style.borderColor = B.blue)}
              onBlur={e => (e.target.style.borderColor = B.border)}
            />
          </div>
          <div style={{ fontSize: '12px', color: B.t3, marginTop: '6px' }}>Available: £2,847.50</div>
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: B.t3, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>Reference (optional)</label>
          <input type="text" placeholder="e.g. Rent, Birthday"
            style={{ width: '100%', padding: '13px 16px', background: B.surface, border: `1px solid ${B.border}`, borderRadius: '12px', fontSize: '14px', color: B.t1, outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => (e.target.style.borderColor = B.blue)}
            onBlur={e => (e.target.style.borderColor = B.border)}
          />
        </div>
        <button onClick={() => numVal > 0 && onContinue(value)} disabled={numVal <= 0}
          style={{ width: '100%', padding: '16px', background: numVal > 0 ? B.blue : B.surface, border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 600, color: numVal > 0 ? '#fff' : B.t3, cursor: numVal > 0 ? 'pointer' : 'not-allowed' }}>
          Continue →
        </button>
      </div>
    </DesktopLayout>
  );
}

function DesktopConfirm({ recipient, amount, onBack, onConfirm }: { recipient: Recipient; amount: string; onBack: () => void; onConfirm: () => void }) {
  const [sec, setSec] = useState(0);
  useEffect(() => { const t = setInterval(() => setSec(s => s + 1), 1000); return () => clearInterval(t); }, []);
  return (
    <DesktopLayout activeNav="Payments">
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: B.t2, cursor: 'pointer', marginBottom: '20px', padding: 0, fontSize: '14px' }}>
        <ChevronLeft size={16} /> Back
      </button>
      <div style={{ fontSize: '22px', fontWeight: 700, color: B.t1, marginBottom: '4px' }}>Confirm Transfer</div>
      <div style={{ fontSize: '14px', color: B.t2, marginBottom: '24px' }}>Review the details before sending</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '720px' }}>
        <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: '14px', padding: '22px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: B.t3, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '16px' }}>Transfer Details</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', background: B.card, borderRadius: '10px', marginBottom: '16px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: recipient.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{recipient.avatar}</span>
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: B.t1 }}>{recipient.name}</div>
              <div style={{ fontSize: '13px', color: B.t3 }}>{recipient.bank}</div>
            </div>
          </div>
          {[
            ['Amount',  `£${parseFloat(amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`],
            ['From',    'Current Account ····4291'],
            ['Arrives', 'Instantly (Faster Payments)'],
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${B.border}` }}>
              <span style={{ fontSize: '13px', color: B.t3 }}>{l}</span>
              <span style={{ fontSize: '13px', fontWeight: 500, color: B.t1 }}>{v}</span>
            </div>
          ))}
          {sec >= 3 && <div style={{ marginTop: '12px', textAlign: 'center', fontFamily: 'monospace', fontSize: '10px', color: B.t3 }}>On confirm screen {sec}s</div>}
        </div>
        <div>
          <div style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.18)', borderRadius: '14px', padding: '18px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <Shield size={16} color={B.blueLt} style={{ flexShrink: 0, marginTop: '1px' }} />
              <div style={{ fontSize: '13px', fontWeight: 600, color: B.blueLt }}>Security Reminder</div>
            </div>
            <div style={{ fontSize: '13px', color: B.t2, lineHeight: 1.6 }}>Your bank will never ask you to move money to a 'safe account'. Only send money to people you know and trust.</div>
          </div>
          <button onClick={onConfirm} style={{ width: '100%', padding: '16px', background: B.blue, border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 600, color: '#fff', cursor: 'pointer', marginBottom: '10px' }}>Confirm Transfer</button>
          <button onClick={onBack} style={{ width: '100%', padding: '14px', background: 'transparent', border: `1.5px solid ${B.border}`, borderRadius: '12px', fontSize: '15px', fontWeight: 500, color: B.t2, cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </DesktopLayout>
  );
}

function DesktopDone({ recipient, amount }: { recipient: Recipient; amount: string }) {
  return (
    <DesktopLayout activeNav="Payments">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
          <CheckCircle size={32} color={B.green} />
        </div>
        <div style={{ fontSize: '26px', fontWeight: 700, color: B.t1, marginBottom: '8px' }}>Transfer Sent!</div>
        <div style={{ fontSize: '36px', fontWeight: 700, color: B.green, marginBottom: '6px' }}>
          £{parseFloat(amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
        </div>
        <div style={{ fontSize: '15px', color: B.t2, marginBottom: '28px' }}>to {recipient.name}</div>
        <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: '12px', padding: '14px 20px' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '10px', color: B.t3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>SW1FT Behavioral Session</div>
          <div style={{ fontSize: '13px', color: B.t2 }}>Captured & sent to fraud dashboard · channel: web</div>
        </div>
      </div>
    </DesktopLayout>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DESKTOP WINDOW FRAME + APP WRAPPER
// ══════════════════════════════════════════════════════════════════════════════

function WindowFrame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #2A2A35', boxShadow: '0 0 0 1px #0A0A0B, 0 28px 70px rgba(0,0,0,0.7)' }}>
      <div style={{ height: '38px', background: '#1A1C24', borderBottom: '1px solid #252830', display: 'flex', alignItems: 'center', padding: '0 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '7px', marginRight: '16px' }}>
          {['#FF5F57','#FFBD2E','#28C840'].map((c, i) => (
            <div key={i} style={{ width: '12px', height: '12px', borderRadius: '50%', background: c }} />
          ))}
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div style={{ background: '#0F1015', border: '1px solid #252830', borderRadius: '6px', padding: '4px 20px', fontSize: '11px', color: '#4B5563', fontFamily: 'Inter, sans-serif', minWidth: '240px', textAlign: 'center' }}>
            🔒 arcbank.com/payments
          </div>
        </div>
      </div>
      <div style={{ height: '580px', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

export function DesktopArcBankApp({ onStart, onConfirm, onHoverStart, onHoverEnd }: ArcBankAppProps) {
  const [screen, setScreen] = useState<Screen>('home');
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [amount, setAmount] = useState('0');

  function handleSend() { onStart(); setScreen('send'); }
  function handleSelect(r: Recipient) { setRecipient(r); setScreen('amount'); }
  function handleAmount(a: string) { setAmount(a); onHoverStart(); setScreen('confirm'); }
  function handleConfirm() { onHoverEnd(); onConfirm(parseFloat(amount) || 47.99); setScreen('done'); }

  return (
    <WindowFrame>
      {screen === 'home'    && <DesktopHome onSend={handleSend} />}
      {screen === 'send'    && <DesktopSend onBack={() => setScreen('home')} onSelect={handleSelect} />}
      {screen === 'amount'  && recipient && <DesktopAmount recipient={recipient} onBack={() => setScreen('send')} onContinue={handleAmount} />}
      {screen === 'confirm' && recipient && <DesktopConfirm recipient={recipient} amount={amount} onBack={() => setScreen('amount')} onConfirm={handleConfirm} />}
      {screen === 'done'    && recipient && <DesktopDone recipient={recipient} amount={amount} />}
    </WindowFrame>
  );
}
