import React from 'react';

export default function TokensDevPage() {
  const radii = [
    { name: '--r-container', val: 'var(--r-container)' },
    { name: '--r-sheet', val: 'var(--r-sheet)' },
    { name: '--r-control', val: 'var(--r-control)' },
    { name: '--r-chip', val: 'var(--r-chip)' },
    { name: '--r-check', val: 'var(--r-check)' }
  ];

  const colors = [
    { name: '--bg', val: 'var(--bg)' },
    { name: '--s1', val: 'var(--s1)' },
    { name: '--s2', val: 'var(--s2)' },
    { name: '--tx', val: 'var(--tx)' },
    { name: '--mu', val: 'var(--mu)' },
    { name: '--ac', val: 'var(--ac)' },
    { name: '--on-ac', val: 'var(--on-ac)', bg: 'var(--ac)' },
    { name: '--danger', val: 'var(--danger)' },
    { name: '--body', val: 'var(--body)' },
    { name: '--discipline', val: 'var(--discipline)' },
    { name: '--knowledge', val: 'var(--knowledge)' },
    { name: '--social', val: 'var(--social)' },
    { name: '--creativity', val: 'var(--creativity)' },
    { name: '--strategy', val: 'var(--strategy)' },
  ];

  return (
    <div className="min-h-100dvh safe-pt safe-pb safe-pl safe-pr" style={{ padding: '16px', color: 'var(--tx)' }}>
      <h1 style={{ fontSize: '26px', letterSpacing: '-0.02em', marginBottom: '16px' }}>Design Tokens</h1>
      
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Colors</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
          {colors.map(c => (
            <div key={c.name} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ 
                height: '60px', 
                backgroundColor: c.val, 
                borderRadius: 'var(--r-control)',
                border: c.name === '--bg' ? '1px solid var(--hairline)' : 'none'
              }} />
              <div className="mono" style={{ fontSize: '11.5px', color: c.bg ? c.val : 'var(--mu)' }}>
                {c.name}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Radii</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          {radii.map(r => (
            <div key={r.name} style={{ 
              width: '80px', height: '80px', 
              backgroundColor: 'var(--s1)', 
              borderRadius: r.val,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--hairline)'
            }}>
              <span className="mono" style={{ fontSize: '10px', color: 'var(--mu)' }}>{r.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Typography</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '26px', letterSpacing: '-0.02em' }}>Screen Title 26px Geist</div>
          <div style={{ fontSize: '18px', fontWeight: 600 }}>Card Title 18/600 Geist</div>
          <div style={{ fontSize: '14.5px' }}>Body 14.5px Geist</div>
          <div style={{ fontSize: '12.5px', color: 'var(--mu)' }}>Secondary 12.5px Geist</div>
          <div className="mono" style={{ fontSize: '11.5px', color: 'var(--mu)' }}>Mono metadata 11.5px Geist Mono</div>
          <div className="mono" style={{ fontSize: '32px' }}>Hero 32px Geist Mono</div>
        </div>
      </section>

    </div>
  );
}
