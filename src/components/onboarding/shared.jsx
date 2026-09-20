import React, { useState } from 'react';
import { ACCENT } from '../../constants.js';

export function Label({ t, children }) {
  return (
    <div style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.25em', color: ACCENT, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
      {children}
    </div>
  );
}

export function SectionTitle({ children }) {
  return (
    <h2 style={{ fontSize: '1.5rem', fontWeight: 900, lineHeight: 1.15, margin: '0 0 0.25rem 0' }}>
      {children}
    </h2>
  );
}

export function Subtitle({ t, children }) {
  return (
    <p style={{ color: t?.muted || '#888', fontSize: '0.85rem', lineHeight: 1.6, margin: '0 0 1.5rem 0' }}>
      {children}
    </p>
  );
}

export function SelectableTags({ t, value, onChange, options = [], customPlaceholder = "Add custom..." }) {
  const [draft, setDraft] = useState('');

  const toggle = (tag) => {
    if (value.includes(tag)) {
      onChange(value.filter(v => v !== tag));
    } else {
      onChange([...value, tag]);
    }
  };

  const addCustom = () => {
    const trimmed = draft.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setDraft('');
  };

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
        {Array.from(new Set([...options, ...value])).map(tag => {
          const isSelected = value.includes(tag);
          return (
            <button
              type="button"
              aria-pressed={isSelected}
              key={tag}
              onClick={() => toggle(tag)}
              style={{
                padding: '0.35rem 0.7rem',
                background: isSelected ? ACCENT : t?.subtleBg || 'transparent',
                border: `1px solid ${isSelected ? ACCENT : (t?.border || '#ccc')}`,
                color: isSelected ? '#fff' : (t?.pageText || '#333'),
                fontFamily: 'monospace',
                fontSize: '0.7rem',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                borderRadius: '4px',
                transition: 'all 0.15s ease',
              }}
            >
              {tag}
            </button>
          );
        })}
      </div>
      
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          placeholder={customPlaceholder}
          style={{
            flex: 1, padding: '0.5rem 0.75rem',
            background: t?.subtleBg || '#eee', border: `1px solid ${t?.border || '#ccc'}`,
            color: t?.pageText || '#333', fontFamily: 'Georgia, serif', fontSize: '0.85rem',
            outline: 'none', borderRadius: '4px'
          }}
        />
        <button
          onClick={addCustom}
          style={{
            padding: '0.5rem 0.9rem', background: 'transparent',
            border: `1px solid ${t?.border || '#ccc'}`, color: t?.pageText || '#333',
            fontFamily: 'monospace', fontSize: '0.65rem', cursor: 'pointer',
            borderRadius: '4px'
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

export function SliderRow({ t, label, icon, value, onChange, min = 0, max = 100, step = 5 }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.3rem' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.1em', color: t?.muted || '#888' }}>
          {icon} {label}
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, color: ACCENT }}>
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: ACCENT }}
      />
    </div>
  );
}

export function NavButtons({ t, onBack, onNext, nextLabel = 'Continue →', backLabel = '← Back', canNext = true }) {
  return (
    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            flex: '0 0 auto', padding: '0.8rem 1.1rem',
            background: 'transparent', border: `1px solid ${t?.border || '#ccc'}`,
            color: t?.muted || '#888', fontFamily: 'monospace', fontSize: '0.65rem',
            letterSpacing: '0.1em', cursor: 'pointer',
          }}
        >
          {backLabel}
        </button>
      )}
      <button
        onClick={onNext}
        disabled={!canNext}
        style={{
          flex: 1, padding: '0.9rem',
          background: canNext ? ACCENT : (t?.subtleBg || '#eee'),
          border: 'none',
          color: canNext ? '#fff' : (t?.muted || '#888'),
          fontFamily: 'monospace', fontSize: '0.7rem', letterSpacing: '0.15em',
          textTransform: 'uppercase', cursor: canNext ? 'pointer' : 'default',
          transition: 'background 0.2s',
        }}
      >
        {nextLabel}
      </button>
    </div>
  );
}

export function ProgressDots({ total, current, t }) {
  return (
    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '2rem' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 20 : 6,
            height: 6,
            borderRadius: 3,
            background: i === current ? ACCENT : (i < current ? (t?.muted || '#888') : (t?.borderFaint || '#ddd')),
            transition: 'all 0.3s ease',
          }}
        />
      ))}
    </div>
  );
}
