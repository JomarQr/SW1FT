import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, Bell, Send, CreditCard, TrendingUp, MoreHorizontal, Plus, Shield, CheckCircle } from 'lucide-react';
import PhoneFrame from '../components/PhoneFrame';
import { useBehaviorCapture } from '../lib/useBehaviorCapture';
import { snapshotToSession, saveLiveSession } from '../lib/liveSessionStore';
import { saveSession } from '../lib/behaviorStore';
import {
  computeRiskScore, getRiskLevel, getRecommendedActions, getTopRiskFactors,
  saveIntervention, type InterventionRecord,
} from '../lib/interventionStore';
import { getUsername } from '../lib/auth';
import { COLORS } from '../lib/mockData';

// ─── ArcBank design tokens ─────────────────────────────────────────────────────

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

const RECIPIENTS = [
  { id: 'r1', name: 'Alice Johnson',  bank: 'Barclays',     avatar: 'AJ', color: '#7C3AED', amount: '£120.00' },
  { id: 'r2', name: 'Bob Smith',      bank: 'HSBC',         avatar: 'BS', color: '#2563EB', amount: '£45.00'  },
  { id: 'r3', name: 'Carl Martinez',  bank: 'Lloyds',       avatar: 'CM', color: '#059669', amount: '£200.00' },
  { id: 'r4', name: 'Diana Lee',      bank: 'Natwest',      avatar: 'DL', color: '#DC2626', amount: '£80.00'  },
];

const RECENT_TXN = [
  { name: 'Tesco',    cat: 'Groceries',    amount: -18.50,  day: 'Today'     },
  { name: 'Netflix',  cat: 'Subscription', amount: -9.99,   day: 'Yesterday' },
  { name: 'Salary',   cat: 'Income',       amount: +2400.00,day: '1 Jan'     },
  { name: 'Amazon',   cat: 'Shopping',     amount: -67.80,  day: '31 Dec'    },
  { name: 'Spotify',  cat: 'Subscription', amount: -9.99,   day: '30 Dec'    },
];

type Screen = 'home' | 'send' | 'amount' | 'confirm' | 'done';

// ─── Screen components ─────────────────────────────────────────────────────────

