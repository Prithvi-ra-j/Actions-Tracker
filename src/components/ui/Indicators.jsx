import React from 'react';

export function Chip({ label, icon, active, onClick, color = 'var(--s2)', activeColor = 'var(--ac)' }) {
  const isClickable = !!onClick;
  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-pressed={isClickable ? active : undefined}
      onClick={onClick}
      onKeyDown={(event) => { if (isClickable && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onClick(event); } }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: 'var(--control-height-sm)',
        padding: '0 var(--space-2)',
        borderRadius: 'var(--r-chip)',
        backgroundColor: active ? `color-mix(in srgb, ${activeColor} 20%, transparent)` : color,
        border: `1px solid ${active ? activeColor : 'var(--hairline)'}`,
        color: active ? activeColor : 'var(--tx)',
        fontSize: '13px',
        fontWeight: 500,
        cursor: isClickable ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s'
      }}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

export function ModePill({ mode, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: 'var(--control-height-sm)',
        padding: '0 var(--space-2)',
        borderRadius: '999px',
        backgroundColor: 'var(--s2)',
        border: '1px solid var(--hairline)',
        color: 'var(--tx)',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer'
      }}
    >
      {icon || <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--ac)' }} />}
      <span>{mode}</span>
    </button>
  );
}

export function SegmentedBar({ value = 0, projected = 0, segments = 10 }) {
  const arr = Array.from({ length: segments });
  return (
    <div style={{ display: 'flex', gap: '2px', height: '8px', width: '100%' }}>
      {arr.map((_, i) => {
        let bg = 'var(--s2)';
        if (i < value) bg = 'var(--ac)';
        else if (i < value + projected) bg = 'color-mix(in srgb, var(--ac) 40%, transparent)';
        
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: '100%',
              backgroundColor: bg,
              borderRadius: '2px',
              transition: 'background-color 0.3s'
            }}
          />
        );
      })}
    </div>
  );
}

export function ProgressRing({ progress = 0, size = 48, strokeWidth = 4, color = 'var(--ac)' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        stroke="var(--s2)"
        fill="transparent"
        strokeWidth={strokeWidth}
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        stroke={color}
        fill="transparent"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        r={radius}
        cx={size / 2}
        cy={size / 2}
        style={{ transition: 'stroke-dashoffset 0.5s ease-in-out', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
      />
    </svg>
  );
}

export function TrustRail({ type = 'observed', children }) {
  // type: 'observed' | 'inferred' | 'suggested'
  const styleMap = {
    observed: { borderLeft: '3px solid var(--mu)' },
    inferred: { borderLeft: '3px dashed var(--mu)' },
    suggested: { borderLeft: '3px dotted var(--ac)' }
  };
  return (
    <div style={{ paddingLeft: '12px', margin: '8px 0', ...styleMap[type] }}>
      {children}
    </div>
  );
}
