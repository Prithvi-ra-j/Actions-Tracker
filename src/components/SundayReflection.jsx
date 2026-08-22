import React, { useState } from 'react';
import { ACCENT } from '../constants.js';

export default function SundayReflection({ t, onSubmit }) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    await onSubmit(text.trim());
    setSubmitting(false);
  };

  return (
    <div style={{
      background: t.subtleBg,
      border: `1px solid ${t.border}`,
      borderLeft: `4px solid ${ACCENT}`,
      padding: '1.25rem',
      marginBottom: '1.25rem',
    }}>
      <div style={{
        fontFamily: 'monospace',
        fontSize: '0.65rem',
        letterSpacing: '0.2em',
        color: ACCENT,
        textTransform: 'uppercase',
        marginBottom: '0.5rem',
      }}>
        Sunday Review
      </div>
      
      <p style={{ fontSize: '0.85rem', color: t.pageText, lineHeight: 1.6, marginBottom: '1rem' }}>
        What pattern emerged this week? Take a moment to reflect before the new week starts.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={submitting}
        placeholder="Write your reflection here..."
        style={{
          width: '100%',
          minHeight: '80px',
          background: t.invertBg,
          color: t.invertText,
          border: 'none',
          padding: '0.75rem',
          fontFamily: 'inherit',
          fontSize: '0.85rem',
          lineHeight: 1.5,
          resize: 'vertical',
          marginBottom: '1rem',
          outline: 'none',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || submitting}
          style={{
            background: text.trim() ? ACCENT : t.border,
            color: text.trim() ? '#fff' : t.muted,
            border: 'none',
            padding: '0.6rem 1.25rem',
            fontFamily: 'monospace',
            fontSize: '0.7rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            cursor: text.trim() ? 'pointer' : 'default',
            transition: 'all 0.2s',
          }}
        >
          {submitting ? 'Saving...' : 'Log Reflection'}
        </button>
      </div>
    </div>
  );
}
