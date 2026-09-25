import React, { useState, useEffect } from 'react';
import { Card } from './ui/Cards';
import { BottomSheet } from './ui/Overlays';
import { EvidenceSheet } from './EvidenceSheet.jsx';
import { ContextualJarvisCTA } from './ui/Buttons.jsx';
import { MagicWand } from '@phosphor-icons/react';

export default function AuditsTab({ t, onOpenJarvis }) {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  
  const [activeTab, setActiveTab] = useState('unresolved');
  const [sheet, setSheet] = useState(null);
  const [toast, setToast] = useState(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const [ignoredIds, setIgnoredIds] = useState(new Set());

  useEffect(() => {
    loadAudits();
  }, []);

  async function loadAudits() {
    try {
      setLoading(true);
      const { getAllAudits } = await import('../database/auditRepository.js');
      const all = await getAllAudits();
      setAudits(all.reverse());
      const { getAllFacts } = await import('../database/factsRepository.js');
      const resolutions = (await getAllFacts()).filter(f => f.type === 'audit_finding_resolution' && f.meta?.status === 'ignored');
      setIgnoredIds(new Set(resolutions.map(f => f.objectId)));
    } catch (err) {
      console.error(err);
      setError("Failed to load audits.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRunAudit() {
    setGenerating(true);
    setSheet({ type: 'progress' });
    try {
      const { runMonthlyAudit } = await import('../core/ai/auditEngine.js');
      await runMonthlyAudit();
      await loadAudits();
      setSheet(null);
    } catch (err) {
      setError(err.message);
      setSheet(null);
    } finally {
      setGenerating(false);
    }
  }

  const latestAudit = audits[0] || {};
  const findings = [];
  
  if (latestAudit) {
    (latestAudit.contradictions || []).forEach((c, i) => findings.push({ id: `c_${i}`, type: 'Contradiction', text: c }));
    (latestAudit.risks || []).forEach((r, i) => findings.push({ id: `r_${i}`, type: 'Risk', text: r }));
    (latestAudit.recommendations || []).forEach((r, i) => findings.push({ id: `rec_${i}`, type: 'Recommendation', text: r }));
  }

  const showIgnoreSheet = (finding) => {
    setSheet({ type: 'ignore', finding });
  };

  const handleIgnore = async () => {
    if (!sheet?.finding) return;
    const finding = sheet.finding;
    const { addFact } = await import('../database/factsRepository.js');
    await addFact({ type: 'audit_finding_resolution', objectId: finding.id, value: 1, meta: { status: 'ignored', findingType: finding.type, text: finding.text } });
    setIgnoredIds(prev => new Set([...prev, finding.id]));
    setSheet(null);
    setToast('Finding ignored.');
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="ph" data-t="Audits" style={{ width: '100%', height: '100%', backgroundColor: 'var(--bg)', color: 'var(--tx)', fontFamily: 'var(--f)', display: 'flex', flexDirection: 'column' }}>
      <div className="hd" style={{ display: 'flex', alignItems: 'flex-end', padding: '26px 18px 12px' }}>
        <div>
          <h2 style={{ font: '600 26px/1.1 var(--f)', letterSpacing: '-.02em' }}>Audits</h2>
          <p style={{ fontSize: '13px', color: 'var(--mu)' }}>{findings.filter(f => !ignoredIds.has(f.id)).length} open, {findings.filter(f => ignoredIds.has(f.id)).length} resolved</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ContextualJarvisCTA label="Ask Jarvis" contextIcon={<MagicWand size={16} />} onClick={() => onOpenJarvis?.({ page: 'audits', entityType: 'audit', entityId: latestAudit?.id || null })} />
          <span 
          className="pill" 
          style={{ marginLeft: 'auto', font: '500 11.5px "Geist Mono", monospace', color: 'var(--mu)', padding: '9px 12px', borderRadius: '12px', boxShadow: 'inset 0 0 0 1px var(--ln)', cursor: 'pointer' }}
          onClick={handleRunAudit}
        >
          {generating ? 'Running...' : 'Run Audit'}
          </span>
        </div>
      </div>
      
      <div className="bd" style={{ padding: '0 14px', flex: 1, overflowY: 'auto' }}>
        {error && (
          <div style={{ marginBottom: '14px', padding: '12px', background: 'rgba(229, 72, 77, 0.1)', color: '#e5484d', borderRadius: '12px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '4px 0 14px' }}>
          {['unresolved', 'resolved', 'domain'].map(tab => (
            <div 
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{ 
                minHeight: '44px', padding: '0 14px', display: 'grid', placeItems: 'center', 
                borderRadius: '10px', background: activeTab === tab ? 'color-mix(in srgb, var(--ac) 18%, var(--s1))' : 'var(--s1)', 
                boxShadow: activeTab === tab ? 'inset 0 0 0 1.5px var(--ac)' : 'inset 0 0 0 1px var(--ln)', 
                font: '500 13.5px var(--f)', cursor: 'pointer', textTransform: 'capitalize'
              }}>
              {tab}
            </div>
          ))}
        </div>

        {activeTab === 'unresolved' && (
          <>
            {findings.filter(f => !ignoredIds.has(f.id)).length === 0 && !loading && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--mu)' }}>
                No findings. Run an audit to generate one.
              </div>
            )}
            
            {findings.filter(f => !ignoredIds.has(f.id)).map(f => (
              <div key={f.id} style={{ background: 'var(--s1)', borderRadius: '16px', padding: '14px 14px 12px 18px', marginBottom: '10px', boxShadow: 'inset 4px 0 0 var(--mu)' }} onClick={() => showIgnoreSheet(f)}>
                <h3 style={{ font: '600 15px var(--f)' }}>{f.type}</h3>
                <p style={{ fontSize: '12.5px', color: 'var(--mu)', marginTop: '2px' }}>{f.text}</p>
                <div style={{ display: 'flex', marginTop: '8px' }}>
                  <span style={{ font: '500 11.5px "Geist Mono", monospace', color: 'var(--mu)' }}>Unresolved</span>
                  <button style={{ marginLeft: 'auto', border: 'none', background: 'transparent', color: 'var(--tx)', font: '500 11.5px "Geist Mono", monospace' }} onClick={(e) => { e.stopPropagation(); showIgnoreSheet(f); }}>Review ›</button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {toast && (
        <div style={{ position: 'absolute', left: '14px', right: '14px', bottom: '78px', zIndex: 4, display: 'flex', alignItems: 'center', minHeight: '52px', padding: '0 6px 0 14px', borderRadius: '12px', background: 'var(--s2)', boxShadow: 'inset 0 0 0 1px var(--ln)', fontSize: '13.5px' }}>
          {toast}
          <button style={{ marginLeft: 'auto', minHeight: '40px', background: 'var(--s1)', color: 'var(--tx)', padding: '0 14px', borderRadius: '8px', border: 'none', font: '600 13px var(--f)', cursor: 'pointer' }} onClick={() => setToast(null)}>Undo</button>
        </div>
      )}

      {sheet?.type === 'progress' && (
        <BottomSheet isOpen={true} onClose={() => {}}>
          <h3 style={{ font: '600 22px/1.15 var(--f)', letterSpacing: '-.02em', margin: '4px 0 2px' }}>Auditing your system</h3>
          <p style={{ fontSize: '13px', color: 'var(--mu)' }}>This reads your data and changes nothing.</p>
          <div style={{ display: 'flex', gap: '3px', margin: '14px 0' }}>
            <i style={{ flex: 1, height: '8px', background: 'var(--ac)' }}></i>
            <i style={{ flex: 1, height: '8px', background: 'var(--ln)' }}></i>
            <i style={{ flex: 1, height: '8px', background: 'var(--ln)' }}></i>
          </div>
          <div className="grp" style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px var(--ln)', background: 'var(--s1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', minHeight: '52px', padding: '0 14px', borderBottom: '1px solid var(--ln)', font: '500 14.5px var(--f)' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: 'var(--ac)', color: 'var(--on)', display: 'grid', placeItems: 'center', marginRight: '12px' }}>✓</div>
              Goals
            </div>
            <div style={{ display: 'flex', alignItems: 'center', minHeight: '52px', padding: '0 14px', borderBottom: '1px solid var(--ln)', font: '500 14.5px var(--f)' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: 'var(--ac)', color: 'var(--on)', display: 'grid', placeItems: 'center', marginRight: '12px' }}>✓</div>
              Routine and capacity
            </div>
            <div style={{ display: 'flex', alignItems: 'center', minHeight: '52px', padding: '0 14px', font: '500 14.5px var(--f)' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '8px', boxShadow: 'inset 0 0 0 2px var(--mu)', display: 'grid', placeItems: 'center', marginRight: '12px' }}></div>
              Habits<span style={{ marginLeft: 'auto', font: '500 12px "Geist Mono", monospace', color: 'var(--ac)' }}>Running</span>
            </div>
          </div>
        </BottomSheet>
      )}

      {sheet?.type === 'ignore' && (
        <BottomSheet isOpen={true} onClose={() => setSheet(null)}>
          <h3 style={{ font: '600 22px/1.15 var(--f)', letterSpacing: '-.02em', margin: '4px 0 2px' }}>Ignore this finding?</h3>
          <p style={{ fontSize: '13px', color: 'var(--mu)' }}>{sheet.finding.type}</p>
          
          <div style={{ font: '500 12.5px var(--f)', color: 'var(--mu)', margin: '16px 4px 8px' }}>Reason</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '4px 0 14px' }}>
            <div style={{ minHeight: '44px', padding: '0 14px', display: 'grid', placeItems: 'center', borderRadius: '10px', background: 'color-mix(in srgb, var(--ac) 18%, var(--s1))', boxShadow: 'inset 0 0 0 1.5px var(--ac)', font: '500 13.5px var(--f)' }}>Not a problem</div>
            <div style={{ minHeight: '44px', padding: '0 14px', display: 'grid', placeItems: 'center', borderRadius: '10px', background: 'var(--s1)', boxShadow: 'inset 0 0 0 1px var(--ln)', font: '500 13.5px var(--f)' }}>Already handled</div>
            <div style={{ minHeight: '44px', padding: '0 14px', display: 'grid', placeItems: 'center', borderRadius: '10px', background: 'var(--s1)', boxShadow: 'inset 0 0 0 1px var(--ln)', font: '500 13.5px var(--f)' }}>Remind me later</div>
          </div>
          
          <p style={{ fontSize: '13px', color: 'var(--mu)' }}>Ignored findings move to Resolved and can be restored.</p>
          
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            <button style={{ flex: 1, minHeight: '48px', borderRadius: '12px', background: 'var(--ac)', color: 'var(--on)', font: '600 14px var(--f)', border: 'none', cursor: 'pointer' }} onClick={handleIgnore}>Ignore</button>
            <button style={{ flex: 1, minHeight: '48px', borderRadius: '12px', background: 'var(--s2)', color: 'var(--tx)', font: '600 14px var(--f)', border: 'none', cursor: 'pointer' }} onClick={() => setShowEvidence(true)}>Based on...</button>
          </div>
        </BottomSheet>
      )}

      <EvidenceSheet
        isOpen={showEvidence}
        onClose={() => setShowEvidence(false)}
        title={`Evidence for ${sheet?.finding?.type}`}
        evidenceItems={[{ content: sheet?.finding?.text, date: 'Recent' }]}
      />
    </div>
  );
}