function HomeScreen({ onSend, onQuickAction }: { onSend: () => void; onQuickAction: (a: string) => void }) {
  return (
    <div style={{ background: B.bg, minHeight: '100%', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '60px 20px 20px', background: `linear-gradient(160deg, #0F1A3A 0%, ${B.bg} 80%)` }}>
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

        {/* Balance card */}
        <div style={{ background: `linear-gradient(135deg, ${B.blue} 0%, #1D4ED8 100%)`, borderRadius: '20px', padding: '20px', marginBottom: '8px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Current Account</div>
          <div style={{ fontSize: '34px', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', marginBottom: '16px' }}>£2,847.50</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>•••• •••• •••• 4291</div>
            <div style={{ display: 'flex', gap: '-4px' }}>
              {[B.blue, B.blueLt].map((c, i) => (
                <div key={i} style={{ width: '22px', height: '22px', borderRadius: '50%', background: c, opacity: 0.8, marginLeft: i ? '-6px' : '0', border: '2px solid transparent' }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {[
            { icon: Send,         label: 'Send',   action: 'send'   },
            { icon: CreditCard,   label: 'Pay',    action: 'pay'    },
            { icon: TrendingUp,   label: 'Top Up', action: 'topup'  },
            { icon: MoreHorizontal,label: 'More',  action: 'more'   },
          ].map(({ icon: Icon, label, action }) => (
            <button
              key={action}
              onClick={() => action === 'send' ? onSend() : onQuickAction(action)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px', background: B.surface, border: `1px solid ${B.border}`, borderRadius: '14px', padding: '14px 8px', cursor: 'pointer' }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: action === 'send' ? `rgba(37,99,235,0.15)` : B.card, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} color={action === 'send' ? B.blueLt : B.t2} />
              </div>
              <span style={{ fontSize: '11px', color: B.t2, fontWeight: 500 }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent transactions */}
      <div style={{ padding: '0 20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: B.t1 }}>Recent</span>
          <span style={{ fontSize: '12px', color: B.blueLt }}>See all</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {RECENT_TXN.map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: B.surface, borderRadius: i === 0 ? '12px 12px 4px 4px' : i === RECENT_TXN.length - 1 ? '4px 4px 12px 12px' : '4px', cursor: 'pointer' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: B.card, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '14px' }}>{t.amount > 0 ? '💰' : t.cat === 'Groceries' ? '🛒' : t.cat === 'Subscription' ? '📱' : '📦'}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: B.t1 }}>{t.name}</div>
                <div style={{ fontSize: '11px', color: B.t3, marginTop: '2px' }}>{t.cat} · {t.day}</div>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: t.amount > 0 ? B.green : B.t1, fontVariantNumeric: 'tabular-nums' }}>
                {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SendScreen({ onBack, onSelect }: { onBack: () => void; onSelect: (r: typeof RECIPIENTS[0]) => void }) {
  return (
    <div style={{ background: B.bg, minHeight: '100%', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ padding: '56px 20px 20px' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: B.t2, cursor: 'pointer', marginBottom: '20px', padding: 0 }}>
          <ChevronLeft size={18} /> <span style={{ fontSize: '14px' }}>Back</span>
        </button>
        <div style={{ fontSize: '22px', fontWeight: 700, color: B.t1, marginBottom: '4px' }}>New Payment</div>
        <div style={{ fontSize: '13px', color: B.t2, marginBottom: '28px' }}>Choose a recipient</div>

        {/* Search bar */}
        <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: '12px', padding: '12px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '14px', color: B.t3 }}>🔍</span>
          <span style={{ fontSize: '14px', color: B.t3 }}>Search payees...</span>
        </div>

        <div style={{ fontSize: '11px', fontWeight: 600, color: B.t3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Recent Payees</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {RECIPIENTS.map((r, i) => (
            <button
              key={r.id}
              onClick={() => onSelect(r)}
              style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: B.surface, border: `1px solid ${B.border}`, borderRadius: i === 0 ? '12px 12px 4px 4px' : i === RECIPIENTS.length - 1 ? '4px 4px 12px 12px' : '4px', cursor: 'pointer', textAlign: 'left' }}
            >
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
        </div>

        <button style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', background: 'transparent', border: `1px dashed ${B.border}`, borderRadius: '12px', cursor: 'pointer', width: '100%', marginTop: '10px', color: B.blueLt }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: `rgba(37,99,235,0.1)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={18} color={B.blueLt} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: 500 }}>Add new payee</span>
        </button>
      </div>
    </div>
  );
}

function AmountScreen({ recipient, onBack, onContinue }: { recipient: typeof RECIPIENTS[0]; onBack: () => void; onContinue: (amount: string) => void }) {
  const [digits, setDigits] = useState('0');

  function press(key: string) {
    if (key === '⌫') {
      setDigits(d => d.length <= 1 ? '0' : d.slice(0, -1));
    } else if (key === '.') {
      if (!digits.includes('.')) setDigits(d => d + '.');
    } else {
      if (digits === '0') setDigits(key);
      else if (digits.split('.')[1]?.length >= 2) return;
      else setDigits(d => d + key);
    }
  }

  const numVal = parseFloat(digits) || 0;
  const canContinue = numVal > 0;

  const formatted = (() => {
    const parts = digits.split('.');
    const int = parseInt(parts[0] || '0').toLocaleString('en-GB');
    return parts.length > 1 ? `${int}.${parts[1]}` : int;
  })();

  return (
    <div style={{ background: B.bg, minHeight: '100%', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '56px 20px 0' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: B.t2, cursor: 'pointer', marginBottom: '20px', padding: 0 }}>
          <ChevronLeft size={18} /> <span style={{ fontSize: '14px' }}>Back</span>
        </button>

        {/* Recipient */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: recipient.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{recipient.avatar}</span>
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: B.t1 }}>{recipient.name}</div>
            <div style={{ fontSize: '12px', color: B.t3 }}>{recipient.bank}</div>
          </div>
        </div>

        {/* Amount display */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', fontWeight: 700, color: canContinue ? B.t1 : B.t3, letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums' }}>
            £{formatted}
          </div>
          <div style={{ fontSize: '12px', color: B.t3, marginTop: '6px' }}>Available: £2,847.50</div>
        </div>

        {/* Reference field */}
        <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: '12px', padding: '12px 16px', marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', color: B.t3, marginBottom: '4px' }}>Reference (optional)</div>
          <div style={{ fontSize: '14px', color: B.t2 }}>Payment</div>
        </div>
      </div>

      {/* Numpad */}
      <div style={{ padding: '0 20px', marginTop: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
          {['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(k => (
            <button
              key={k}
              onClick={() => press(k)}
              style={{ height: '56px', background: k === '⌫' ? B.surface : B.card, border: `1px solid ${B.border}`, borderRadius: '12px', fontSize: k === '⌫' ? '20px' : '22px', fontWeight: k === '⌫' ? 400 : 500, color: k === '⌫' ? B.t2 : B.t1, cursor: 'pointer' }}
            >
              {k}
            </button>
          ))}
        </div>

        <button
          onClick={() => canContinue && onContinue(digits)}
          disabled={!canContinue}
          style={{ width: '100%', height: '54px', background: canContinue ? B.blue : B.surface, border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: 600, color: canContinue ? '#fff' : B.t3, cursor: canContinue ? 'pointer' : 'not-allowed', marginBottom: '16px', transition: 'background 0.2s' }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function ConfirmScreen({ recipient, amount, onBack, onConfirm }: { recipient: typeof RECIPIENTS[0]; amount: string; onBack: () => void; onConfirm: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ background: B.bg, minHeight: '100%', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ padding: '56px 20px 24px' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: B.t2, cursor: 'pointer', marginBottom: '20px', padding: 0 }}>
          <ChevronLeft size={18} /> <span style={{ fontSize: '14px' }}>Back</span>
        </button>
        <div style={{ fontSize: '22px', fontWeight: 700, color: B.t1, marginBottom: '4px' }}>Confirm Transfer</div>
        <div style={{ fontSize: '13px', color: B.t2, marginBottom: '28px' }}>Review before sending</div>

        {/* Transfer summary */}
        <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingBottom: '16px', borderBottom: `1px solid ${B.border}`, marginBottom: '16px' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: recipient.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{recipient.avatar}</span>
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: B.t1 }}>{recipient.name}</div>
              <div style={{ fontSize: '12px', color: B.t3 }}>{recipient.bank}</div>
            </div>
          </div>

          {[
            ['Amount',    `£${parseFloat(amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`],
            ['From',      'Current Account ····4291'],
            ['Reference', 'Payment'],
            ['Arrives',   'Instantly'],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
              <span style={{ fontSize: '13px', color: B.t3 }}>{label}</span>
              <span style={{ fontSize: '13px', fontWeight: 500, color: B.t1 }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Security notice */}
        <div style={{ display: 'flex', gap: '10px', background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: '12px', padding: '12px 14px', marginBottom: '28px' }}>
          <Shield size={16} color={B.blueLt} style={{ flexShrink: 0, marginTop: '1px' }} />
          <div style={{ fontSize: '12px', color: B.t2, lineHeight: 1.5 }}>
            Always verify you know the recipient personally. Banks will never ask you to transfer money to a 'safe account'.
          </div>
        </div>

        {/* Hesitation indicator (visual only — capture runs in background) */}
        {elapsed >= 3 && (
          <div style={{ textAlign: 'center', marginBottom: '16px', fontFamily: 'JetBrains Mono', fontSize: '10px', color: B.t3 }}>
            On confirmation screen for {elapsed}s
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={onConfirm}
            style={{ width: '100%', height: '54px', background: B.blue, border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: 600, color: '#fff', cursor: 'pointer' }}
          >
            Confirm Transfer
          </button>
          <button
            onClick={onBack}
            style={{ width: '100%', height: '54px', background: 'transparent', border: `1.5px solid ${B.border}`, borderRadius: '14px', fontSize: '16px', fontWeight: 500, color: B.t2, cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function DoneScreen({ recipient, amount, onDashboard }: { recipient: typeof RECIPIENTS[0]; amount: string; onDashboard: () => void }) {
  return (
    <div style={{ background: B.bg, minHeight: '100%', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
        <CheckCircle size={32} color={B.green} />
      </div>
      <div style={{ fontSize: '24px', fontWeight: 700, color: B.t1, marginBottom: '8px' }}>Transfer Sent!</div>
      <div style={{ fontSize: '32px', fontWeight: 700, color: B.green, letterSpacing: '-0.5px', marginBottom: '6px' }}>
        £{parseFloat(amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
      </div>
      <div style={{ fontSize: '14px', color: B.t2, marginBottom: '32px' }}>to {recipient.name}</div>

      <div style={{ background: B.surface, border: `1px solid ${B.border}`, borderRadius: '12px', padding: '14px 16px', marginBottom: '32px', width: '100%' }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: B.t3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>SW1FT Behavioral Session</div>
        <div style={{ fontSize: '12px', color: B.t2 }}>Captured & sent to fraud dashboard</div>
      </div>

      <button
        onClick={onDashboard}
        style={{ width: '100%', height: '50px', background: `rgba(37,99,235,0.15)`, border: `1px solid rgba(37,99,235,0.3)`, borderRadius: '14px', fontSize: '14px', fontWeight: 600, color: B.blueLt, cursor: 'pointer' }}
      >
        View in Dashboard →
      </button>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function MobileDemo() {
  const navigate = useNavigate();
  const analyst = getUsername();
  const containerRef = useRef<HTMLDivElement>(null);
  const [userId] = useState(() => localStorage.getItem('sw1ft_capture_user_id') || '');

  const [screen, setScreen] = useState<Screen>('home');
  const [recipient, setRecipient] = useState<typeof RECIPIENTS[0] | null>(null);
  const [amount, setAmount] = useState('0');
  const [recording, setRecording] = useState(false);
  const [done, setDone] = useState(false);

  const { metrics, finalize, onSubmitHoverStart, onSubmitHoverEnd } = useBehaviorCapture({
    enabled: recording,
    containerRef,
  });

  // Start recording when user taps "Send"
  function handleSend() {
    setRecording(true);
    setScreen('send');
  }

  function handleSelectRecipient(r: typeof RECIPIENTS[0]) {
    setRecipient(r);
    setScreen('amount');
  }

  function handleAmount(amt: string) {
    setAmount(amt);
    onSubmitHoverStart(); // start hesitation timer as user moves to confirm
    setScreen('confirm');
  }

  function handleConfirm() {
    onSubmitHoverEnd();
    const snap = finalize(analyst, userId.trim() || undefined, 'mobile');
    setRecording(false);
    setDone(true);

    const numAmount = parseFloat(amount) || 47.99;
    const score = computeRiskScore(snap);
    const level = getRiskLevel(score);

    const liveSession = snapshotToSession(snap, numAmount);
    saveLiveSession(liveSession);
    saveSession(snap);

    if (level !== 'APPROVE') {
      const intervention: InterventionRecord = {
        id: `INT-${snap.session_id}`,
        session_id: snap.session_id,
        user_id: snap.user_id ?? snap.analyst,
        timestamp: new Date().toISOString(),
        risk_score: score,
        risk_level: level,
        recommended_actions: getRecommendedActions(level),
        user_action: 'pending',
        outcome: 'pending',
        top_risk_factors: getTopRiskFactors(snap),
        amount: numAmount,
      };
      saveIntervention(intervention);
      window.dispatchEvent(new CustomEvent('sw1ft_new_intervention'));
    }

    setScreen('done');
  }

  function handleReset() {
    setScreen('home');
    setRecipient(null);
    setAmount('0');
    setRecording(false);
    setDone(false);
  }

  return (
    <div style={{ padding: '24px', minHeight: '100%', background: 'var(--bg)' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted, fontFamily: 'JetBrains Mono', fontSize: '11px', padding: 0 }}>
            <ArrowLeft size={13} /> Back
          </button>
          <div style={{ width: '1px', height: '16px', background: 'var(--bdr)' }} />
          <div>
            <div style={{ fontFamily: 'Inter', fontSize: '15px', fontWeight: 600, color: COLORS.primary }}>Mobile Banking Demo</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.muted }}>
              ArcBank simulation · behavioral capture · channel: mobile
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {recording && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="animate-pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: COLORS.danger, display: 'inline-block' }} />
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: COLORS.danger, letterSpacing: '0.1em' }}>RECORDING</span>
            </div>
          )}
          {done && (
            <button onClick={handleReset}
              style={{ background: 'transparent', border: `1px solid var(--bdr)`, color: COLORS.muted, fontFamily: 'JetBrains Mono', fontSize: '10px', letterSpacing: '0.08em', padding: '6px 14px', cursor: 'pointer' }}>
              ↺ Reset Demo
            </button>
          )}
        </div>
      </div>

      {/* Two-column layout: phone + signal info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '40px', alignItems: 'start' }}>
        {/* Phone */}
        <div ref={containerRef}>
          <PhoneFrame height={700}>
            {screen === 'home'    && <HomeScreen onSend={handleSend} onQuickAction={() => {}} />}
            {screen === 'send'    && <SendScreen onBack={() => setScreen('home')} onSelect={handleSelectRecipient} />}
            {screen === 'amount'  && recipient && <AmountScreen recipient={recipient} onBack={() => setScreen('send')} onContinue={handleAmount} />}
            {screen === 'confirm' && recipient && <ConfirmScreen recipient={recipient} amount={amount} onBack={() => setScreen('amount')} onConfirm={handleConfirm} />}
            {screen === 'done'    && recipient && <DoneScreen recipient={recipient} amount={amount} onDashboard={() => navigate('/dashboard')} />}
          </PhoneFrame>
          <div style={{ textAlign: 'center', marginTop: '12px', fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'var(--t4)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            ArcBank · Mobile Demo
          </div>
        </div>

        {/* Info panel */}
        <div style={{ maxWidth: '380px' }}>
          {/* Flow progress */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--bdr)', marginBottom: '12px' }}>
            <div style={{ padding: '9px 14px', borderBottom: '1px solid var(--bdr)', fontFamily: 'JetBrains Mono', fontSize: '9px', fontWeight: 600, color: 'var(--t4)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Demo Flow
            </div>
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {([
                ['home',    'Home Screen',        '1. Tap "Send"'],
                ['send',    'Select Recipient',   '2. Choose payee'],
                ['amount',  'Enter Amount',       '3. Type amount'],
                ['confirm', 'Confirm Transfer',   '4. ⚠ Hesitation captured here'],
                ['done',    'Transfer Complete',  '5. Session saved'],
              ] as [Screen, string, string][]).map(([s, title, hint]) => {
                const screens: Screen[] = ['home','send','amount','confirm','done'];
                const idx = screens.indexOf(s);
                const cur = screens.indexOf(screen);
                const state = idx < cur ? 'done' : idx === cur ? 'active' : 'pending';
                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0, marginTop: '1px', background: state === 'done' ? 'rgba(0,204,122,0.15)' : state === 'active' ? 'rgba(170,85,227,0.15)' : 'var(--card)', border: `1px solid ${state === 'done' ? 'rgba(0,204,122,0.4)' : state === 'active' ? 'rgba(170,85,227,0.4)' : 'var(--bdr)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {state === 'done' && <span style={{ fontSize: '9px', color: COLORS.safe }}>✓</span>}
                      {state === 'active' && <div className="animate-pulse-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: COLORS.accent }} />}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: state === 'active' ? COLORS.accent : state === 'done' ? COLORS.safe : 'var(--t4)', fontWeight: state === 'active' ? 600 : 400 }}>{title}</div>
                      <div style={{ fontFamily: 'Inter', fontSize: '10px', color: 'var(--t4)', marginTop: '1px' }}>{hint}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live signal summary (once recording) */}
          {recording && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--bdr)', marginBottom: '12px' }}>
              <div style={{ padding: '9px 14px', borderBottom: '1px solid var(--bdr)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="animate-pulse-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: COLORS.danger, display: 'inline-block' }} />
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', fontWeight: 600, color: 'var(--t4)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Live Signals — Mobile</span>
              </div>
              <div style={{ padding: '10px 0' }}>
                {[
                  ['channel',          'mobile'],
                  ['events',           `${metrics.raw_event_count} captured`],
                  ['events/s',         `${metrics.events_per_second}`],
                  ['clicks',           `${metrics.mouse.click_count}`],
                  ['keystrokes',       `${metrics.keyboard.total_keys}`],
                  ['scroll_depth',     `${metrics.session.scroll_depth_pct.toFixed(0)}%`],
                  ['tab_switches',     `${metrics.attention.tab_switch_count}`],
                  ['paste_total',      `${metrics.clipboard.paste_total}`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 14px' }}>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--t3)' }}>{k}</span>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: k === 'channel' ? COLORS.accent : COLORS.primary }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* How it works */}
          {!recording && !done && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--bdr)' }}>
              <div style={{ padding: '9px 14px', borderBottom: '1px solid var(--bdr)', fontFamily: 'JetBrains Mono', fontSize: '9px', fontWeight: 600, color: 'var(--t4)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                How it works
              </div>
              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  ['Tap "Send" on the phone', 'Recording starts automatically'],
                  ['Complete the transfer flow', 'SW1FT captures all interactions'],
                  ['Session tagged as mobile', 'channel: mobile in the dashboard'],
                  ['Confirm = fraud signal check', 'Pre-confirmation hesitation measured'],
                ].map(([title, desc]) => (
                  <div key={title} style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--bdr2)', marginTop: '6px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'var(--t2)' }}>{title}</div>
                      <div style={{ fontFamily: 'Inter', fontSize: '10px', color: 'var(--t4)', marginTop: '2px' }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
