import React, { useState, useEffect } from 'react';
import { BottomSheet } from './ui/Overlays.jsx';
import { Button } from './ui/Buttons.jsx';
import { EmptyState } from './ui/States.jsx';
import { SegmentedBar } from './ui/Indicators.jsx';
import { EvidenceSheet } from './EvidenceSheet.jsx';
import { Sparkle } from '@phosphor-icons/react';

// Severity stripe colors per design guide
const SEVERITY_COLORS = {
  high:   'var(--danger)',
  medium: 'var(--discipline)',
  low:    'var(--mu)',
};

function FindingCard({ finding, onClick }) {
  const severity = finding.severity?.toLowerCase() || 'medium';
  const stripeColor = SEVERITY_COLORS[severity] || 'var(--mu)';

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--s1)',
        borderRadius: 'var(--r-container)',
        padding: '14px 14px 12px 18px',
        marginBottom: '10px',
        boxShadow: `inset 4px 0 0 ${stripeColor}`,
        cursor: 'pointer',
        transition: 'transform 0.12s',
      }}
      onPointerDown={e => e.currentTarget.style.transform = 'scale(0.99)'}
      onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
      onPointerLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--tx)', flex: 1 }}>
          {finding.type}
        </h3>
        <span style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: '11.5px',
          color: stripeColor,
          fontWeight: 500,
          flexShrink: 0,
          textTransform: 'capitalize',
        }}>
          {severity.charAt(0).toUpperCase() + severity.slice(1)}
        </span>
      </div>
      <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--mu)', lineHeight: 1.5 }}>
        {finding.text}
      </p>
    </div>
  );
}

