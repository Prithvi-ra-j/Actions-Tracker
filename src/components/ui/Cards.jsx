import React from 'react';

export function Card({ children, onClick, className = '', style = {} }) {
  const isClickable = !!onClick;
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        backgroundColor: 'var(--s1)',
        borderRadius: 'var(--r-container)',
        padding: 'var(--space-4)',
        border: '1px solid var(--hairline)',
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'transform 0.15s, background-color 0.2s',
        ...style
      }}
      onPointerDown={(e) => isClickable && (e.currentTarget.style.transform = 'scale(0.98)')}
      onPointerUp={(e) => isClickable && (e.currentTarget.style.transform = 'scale(1)')}
      onPointerLeave={(e) => isClickable && (e.currentTarget.style.transform = 'scale(1)')}
    >
      {children}
    </div>
  );
}

export function Pin({ title, value, bar, icon, onClick }) {
  return (
    <Card onClick={onClick} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.8, fontSize: '12.5px' }}>
        {icon}
        <span>{title}</span>
      </div>
      <div className="mono" style={{ fontSize: '32px', fontWeight: 500 }}>
        {value}
      </div>
      {bar && <div style={{ marginTop: '4px' }}>{bar}</div>}
    </Card>
  );
}

export function StatCard({ label, value, delta, onClick }) {
  return (
    <Card onClick={onClick} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ fontSize: '13px', color: 'var(--mu)' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span className="mono" style={{ fontSize: '24px' }}>{value}</span>
        {delta && (
          <span className="mono" style={{ fontSize: '13px', color: delta.startsWith('+') ? 'var(--strategy)' : 'var(--danger)' }}>
            {delta}
          </span>
        )}
      </div>
    </Card>
  );
}

export function EntityRow({ title, label, rightElement, onClick, leftElement }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        minHeight: 'var(--control-height-lg)',
        padding: '0 16px',
        backgroundColor: 'var(--s1)',
        borderRadius: 'var(--r-control)',
        cursor: onClick ? 'pointer' : 'default',
        marginBottom: '8px',
        border: '1px solid var(--hairline)'
      }}
    >
      {leftElement && <div style={{ marginRight: '16px', display: 'flex' }}>{leftElement}</div>}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: '15px', fontWeight: 500 }}>{title}</div>
        {label && <div className="mono" style={{ fontSize: '11.5px', color: 'var(--mu)', marginTop: '2px' }}>{label}</div>}
      </div>
      {rightElement && <div style={{ marginLeft: '16px' }}>{rightElement}</div>}
    </div>
  );
}
