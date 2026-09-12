import React, { useState } from 'react';
import { ACCENT } from '../constants.js';
import InsightsInbox from './InsightsInbox.jsx';

/**
 * Jarvis Tab (§25).
 * 
 * Provides an interface to interact with Jarvis and view structured AI insights.
 */
export default function JarvisTab({ t, onQuestsChanged }) {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    setInsight(null);

    try {
      const { generateInsight } = await import('../core/ai/jarvisEngine.js');
      const result = await generateInsight();
      setInsight(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const typeColors = {
    pattern: '#4a7ba6',
    contradiction: '#c1442c',
    risk: '#c1442c',
    win: '#4f8a5f',
    recommendation: '#d99a2b',
    summary: '#8a7060'
  };

  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.25em', color: ACCENT, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
          Jarvis OS
        </div>
        <div style={{ fontSize: '1.6rem', fontWeight: 900, lineHeight: 1 }}>
          Auditor & Interpreter
        </div>
        <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: t.muted, fontStyle: 'italic', lineHeight: 1.5 }}>
          No mercy. Only evidence.
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.15em', color: t.muted, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          Passive Scheduled Insights
        </div>
        <InsightsInbox t={t} onQuestsChanged={onQuestsChanged} />
      </div>

      <div style={{ border: `1px solid ${t.border}`, padding: '1.5rem', textAlign: 'center', background: t.subtleBg, marginBottom: '1.5rem' }}>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            background: loading ? 'transparent' : ACCENT,
            border: `1px solid ${ACCENT}`,
            color: loading ? ACCENT : '#fff',
            fontFamily: 'monospace', fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase',
            cursor: loading ? 'default' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {loading ? 'Analyzing Evidence...' : 'Generate System Audit'}
        </button>

        {error && (
          <div style={{ marginTop: '1rem', color: '#c1442c', fontSize: '0.8rem', fontFamily: 'monospace', textAlign: 'left' }}>
            <strong>Error:</strong> {error}
            <div style={{ marginTop: '0.5rem', fontSize: '0.7rem' }}>
              Ensure your API key is configured in Settings and you have network connectivity.
            </div>
          </div>
        )}
      </div>

      {insight && (
        <div style={{ 
          borderLeft: `4px solid ${typeColors[insight.type] || ACCENT}`,
          borderTop: `1px solid ${t.border}`,
          borderRight: `1px solid ${t.border}`,
          borderBottom: `1px solid ${t.border}`,
          padding: '1.25rem',
          background: t.subtleBg 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.15em', color: typeColors[insight.type] || ACCENT, textTransform: 'uppercase' }}>
              {insight.type}
            </div>
            {insight.confidence && (
              <div style={{ fontFamily: 'monospace', fontSize: '0.6rem', color: t.muted }}>
                Confidence: {Math.round(insight.confidence * 100)}%
              </div>
            )}
          </div>

          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', lineHeight: 1.3 }}>{insight.title}</h3>
          
          <div style={{ fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.25rem', color: t.pageText }}>
            {insight.statement}
          </div>

          {insight.reasoning && (
            <div style={{ fontSize: '0.8rem', lineHeight: 1.5, marginBottom: '1rem', color: t.muted, fontStyle: 'italic' }}>
              <strong>Reasoning:</strong> {insight.reasoning}
            </div>
          )}

          {insight.recommendedActions && insight.recommendedActions.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.1em', color: t.muted, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Next Actions
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', lineHeight: 1.5 }}>
                {insight.recommendedActions.map((action, idx) => (
                  <li key={idx} style={{ marginBottom: '0.25rem' }}>{action}</li>
                ))}
              </ul>
            </div>
          )}

          {insight.supportingEvidenceIds && insight.supportingEvidenceIds.length > 0 && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${t.borderFaint}` }}>
              <div style={{ fontFamily: 'monospace', fontSize: '0.6rem', color: t.muted }}>
                Supporting Evidence: {insight.supportingEvidenceIds.join(', ')}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