function FindingSheet({ finding, onClose, onOpenJarvis, ignoreMode, onToggleIgnore, onIgnore }) {
  const severity = finding.severity?.toLowerCase() || 'medium';
  const stripeColor = SEVERITY_COLORS[severity] || 'var(--mu)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top severity bar */}
      <div style={{
        height: '4px',
        background: stripeColor,
        borderRadius: '2px',
        marginTop: '-4px',
      }} />

      <span style={{
        fontFamily: "'Geist Mono', monospace",
        fontSize: '11.5px',
        color: stripeColor,
        fontWeight: 500,
      }}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)} severity
      </span>

      <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600, letterSpacing: '-0.02em' }}>
        {finding.type}
      </h3>

      <div>
        <div style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: '11.5px',
          color: 'var(--mu)',
          marginBottom: '8px',
        }}>
          Finding
        </div>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--tx)', lineHeight: 1.5 }}>
          {finding.text}
        </p>
      </div>

      {/* Possible correction card */}
      <div style={{
        background: 'var(--s2)',
        borderRadius: 'var(--r-control)',
        padding: '12px 14px',
      }}>
        <div style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: '11.5px',
          color: 'var(--mu)',
          marginBottom: '6px',
        }}>
          Possible correction
        </div>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--tx)', lineHeight: 1.5 }}>
          Review the related goal and adjust the target timeline, or send to Jarvis to design a plan.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <Button
          variant="primary"
          style={{ flex: 1, fontSize: '14px' }}
          onClick={() => {
            onClose();
            onOpenJarvis?.({
              page: 'audits',
              entityType: 'finding',
              entityId: finding.id,
              payload: { type: finding.type, text: finding.text, severity },
            });
          }}
        >
          Review fix
        </Button>
        <Button
          variant="secondary"
          style={{ flex: 1, fontSize: '14px' }}
          onClick={() => {
            onClose();
            onOpenJarvis?.({
              page: 'audits',
              entityType: 'finding',
              entityId: finding.id,
              payload: { type: finding.type, text: finding.text, severity },
            });
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkle size={16} />
            Send to Jarvis
          </span>
        </Button>
      </div>
      <Button variant="secondary" style={{ width: '100%' }} onClick={onToggleIgnore}>
        {ignoreMode ? 'Cancel ignore' : 'Ignore finding'}
      </Button>
      {ignoreMode && (
        <div role="group" aria-label="Reason for ignoring finding" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['Not a problem', 'Already handled', 'Remind me later'].map(reason => (
            <Button key={reason} variant="secondary" onClick={() => onIgnore(reason)}>
              {reason}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AuditsTab({ t, onOpenJarvis }) {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('unresolved');
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const [toast, setToast] = useState(null);
  const [ignoreMode, setIgnoreMode] = useState(false);

  useEffect(() => { loadAudits(); }, []);

  async function loadAudits() {
    try {
      setLoading(true);
      const { getAllAudits } = await import('../database/auditRepository.js');
      const all = await getAllAudits();
      setAudits(all.reverse());
    } catch (err) {
      console.error(err);
      setError('Failed to load audits.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRunAudit() {
    setGenerating(true);
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

  // Build findings list from latest audit
  const latestAudit = audits[0] || {};
  const findings = [];
  (latestAudit.contradictions || []).forEach((c, i) =>
    findings.push({ id: `${latestAudit.id}:c_${i}`, type: 'Contradiction', text: c, severity: 'high' }));
  (latestAudit.risks || []).forEach((r, i) =>
    findings.push({ id: `${latestAudit.id}:r_${i}`, type: 'Risk', text: r, severity: 'medium' }));
  (latestAudit.recommendations || []).forEach((r, i) =>
    findings.push({ id: `${latestAudit.id}:rec_${i}`, type: 'Recommendation', text: r, severity: 'low' }));
  const unresolvedFindings = findings.filter(finding => latestAudit.findingStates?.[finding.id]?.status !== 'ignored');
  const resolvedFindings = findings.filter(finding => latestAudit.findingStates?.[finding.id]?.status === 'ignored');

  async function setFindingState(finding, state) {
    const audit = audits[0];
    if (!audit) return;
    const { updateAudit } = await import('../database/auditRepository.js');
    await updateAudit(audit.id, {
      findingStates: { ...(audit.findingStates || {}), [finding.id]: state },
    });
    await loadAudits();
    setSelectedFinding(null);
    setIgnoreMode(false);
    setToast(state.status === 'ignored' ? 'Finding moved to Resolved.' : 'Finding restored.');
  }

  const filters = ['unresolved', 'resolved', 'domain'];

  return (
    <div style={{ padding: '0 14px 24px' }}>

      {/* Filter chips */}
      <div style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        margin: '4px 0 14px',
      }}>
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            style={{
              minHeight: '44px',
              padding: '0 14px',
              display: 'grid',
              placeItems: 'center',
              borderRadius: 'var(--r-chip)',
              background: activeFilter === f
                ? 'color-mix(in srgb, var(--ac) 18%, var(--s1))'
                : 'var(--s1)',
              boxShadow: activeFilter === f
                ? 'inset 0 0 0 1.5px var(--ac)'
                : 'inset 0 0 0 1px var(--hairline)',
              fontSize: '13.5px',
              fontWeight: 500,
              cursor: 'pointer',
              border: 'none',
              color: activeFilter === f ? 'var(--ac)' : 'var(--tx)',
              textTransform: 'capitalize',
              transition: 'all 0.2s',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          marginBottom: '14px',
          padding: '12px 14px',
          background: 'color-mix(in srgb, var(--danger) 15%, transparent)',
          color: 'var(--danger)',
          borderRadius: 'var(--r-control)',
          fontSize: '13px',
        }}>
          {error}
        </div>
      )}

      {/* Findings list */}
      {activeFilter === 'unresolved' && (
        <>
          {loading ? (
            <div style={{ color: 'var(--mu)', fontSize: '14px', padding: '24px 0', textAlign: 'center' }}>
              Loading audits...
            </div>
          ) : unresolvedFindings.length === 0 ? (
            <EmptyState
              title="No findings."
              description="Run an audit to scan your system for contradictions and risks."
              actionLabel={generating ? 'Running...' : 'Run Audit'}
              onAction={handleRunAudit}
            />
          ) : (
            <>
              <div style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: '11.5px',
                color: 'var(--mu)',
                marginBottom: '12px',
              }}>
                {unresolvedFindings.length} issues found
              </div>
              {unresolvedFindings.map(f => (
                <FindingCard
                  key={f.id}
                  finding={f}
                  onClick={() => setSelectedFinding(f)}
                />
              ))}
            </>
          )}
        </>
      )}

      {activeFilter === 'resolved' && (
        resolvedFindings.length === 0 ? (
          <EmptyState title="No resolved findings." description="Ignored findings will appear here." />
        ) : resolvedFindings.map(finding => (
          <div key={finding.id}>
            <FindingCard finding={finding} onClick={() => setSelectedFinding(finding)} />
            <Button variant="secondary" style={{ width: '100%', marginBottom: '10px' }} onClick={() => setFindingState(finding, { status: 'open' })}>
              Restore finding
            </Button>
          </div>
        ))
      )}

      {activeFilter === 'domain' && (
        <div style={{ color: 'var(--mu)', fontSize: '14px', padding: '24px 0', textAlign: 'center' }}>
          Domain-level filtering is unavailable because findings do not yet store a domain association.
        </div>
      )}

      {/* Finding Detail Sheet */}
      <BottomSheet
        isOpen={!!selectedFinding}
        onClose={() => setSelectedFinding(null)}
      >
        {selectedFinding && (
          <FindingSheet
            finding={selectedFinding}
            onClose={() => setSelectedFinding(null)}
            onOpenJarvis={onOpenJarvis}
            ignoreMode={ignoreMode}
            onToggleIgnore={() => setIgnoreMode(value => !value)}
            onIgnore={reason => setFindingState(selectedFinding, {
              status: 'ignored',
              reason,
              updatedAt: new Date().toISOString(),
            })}
          />
        )}
      </BottomSheet>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
          left: '14px',
          right: '14px',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          minHeight: '52px',
          padding: '0 8px 0 16px',
          borderRadius: 'var(--r-container)',
          background: 'var(--tx)',
          color: 'var(--bg)',
          fontSize: '13.5px',
          fontWeight: 500,
        }}>
          {toast}
          <button
            style={{
              marginLeft: 'auto',
              minHeight: '40px',
              background: 'transparent',
              color: 'var(--bg)',
              padding: '0 14px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onClick={() => setToast(null)}
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
