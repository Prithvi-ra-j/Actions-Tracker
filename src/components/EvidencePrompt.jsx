import React, { useState } from 'react';
import { ACCENT } from '../constants.js';

/**
 * Thin Evidence/Impact pass UI.
 * Asks the user to rate the impact of a completed action and provide a confidence level.
 */
export default function EvidencePrompt({ t, onSave, onCancel }) {
  const [impact, setImpact] = useState(null); // 1 (Yes), 0 (Neutral), -1 (No)
  const [confidence, setConfidence] = useState('med'); // 'high', 'med', 'low'
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    if (impact === null || submitting) return;
    setSubmitting(true);
    await onSave({ impact, confidence, text: text.trim() });
    setSubmitting(false);
  };

  const btnStyle = (selected) => ({
    flex: 1,
    padding: '0.5rem',
    background: selected ? ACCENT : 'transparent',
    color: selected ? '#fff' : t.pageText,
    border: `1px solid ${selected ? ACCENT : t.border}`,
    borderRadius: '4px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    transition: 'all 0.2s'
  });

  return (
    <div style={{
      marginTop: '0.5rem',
      padding: '1rem',
      background: t.subtleBg,
      borderLeft: `2px solid ${ACCENT}`,
      borderRadius: '0 4px 4px 0',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem'
    }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Did this actually matter?</div>
      
      {/* Impact Row */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button style={btnStyle(impact === 1)} onClick={() => setImpact(1)}>Yes (+1)</button>
        <button style={btnStyle(impact === 0)} onClick={() => setImpact(0)}>Neutral (0)</button>
        <button style={btnStyle(impact === -1)} onClick={() => setImpact(-1)}>No (-1)</button>
      </div>

      {/* Confidence Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', marginTop: '0.25rem' }}>
        <span style={{ color: t.muted, flexShrink: 0 }}>CONFIDENCE:</span>
        <button style={{...btnStyle(confidence === 'low'), padding: '0.25rem'}} onClick={() => setConfidence('low')}>Low</button>
        <button style={{...btnStyle(confidence === 'med'), padding: '0.25rem'}} onClick={() => setConfidence('med')}>Med</button>
        <button style={{...btnStyle(confidence === 'high'), padding: '0.25rem'}} onClick={() => setConfidence('high')}>High</button>
      </div>

      <input
        type="text"
        placeholder="Why? (Optional)"
        value={text}
        onChange={e => setText(e.target.value)}
        disabled={submitting}
        style={{
          width: '100%',
          padding: '0.5rem',
          background: t.invertBg,
          color: t.invertText,
          border: 'none',
          borderRadius: '4px',
          fontFamily: 'inherit',
          fontSize: '0.8rem',
          outline: 'none'
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={submitting}
            style={{
              background: 'transparent', color: t.muted, border: 'none',
              fontSize: '0.7rem', textTransform: 'uppercase', cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={impact === null || submitting}
          style={{
            background: impact !== null ? ACCENT : t.border,
            color: impact !== null ? '#fff' : t.muted,
            border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px',
            fontSize: '0.7rem', textTransform: 'uppercase', cursor: impact !== null ? 'pointer' : 'default',
          }}
        >
          {submitting ? 'Saving...' : 'Save Evaluation'}
        </button>
      </div>
    </div>
  );
}
