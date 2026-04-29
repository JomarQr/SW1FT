import { useState, useEffect } from 'react';
import PhoneFrame from './PhoneFrame';
import {
  ChevronLeft, Bell, Send, CreditCard, TrendingUp, MoreHorizontal,
  Plus, Shield, CheckCircle, Home, ArrowLeftRight, LayoutGrid, Settings,
} from 'lucide-react';

// ─── Design tokens ─────────────────────────────────────────────────────────────
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
  { name: 'Tesco',   cat: 'Groceries',    amount: -18.50,   day: 'Today'     },
  { name: 'Netflix', cat: 'Subscription', amount: -9.99,    day: 'Yesterday' },
  { name: 'Salary',  cat: 'Income',       amount: +2400.00, day: '1 Jan'     },
  { name: 'Amazon',  cat: 'Shopping',     amount: -67.80,   day: '31 Dec'    },
  { name: 'Spotify', cat: 'Subscription', amount: -9.99,    day: '30 Dec'    },
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
// MOBILE SCREENS
// ══════════════════════════════════════════════════════════════════════════════

function MobileHome({ onSend }: { onSend: () => void }) {
  return (
    <div style={{ background: B.bg, minHeight: '100%', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ padding: '60px 20px 20px', background: 'linear-gradient(160deg,#0F1A3A 0%,#0A0C10 80%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '12px', color: B.t2 }}>Good morning</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: B.t1 }}>J. Springis</div>
          </div>
          <div style={{ position: 'relative' }}>
            <Bell size={20} color={B.t2} />
            <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', background: B.red, borderRadius: '50%', border: '1px solid #0A0C10' }} />
          </div>
        </div>
        <div style={{ background: 'linear-gradient(135deg,#2563EB 0%,#1D4ED8 100%)', borderRadius: '20px', padding: '20px', marginBottom: '8px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Current Account</div>
          <div style={{ fontSize: '34px', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', marginBottom: '16px' }}>£2,847.50</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>•••• •••• •••• 4291</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.1)', padding: '3px 10px', borderRadius: '20px' }}>VISA</div>
          </div>
        </div>
      </div>
      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
          {([
            { icon: Send,          label: 'Send',   action: 'send'  },
            { icon: CreditCard,    label: 'Pay',    action: 'pay'   },
            { icon: TrendingUp,    label: 'Top Up', action: 'topup' },
            { icon: MoreHorizontal,label: 'More',   action: 'more'  },
          ] as const).map(({ icon: Icon, label, action }) => (
            <button key={action} onClick={() => action === 'send' ? onSend() : undefined}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px', background: B.surface, border: `1px solid ${B.border}`, borderRadius: '14px', padding: '14px 8px', cursor: 'pointer' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: action === 'send' ? 'rgba(37,99,235,0.15)' : B.card, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} color={action === 'send' ? B.blueLt : B.t2} />
              </div>
              <span style={{ fontSize: '11px', color: B.t2, fontWeight: 500 }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: '0 20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: B.t1 }}>Recent</span>
          <span style={{ fontSize: '12px', color: B.blueLt }}>See all</span>
        </div>
        {RECENT_TXN.map((t, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: B.surface, borderRadius: i === 0 ? '12px 12px 4px 4px' : i === RECENT_TXN.length - 1 ? '4px 4px 12px 12px' : '4px', marginBottom: '2px', cursor: 'pointer' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: B.card, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '14px' }}>
              {t.amount > 0 ? '💰' : t.cat === 'Groceries' ? '🛒' : '📱'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: B.t1 }}>{t.name}</div>
              <div style={{ fontSize: '11px', color: B.t3, marginTop: '2px' }}>{t.cat}</div>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: t.amount > 0 ? B.green : B.t1 }}>
              {t.amount > 0 ? '+' : ''}{Math.abs(t.amount).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileSend({ onBack, onSelect }: { onBack: () => void; onSelect: (r: Recipient) => void }) {
  return (
    <div style={{ background: B.bg, minHeight: '100%', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ padding: '56px 20px 24px' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: B.t2, cursor: 'pointer', marginBottom: '20px', padding: 0 }}>
          <ChevronLeft size={18} /><span style={{ fontSize: '14px' }}>Back</span>
        </button>
        <div style={{ fontSize: '22px', fontWeight: 700, color: B.t1, marginBottom: '4px' }}>New Payment</div>
        <div style={{ fontSize: '13px', color: B.t2, marginBottom: '24px' }}>Choose a recipient</div>
        <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '14px', color: B.t3 }}>🔍</span>
          <span style={{ fontSize: '14px', color: B.t3 }}>Search payees...</span>
        </div>
        {RECIPIENTS.map((r, i) => (
          <button key={r.id} onClick={() => onSelect(r)}
            style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: B.surface, border: `1px solid ${B.border}`, borderRadius: i === 0 ? '12px 12px 4px 4px' : i === RECIPIENTS.length - 1 ? '4px 4px 12px 12px' : '4px', cursor: 'pointer', textAlign: 'left', width: '100%', marginBottom: '2px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{r.avatar}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 500, color: B.t1 }}>{r.name}</div>
              <div style={{ fontSize: '12px', color: B.t3, marginTop: '2px' }}>{r.bank}</div>
            </div>
            <ChevronLeft size={14} color={B.t3} style={{ transform: 'rotate(180deg)' }} />
          </button>
        ))}
        <button style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', background: 'transparent', border: `1px dashed ${B.border}`, borderRadius: '12px', cursor: 'pointer', width: '100%', marginTop: '8px', color: B.blueLt }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={18} color={B.blueLt} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: 500 }}>Add new payee</span>
        </button>
      </div>
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
  const formatted = (() => { const p = digits.split('.'); return p.length > 1 ? `${parseInt(p[0]).toLocaleString('en-GB')}.${p[1]}` : parseInt(p[0]).toLocaleString('en-GB'); })();
  return (
    <div style={{ background: B.bg, minHeight: '100%', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '56px 20px 0' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: B.t2, cursor: 'pointer', marginBottom: '16px', padding: 0 }}>
          <ChevronLeft size={18} /><span style={{ fontSize: '14px' }}>Back</span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: recipient.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{recipient.avatar}</span>
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: B.t1 }}>{recipient.name}</div>
            <div style={{ fontSize: '12px', color: B.t3 }}>{recipient.bank}</div>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', fontWeight: 700, color: numVal > 0 ? B.t1 : B.t3, letterSpacing: '-1px' }}>£{formatted}</div>
          <div style={{ fontSize: '12px', color: B.t3, marginTop: '6px' }}>Available: £2,847.50</div>
        </div>
      </div>
      <div style={{ padding: '0 20px', marginTop: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '12px' }}>
          {['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(k => (
            <button key={k} onClick={() => press(k)} style={{ height: '56px', background: k === '⌫' ? B.surface : B.card, border: `1px solid ${B.border}`, borderRadius: '12px', fontSize: k === '⌫' ? '20px' : '22px', fontWeight: 500, color: k === '⌫' ? B.t2 : B.t1, cursor: 'pointer' }}>{k}</button>
          ))}
        </div>
        <button onClick={() => numVal > 0 && onContinue(digits)} disabled={numVal <= 0}
          style={{ width: '100%', height: '54px', background: numVal > 0 ? B.blue : B.surface, border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: 600, color: numVal > 0 ? '#fff' : B.t3, cursor: numVal > 0 ? 'pointer' : 'not-allowed', marginBottom: '16px', transition: 'background 0.2s' }}>
          Continue
        </button>
      </div>
    </div>
  );
}

function MobileConfirm({ recipient, amount, onBack, onConfirm }: { recipient: Recipient; amount: string; onBack: () => void; onConfirm: () => void }) {
  const [sec, setSec] = useState(0);
  useEffect(() => { const t = setInterval(() => setSec(s => s + 1), 1000); return () => clearInterval(t); }, []);
  return (
    <div style={{ background: B.bg, minHeight: '100%', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ padding: '56px 20px 24px' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: B.t2, cursor: 'pointer', marginBottom: '20px', padding: 0 }}>
          <ChevronLeft size={18} /><span style={{ fontSize: '14px' }}>Back</span>
        </button>
        <div style={{ fontSize: '22px', fontWeight: 700, color: B.t1, marginBottom: '4px' }}>Confirm Transfer</div>
        <div style={{ fontSize: '13px', color: B.t2, marginBottom: '24px' }}>Review before sending</div>
        <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: '16px', padding: '20px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingBottom: '16px', borderBottom: `1px solid ${B.border}`, marginBottom: '16px' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: recipient.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{recipient.avatar}</span>
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: B.t1 }}>{recipient.name}</div>
              <div style={{ fontSize: '12px', color: B.t3 }}>{recipient.bank}</div>
            </div>
          </div>
          {[['Amount', `£${parseFloat(amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`], ['From', 'Current ····4291'], ['Arrives', 'Instantly']].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ fontSize: '13px', color: B.t3 }}>{l}</span>
              <span style={{ fontSize: '13px', fontWeight: 500, color: B.t1 }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '10px', background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: '12px', padding: '12px 14px', marginBottom: '24px' }}>
          <Shield size={16} color={B.blueLt} style={{ flexShrink: 0, marginTop: '1px' }} />
          <div style={{ fontSize: '12px', color: B.t2, lineHeight: 1.5 }}>Banks will never ask you to transfer to a 'safe account'. Verify you know the recipient.</div>
        </div>
        {sec >= 3 && <div style={{ textAlign: 'center', marginBottom: '14px', fontFamily: 'monospace', fontSize: '10px', color: B.t3 }}>On confirm screen {sec}s</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={onConfirm} style={{ width: '100%', height: '54px', background: B.blue, border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: 600, color: '#fff', cursor: 'pointer' }}>Confirm Transfer</button>
          <button onClick={onBack} style={{ width: '100%', height: '54px', background: 'transparent', border: `1.5px solid ${B.border}`, borderRadius: '14px', fontSize: '16px', fontWeight: 500, color: B.t2, cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function AppDoneScreen({ recipient, amount }: { recipient: Recipient; amount: string }) {
  return (
    <div style={{ background: B.bg, minHeight: '100%', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
        <CheckCircle size={32} color={B.green} />
      </div>
      <div style={{ fontSize: '24px', fontWeight: 700, color: B.t1, marginBottom: '8px' }}>Transfer Sent!</div>
      <div style={{ fontSize: '32px', fontWeight: 700, color: B.green, marginBottom: '6px' }}>
        £{parseFloat(amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
      </div>
      <div style={{ fontSize: '14px', color: B.t2, marginBottom: '28px' }}>to {recipient.name}</div>
      <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: '12px', padding: '12px 16px', width: '100%' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '10px', color: B.t3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>SW1FT Session</div>
        <div style={{ fontSize: '12px', color: B.t2 }}>Behavioral data captured · channel: mobile</div>
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
// DESKTOP SCREENS
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
      {/* App nav bar */}
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

      {/* Content + sidebar */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left sidebar */}
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
              { icon: Send,         label: 'Send Money'  },
              { icon: ArrowLeftRight,label: 'Transfers'  },
              { icon: Settings,     label: 'Settings'    },
            ].map(({ icon: Icon, label }) => (
              <button key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '9px 10px', background: 'transparent', border: 'none', color: B.t2, borderRadius: '8px', cursor: 'pointer', fontSize: '13px', textAlign: 'left' }}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
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
        <div style={{ background: `linear-gradient(135deg,#065F46,#059669)`, borderRadius: '16px', padding: '20px' }}>
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
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: B.card, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
              {t.amount > 0 ? '💰' : t.cat === 'Groceries' ? '🛒' : '📱'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 500, color: B.t1 }}>{t.name}</div>
              <div style={{ fontSize: '12px', color: B.t3 }}>{t.cat} · {t.day}</div>
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: t.amount > 0 ? B.green : B.t1 }}>
              {t.amount > 0 ? '+' : ''}{Math.abs(t.amount).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })}
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
            <input
              type="number" min="0" step="0.01"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="0.00"
              style={{ width: '100%', paddingLeft: '36px', paddingRight: '16px', paddingTop: '16px', paddingBottom: '16px', background: B.surface, border: `1px solid ${B.border}`, borderRadius: '12px', fontSize: '28px', fontWeight: 700, color: B.t1, outline: 'none', fontVariantNumeric: 'tabular-nums', boxSizing: 'border-box' }}
              onFocus={e => (e.target.style.borderColor = B.blue)}
              onBlur={e => (e.target.style.borderColor = B.border)}
            />
          </div>
          <div style={{ fontSize: '12px', color: B.t3, marginTop: '6px' }}>Available: £2,847.50</div>
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: B.t3, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>Reference (optional)</label>
          <input type="text" placeholder="e.g. Rent, Birthday" style={{ width: '100%', padding: '13px 16px', background: B.surface, border: `1px solid ${B.border}`, borderRadius: '12px', fontSize: '14px', color: B.t1, outline: 'none', boxSizing: 'border-box' }}
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
        {/* Transfer details */}
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
        {/* Security + actions */}
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
      {/* Title bar */}
      <div style={{ height: '38px', background: '#1A1C24', borderBottom: '1px solid #252830', display: 'flex', alignItems: 'center', padding: '0 14px', gap: '0', flexShrink: 0 }}>
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
      {/* App content */}
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
