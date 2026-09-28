import React, { useRef, useState, useEffect } from 'react';
import { Card, EntityRow } from './Cards';
import { Button, IconButton } from './Buttons';
import { BottomSheet } from './Overlays';
import { SegmentedBar } from './Indicators';
import { EvidenceSheet } from '../EvidenceSheet.jsx';

export function ActionProposalCard({ proposal, onApply, onEdit, onDismiss, status }) {
  const containerRef = useRef(null);
  const swipeRef = useRef(null);
  const applyThreshold = 120;
  
  // A real swipe-to-apply gesture using pointer events without re-renders.
  useEffect(() => {
    const el = swipeRef.current;
    if (!el || status !== 'pending') return;
    
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    
    const handlePointerDown = (e) => {
      startX = e.clientX;
      isDragging = true;
      el.style.transition = 'none';
      el.setPointerCapture(e.pointerId);
    };
    
    const handlePointerMove = (e) => {
      if (!isDragging) return;
      currentX = Math.max(0, e.clientX - startX); // swipe right only
      el.style.transform = `translateX(${currentX}px)`;
      
      // opacity of background to indicate applying
      if (currentX > applyThreshold) {
        el.style.backgroundColor = 'var(--s2)';
      } else {
        el.style.backgroundColor = 'var(--ac)';
      }
    };
    
    const resetSwipe = () => {
      currentX = 0;
      el.style.transition = 'transform 0.18s ease-out';
      el.style.transform = 'translateX(0px)';
      el.style.backgroundColor = 'var(--ac)';
    };

    const handlePointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      if (el.hasPointerCapture?.(e.pointerId)) {
        el.releasePointerCapture(e.pointerId);
      }
      
      if (currentX >= applyThreshold) {
        el.style.transition = 'transform 0.24s ease-out';
        el.style.transform = `translateX(${Math.min(window.innerWidth, 420)}px)`;
        setTimeout(() => {
          resetSwipe();
          if (onApply) onApply();
        }, 240);
      } else {
        resetSwipe();
      }
    };
    
    el.addEventListener('pointerdown', handlePointerDown);
    el.addEventListener('pointermove', handlePointerMove);
    el.addEventListener('pointerup', handlePointerUp);
    el.addEventListener('pointercancel', handlePointerUp);
    
    return () => {
      resetSwipe();
      el.removeEventListener('pointerdown', handlePointerDown);
      el.removeEventListener('pointermove', handlePointerMove);
      el.removeEventListener('pointerup', handlePointerUp);
      el.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [status, onApply]);

  if (!proposal) return null;

  const actionType = proposal.actionType || proposal.type || 'action';
  const payload = proposal.payload || {};
  const proposalName =
    proposal.name ||
    payload.name ||
    payload.title ||
    payload.label ||
    (actionType === 'complete_onboarding' ? 'Complete Jarvis onboarding' : actionType.replaceAll('_', ' '));
  const proposalDescription = {
    complete_onboarding: 'Saves your profile, focus areas, baseline and desired direction.',
    add_habit: 'Creates a new habit',
    modify_habit: 'Modifies an existing habit',
    add_quest: 'Creates a new quest',
    add_goal: 'Creates a new goal',
    create_plan: 'Creates an approved multi-step plan',
  }[actionType] || 'Proposes a change to your system';

  if (status === 'dismissed') {
    return (
      <div style={{
        padding: '10px 12px',
        borderRadius: '12px',
        background: 'var(--s1)',
        boxShadow: 'inset 0 0 0 1px var(--hairline)',
        color: 'var(--mu)',
        fontSize: '12px',
      }}>
        Proposal dismissed. Your data was not changed.
      </div>
    );
  }

  return (
    <Card style={{ padding: '0', overflow: 'hidden', border: 'none', boxShadow: 'inset 0 0 0 1px var(--ln)' }}>
      <div style={{ padding: '16px' }}>
        <span className="mono" style={{ fontSize: '11.5px', color: 'var(--mu)', textTransform: 'uppercase' }}>
          Proposal
        </span>
        <h3 style={{ fontSize: '17px', margin: '6px 0 2px' }}>{proposalName}</h3>
        <p style={{ fontSize: '13.5px', color: 'var(--mu)', marginBottom: '10px' }}>
          {proposalDescription}
        </p>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <span style={{ padding: '4px 7px', borderRadius: '999px', background: 'var(--s2)', color: 'var(--mu)', fontSize: '10.5px', fontFamily: "'Geist Mono', monospace", textTransform: 'uppercase' }}>
            Risk: {proposal.riskClass || 'confirm'}
          </span>
          <span style={{ padding: '4px 7px', borderRadius: '999px', background: 'var(--s2)', color: 'var(--mu)', fontSize: '10.5px', fontFamily: "'Geist Mono', monospace", textTransform: 'uppercase' }}>
            {proposal.lifecycle || (status === 'pending' ? 'waiting approval' : status || 'proposed')}
          </span>
          {Array.isArray(payload?.systemProposal?.items) && (
            <span style={{ padding: '4px 7px', borderRadius: '999px', background: 'var(--s2)', color: 'var(--mu)', fontSize: '10.5px', fontFamily: "'Geist Mono', monospace" }}>
              {payload.systemProposal.items.length} proposed items
            </span>
          )}
        </div>

        {status === 'pending' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <div 
              ref={containerRef}
              style={{
                flex: 1, 
                position: 'relative', 
                height: '48px', 
                backgroundColor: 'var(--s2)', 
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: 'inset 0 0 0 1px var(--ln)'
              }}
            >
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: '13.5px', color: 'var(--mu)', fontWeight: 500, pointerEvents: 'none' }}>
                Swipe to apply →
              </div>
              <div 
                ref={swipeRef}
                style={{ 
                  position: 'absolute', 
                  left: 0, top: 0, bottom: 0, 
                  width: '72px', 
                  backgroundColor: 'var(--ac)', 
                  borderRadius: '12px',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--on)',
                  cursor: 'grab',
                  touchAction: 'none'
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"></path>
                  <path d="m12 5 7 7-7 7"></path>
                </svg>
              </div>
            </div>
            {onEdit && (
              <Button variant="secondary" onClick={onEdit} style={{ width: '48px', padding: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                </svg>
              </Button>
            )}
            {onDismiss && (
              <Button
                variant="secondary"
                onClick={onDismiss}
                style={{ height: '48px', padding: '0 12px', fontSize: '12px' }}
              >
                Dismiss
              </Button>
            )}
          </div>
        )}

        {status === 'executing' && (
          <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--mu)', fontSize: '14px', fontWeight: 500 }}>
            Applying changes...
          </div>
        )}
        
        {status === 'executed' && (
          <div style={{ padding: '12px 0', color: 'var(--strategy)', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Changes applied
          </div>
        )}

        {status === 'failed' && (
          <div style={{ padding: '12px 0', color: 'var(--danger)', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            Failed to apply. Data is unchanged.
          </div>
        )}
      </div>
    </Card>
  );
}

export function ImpactDetailSheet({ proposal, impact, onApply, onEdit, onDismiss }) {
  const [showEvidence, setShowEvidence] = useState(false);
  
  if (!proposal) return null;
  return (
    <BottomSheet isOpen={!!proposal} onClose={onDismiss}>
      <h3 className="h3">What will change</h3>
      <div style={{ marginTop: '14px', backgroundColor: 'var(--s1)', borderRadius: '16px', padding: '8px', boxShadow: 'inset 0 0 0 1px var(--ln)' }}>
        {proposal.actionType === 'complete_onboarding' ? (
          <>
            <EntityRow
              title="Profile"
              leftElement={<span className="mono" style={{ color: 'var(--ac)' }}>+</span>}
              label="Stores your Jarvis profile and constraints"
            />
            <EntityRow
              title="Focus"
              leftElement={<span className="mono" style={{ color: 'var(--ac)' }}>+</span>}
              label="Stores your selected focus areas"
            />
            <EntityRow
              title="Direction"
              leftElement={<span className="mono" style={{ color: 'var(--ac)' }}>+</span>}
              label="Stores your desired outcomes and baseline"
            />
          </>
        ) : (
          <>
            <EntityRow
              title="Habits"
              leftElement={<span className="mono" style={{ color: 'var(--ac)' }}>+</span>}
              label="1 habit added"
            />
            {impact?.routineDiff && (
              <EntityRow
                title="Routine capacity"
                leftElement={<span className="mono" style={{ color: 'var(--tx)' }}>~</span>}
                label="Affects mornings"
              />
            )}
          </>
        )}
      </div>
      
      {impact && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '12.5px', color: 'var(--mu)', marginBottom: '8px', fontWeight: 500 }}>Weekly capacity</div>
          <SegmentedBar fill={Math.min(10, Math.ceil((impact.capacityAfter || 0) / 10))} total={10} />
          <p style={{ fontSize: '13px', color: 'var(--mu)', marginTop: '8px' }}>
            {impact.capacityBefore}% now, {impact.capacityAfter}% after
          </p>
        </div>
      )}
      
      <p className="mono" style={{ marginTop: '16px', fontSize: '11.5px', color: 'var(--mu)' }}>
        Nothing else will change.
      </p>

      <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
        <Button variant="primary" style={{ flex: 1 }} onClick={onApply}>Apply</Button>
        <Button variant="secondary" style={{ flex: 1 }} onClick={onEdit}>Edit</Button>
        <Button variant="secondary" style={{ flex: 1 }} onClick={() => setShowEvidence(true)}>Based on...</Button>
      </div>
      <EvidenceSheet
        isOpen={showEvidence}
        onClose={() => setShowEvidence(false)}
        title={`Evidence for ${proposal.name}`}
        evidenceItems={proposal.evidence?.map(e => ({ content: e, date: 'Recent' })) || []}
      />
    </BottomSheet>
  );
}

export function EditProposalSheet({ proposal, onSave, onCancel, onDismiss }) {
  const [draft, setDraft] = useState(() => proposal || null);

  useEffect(() => {
    setDraft(proposal || null);
  }, [proposal]);

  if (!proposal || !draft) return null;

  const payload = draft.payload || {};
  const titleKey = payload.title !== undefined ? 'title'
    : payload.label !== undefined ? 'label'
      : payload.name !== undefined ? 'name'
        : null;
  const titleValue = titleKey ? payload[titleKey] : (draft.name || '');

  const updatePayload = (key, value) => {
    setDraft(current => ({
      ...current,
      payload: {
        ...(current.payload || {}),
        [key]: value,
      },
    }));
  };

  const handleSave = () => {
    onSave?.({
      ...draft,
      payload,
      name: titleKey ? undefined : titleValue,
      proposalStatus: 'pending',
      lifecycle: 'waiting_approval',
    });
  };

  return (
    <BottomSheet isOpen={!!proposal} onClose={onDismiss}>
      <h3 className="h3">Edit proposal</h3>
      <p style={{ fontSize: '13.5px', color: 'var(--mu)' }}>
        Change what Jarvis proposed. Nothing is written until you approve it.
      </p>

      <div style={{ marginTop: '16px', display: 'grid', gap: '12px' }}>
        <label style={{ display: 'grid', gap: '6px', fontSize: '13px', fontWeight: 500 }}>
          {titleKey === 'name' ? 'Name' : 'Title'}
          <input
            aria-label={titleKey === 'name' ? 'Proposal name' : 'Proposal title'}
            value={String(titleValue ?? '')}
            onChange={event => {
              if (titleKey) updatePayload(titleKey, event.target.value);
              else setDraft(current => ({ ...current, name: event.target.value }));
            }}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              minHeight: '46px',
              padding: '0 12px',
              borderRadius: '12px',
              border: '1px solid var(--hairline)',
              background: 'var(--s2)',
              color: 'var(--tx)',
            }}
          />
        </label>

        <label style={{ display: 'grid', gap: '6px', fontSize: '13px', fontWeight: 500 }}>
          Description
          <textarea
            aria-label="Proposal description"
            value={String(payload.description ?? '')}
            onChange={event => updatePayload('description', event.target.value)}
            rows={4}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid var(--hairline)',
              background: 'var(--s2)',
              color: 'var(--tx)',
              resize: 'vertical',
              font: 'inherit',
            }}
          />
        </label>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
        <Button variant="primary" style={{ flex: 1 }} onClick={handleSave}>Save edit</Button>
        <Button variant="secondary" style={{ flex: 1 }} onClick={onCancel}>Cancel</Button>
      </div>
    </BottomSheet>
  );
}
