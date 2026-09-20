import React, { useState } from 'react';
import { ACCENT } from '../../constants.js';

export function AIInput({ t, onSubmit, placeholder, loadingText = "Thinking..." }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmit(text);
      setText(''); // clear on success
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: '1.5rem', padding: '1rem', background: t?.invertBg || '#1c1916', borderRadius: '6px' }}>
      <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: ACCENT, letterSpacing: '0.15em', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
        AI Assist
      </div>
      
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={placeholder}
        rows={4}
        disabled={loading}
        style={{
          width: '100%', padding: '0.75rem',
          background: 'transparent', border: `1px solid ${t?.invertDivider || 'rgba(255,255,255,0.1)'}`,
          color: t?.invertText || '#f7f3ec', fontFamily: 'Georgia, serif', fontSize: '0.9rem',
          boxSizing: 'border-box', outline: 'none', resize: 'vertical',
          marginBottom: '0.5rem'
        }}
      />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: 'red', fontSize: '0.75rem' }}>{error}</div>
        <button
          onClick={handleSubmit}
          disabled={loading || !text.trim()}
          style={{
            padding: '0.6rem 1rem', background: ACCENT, color: '#fff',
            border: 'none', borderRadius: '4px', cursor: (loading || !text.trim()) ? 'default' : 'pointer',
            fontFamily: 'monospace', fontSize: '0.75rem', letterSpacing: '0.1em',
            opacity: (loading || !text.trim()) ? 0.5 : 1
          }}
        >
          {loading ? loadingText : 'Process →'}
        </button>
      </div>
    </div>
  );
}
