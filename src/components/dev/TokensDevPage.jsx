import React from 'react';

const COLORS = ['--color-bg','--color-surface-1','--color-surface-2','--color-text','--color-text-muted','--color-accent','--color-on-accent','--color-danger','--color-success','--color-warning','--color-axis-body','--color-axis-discipline','--color-axis-knowledge','--color-axis-social','--color-axis-creativity','--color-axis-strategy'];
const RADII = ['--radius-container','--radius-control','--radius-chip','--radius-sheet','--radius-check'];
const SPACING = ['--space-1','--space-2','--space-3','--space-4','--space-5','--space-6','--space-8','--space-10','--space-12'];

export default function TokensDevPage() {
  return (
    <div className="min-h-100dvh safe-pt safe-pb safe-pl safe-pr" style={{ padding: 'var(--space-4)', color: 'var(--color-text)' }}>
      <h1 style={{ fontSize: '26px', letterSpacing: '-0.02em', marginBottom: '16px' }}>Design Tokens</h1>
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Colors</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
          {COLORS.map(name => <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ height: '60px', backgroundColor: 'var(' + name + ')', borderRadius: 'var(--radius-control)', border: name === '--color-bg' ? '1px solid var(--color-hairline)' : 'none' }} />
            <div className="mono" style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>{name}</div>
          </div>)}
        </div>
      </section>
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Spacing</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {SPACING.map(name => <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 'var(' + name + ')', minWidth: '4px', height: '12px', background: 'var(--color-accent)' }} />
            <span className="mono" style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{name}</span>
          </div>)}
        </div>
      </section>
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Radii</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          {RADII.map(name => <div key={name} style={{ width: '80px', height: '80px', backgroundColor: 'var(--color-surface-1)', borderRadius: 'var(' + name + ')', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-hairline)' }}>
            <span className="mono" style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{name}</span>
          </div>)}
        </div>
      </section>
      <section>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Typography</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '26px', letterSpacing: '-0.02em' }}>Screen Title · 26px</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '18px', fontWeight: 600 }}>Card Title · 18/600</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '14.5px' }}>Body · 14.5px</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12.5px', color: 'var(--color-text-muted)' }}>Secondary · 12.5px</div>
          <div className="mono" style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>Metadata · Geist Mono 11.5px</div>
          <div className="mono" style={{ fontSize: '32px' }}>Hero · Geist Mono 32px</div>
        </div>
      </section>
    </div>
  );
}
