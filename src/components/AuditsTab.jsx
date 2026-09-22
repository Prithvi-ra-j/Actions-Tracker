import React, { useState, useEffect } from 'react';
import { ACCENT } from '../constants.js';

/**
 * Audits Tab (§32).
 * 
 * Displays historical monthly audits and provides a trigger to run a new one.
 */
export default function AuditsTab({ t }) {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    loadAudits();
  }, []);

  async function loadAudits() {
    try {
      setLoading(true);
      const { getAllAudits } = await import('../database/auditRepository.js');
      const all = await getAllAudits();
      setAudits(all.reverse()); // Show newest first
    } catch (err) {
      console.error(err);
      setError("Failed to load audits.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRunAudit() {
    setGenerating(true);
    setError(null);
    try {
      const { runMonthlyAudit } = await import('../core/ai/auditEngine.js');
      await runMonthlyAudit();
      await loadAudits();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: t.muted }}>Loading Audits...</div>;
  }

  return (
    <>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.25em', color: ACCENT, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            System Audit
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, lineHeight: 1 }}>
            Monthly Reviews
          </div>
        </div>
        
        <button
          onClick={handleRunAudit}
          disabled={generating}
          style={{
            padding: '0.6rem 1rem',
            background: generating ? 'transparent' : ACCENT,
            border: `1px solid ${ACCENT}`,
            color: generating ? ACCENT : '#fff',
            fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase',
            cursor: generating ? 'default' : 'pointer',
          }}
        >
          {generating ? 'Generating...' : '+ Run Audit'}
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: '1.5rem', padding: '0.75rem', background: 'rgba(193,68,44,0.1)', border: '1px solid #c1442c', color: '#c1442c', fontFamily: 'monospace', fontSize: '0.75rem' }}>
          {error}
        </div>
      )}

      {audits.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: t.muted, fontStyle: 'italic', background: t.subtleBg, border: `1px dashed ${t.border}` }}>
          No audits found. Click "Run Audit" to generate the first one.
        </div>
      ) : (
        audits.map(audit => {
          const isExpanded = expandedId === audit.id;
          const startDate = new Date(audit.period.start).toLocaleDateString();
          const endDate = new Date(audit.period.end).toLocaleDateString();
          
          return (
            <div key={audit.id} style={{ marginBottom: '1rem', border: `1px solid ${t.border}`, background: t.subtleBg }}>
              <button
                onClick={() => setExpandedId(isExpanded ? null : audit.id)}
                style={{
                  width: '100%', padding: '1rem', background: 'transparent', border: 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  cursor: 'pointer', color: t.pageText
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                    Audit: {startDate} — {endDate}
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: t.muted, marginTop: '0.3rem' }}>
                    Generated: {new Date(audit.createdAt).toLocaleString()}
                  </div>
                </div>
                <div style={{ fontSize: '1.05rem', color: t.muted }}>
                  {isExpanded ? '−' : '+'}
                </div>
              </button>

              {isExpanded && (
                <div style={{ padding: '0 1rem 1rem 1rem', borderTop: `1px solid ${t.borderFaint}` }}>
                  <AuditSection t={t} title="Wins" items={audit.wins} color="#4f8a5f" />
                  <AuditSection t={t} title="Failures" items={audit.failures} color="#c1442c" />
                  <AuditSection t={t} title="Contradictions" items={audit.contradictions} color="#d99a2b" />
                  <AuditSection t={t} title="Patterns & Risks" items={[...(audit.patterns || []), ...(audit.risks || [])]} color="#4a7ba6" />
                  <AuditSection t={t} title="Recommendations" items={audit.recommendations} color={ACCENT} />
                  <AuditSection t={t} title="Next Period Focus" items={audit.nextPeriodFocus} color={ACCENT} />
                </div>
              )}
            </div>
          );
        })
      )}
    </>
  );
}

function AuditSection({ t, title, items, color }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.15em', color: color, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
        {title}
      </div>
      <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', lineHeight: 1.5, color: t.pageText }}>
        {items.map((item, idx) => (
          <li key={idx} style={{ marginBottom: '0.3rem' }}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
