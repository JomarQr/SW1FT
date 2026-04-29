interface PhoneFrameProps {
  children: React.ReactNode;
  height?: number;
}

export default function PhoneFrame({ children, height = 760 }: PhoneFrameProps) {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Volume buttons */}
      {[72, 112].map((top, i) => (
        <div key={i} style={{
          position: 'absolute', left: '-4px', top: `${top}px`,
          width: '4px', height: '30px',
          background: '#28282F', borderRadius: '2px 0 0 2px',
        }} />
      ))}
      {/* Power button */}
      <div style={{
        position: 'absolute', right: '-4px', top: '96px',
        width: '4px', height: '46px',
        background: '#28282F', borderRadius: '0 2px 2px 0',
      }} />

      {/* Phone body */}
      <div style={{
        width: '375px',
        background: '#16161A',
        borderRadius: '48px',
        border: '2px solid #2C2C35',
        boxShadow: '0 0 0 1px #0A0A0B, 0 32px 80px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.05)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Dynamic island */}
        <div style={{
          position: 'absolute', top: '13px', left: '50%',
          transform: 'translateX(-50%)',
          width: '118px', height: '32px',
          background: '#000',
          borderRadius: '18px',
          zIndex: 20,
        }} />

        {/* Status bar */}
        <div style={{
          height: '52px',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '14px 26px 0',
          position: 'relative', zIndex: 10,
          pointerEvents: 'none',
        }}>
          <span style={{ fontFamily: 'Inter', fontSize: '13px', fontWeight: 700, color: '#fff' }}>9:41</span>
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center', marginTop: '2px' }}>
            {/* Signal bars */}
            {[4, 6, 9, 11].map((h, i) => (
              <div key={i} style={{ width: '3px', height: `${h}px`, background: i < 3 ? '#fff' : 'rgba(255,255,255,0.3)', borderRadius: '1.5px' }} />
            ))}
            <div style={{ width: '2px' }} />
            {/* WiFi arcs using borders */}
            <div style={{ position: 'relative', width: '16px', height: '11px', overflow: 'hidden' }}>
              {[11, 7, 4].map((s, i) => (
                <div key={i} style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: s, height: s, borderRadius: '50%', border: '1.5px solid', borderColor: `rgba(255,255,255,${1 - i * 0.25})`, borderBottom: 'transparent', borderLeft: 'transparent', borderRight: 'transparent' }} />
              ))}
            </div>
            <div style={{ width: '2px' }} />
            {/* Battery */}
            <div style={{ position: 'relative', width: '22px', height: '11px', border: '1.5px solid rgba(255,255,255,0.6)', borderRadius: '2.5px', padding: '1.5px' }}>
              <div style={{ width: '65%', height: '100%', background: '#fff', borderRadius: '1px' }} />
              <div style={{ position: 'absolute', right: '-4px', top: '50%', transform: 'translateY(-50%)', width: '2px', height: '5px', background: 'rgba(255,255,255,0.4)', borderRadius: '0 1px 1px 0' }} />
            </div>
          </div>
        </div>

        {/* Scrollable screen content */}
        <div style={{ height, overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}>
          {children}
        </div>

        {/* Home indicator */}
        <div style={{ height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'inherit' }}>
          <div style={{ width: '130px', height: '5px', background: 'rgba(255,255,255,0.22)', borderRadius: '3px' }} />
        </div>
      </div>
    </div>
  );
}
