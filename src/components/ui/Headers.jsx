import React from 'react';

export function AppHeader({ title, subline, rightElement }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      padding: '26px 18px 12px',
      backgroundColor: 'var(--bg)',
      position: 'sticky',
      top: 0,
      zIndex: 10,
      paddingTop: 'calc(26px + env(safe-area-inset-top, 0px))',
    }}>
      <div style={{ flex: 1 }}>
        <h1 style={{
          margin: 0,
          fontSize: '26px',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          color: 'var(--tx)',
        }}>
          {title}
        </h1>
        {subline && (
          <div style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '13px',
            color: 'var(--mu)',
            marginTop: '2px',
          }}>
            {subline}
          </div>
        )}
      </div>
      {rightElement && (
        <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
          {rightElement}
        </div>
      )}
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
      marginTop: '24px',
    }}>
      <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{title}</h2>
      {actionElement && <div>{actionElement}</div>}
    </div>
  );
}

/** Small mono pill for header right slot — used for "Level 7", "New goal", etc. */
export function HeaderPill({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: "'Geist Mono', monospace",
        fontSize: '11.5px',
        color: 'var(--mu)',
        padding: '9px 12px',
        borderRadius: 'var(--r-control)',
        boxShadow: 'inset 0 0 0 1px var(--hairline)',
        background: 'transparent',
        border: 'none',
        cursor: onClick ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}
