import React from 'react';

export function AppHeader({ title, subline, rightElement }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 var(--space-4)',
      height: '64px',
      backgroundColor: 'var(--bg)',
      position: 'sticky',
      top: 0,
      zIndex: 10,
      paddingTop: 'env(safe-area-inset-top, 0px)'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <h1 style={{ margin: 0, fontSize: '1.625rem', fontWeight: 600, letterSpacing: '-0.02em' }}>
          {title}
        </h1>
        {subline && (
          <div className="mono" style={{ fontSize: '11.5px', color: 'var(--mu)', marginTop: '2px' }}>
            {subline}
          </div>
        )}
      </div>
      {rightElement && <div>{rightElement}</div>}
    </div>
  );
}

export function SectionHeader({ title, actionElement }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '16px',
      marginTop: '24px'
    }}>
      <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>{title}</h2>
      {actionElement && <div>{actionElement}</div>}
    </div>
  );
}
