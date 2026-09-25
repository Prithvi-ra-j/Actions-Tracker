import React, { useRef, useState, useEffect } from 'react';
import { ArrowRight, PencilSimple, Check, WarningCircle } from '@phosphor-icons/react';
import { Card, EntityRow } from './Cards';
import { Button, IconButton } from './Buttons';
import { BottomSheet } from './Overlays';
import { SegmentedBar } from './Indicators';
import { EvidenceSheet } from '../EvidenceSheet.jsx';

export function ActionProposalCard({ proposal, onApply, onEdit, status }) {
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
    
    const handlePointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      el.releasePointerCapture(e.pointerId);
      
      if (currentX >= applyThreshold) {
        el.style.transition = 'transform 0.3s ease-out';
        el.style.transform = `translateX(${window.innerWidth}px)`;
        setTimeout(() => {
          if (onApply) onApply();
        }, 300);
      } else {
        el.style.transition = 'transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
        el.style.transform = `translateX(0px)`;
        el.style.backgroundColor = 'var(--ac)';
      }
      currentX = 0;
    };
    
    el.addEventListener('pointerdown', handlePointerDown);
    el.addEventListener('pointermove', handlePointerMove);
    el.addEventListener('pointerup', handlePointerUp);
    el.addEventListener('pointercancel', handlePointerUp);
    
    return () => {
      el.removeEventListener('pointerdown', handlePointerDown);
      el.removeEventListener('pointermove', handlePointerMove);
      el.removeEventListener('pointerup', handlePointerUp);
      el.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [status, onApply]);

  if (!proposal) return null;

  return (
    <Card style={{ padding: '0', overflow: 'hidden', border: 'none', boxShadow: 'inset 0 0 0 1px var(--ln)' }}>
      <div style={{ padding: '16px' }}>
        <span className="mono" style={{ fontSize: '11.5px', color: 'var(--mu)', textTransform: 'uppercase' }}>
          Proposal
        </span>
        <h3 style={{ fontSize: '17px', margin: '6px 0 2px' }}>{proposal.name}</h3>
        <p style={{ fontSize: '13.5px', color: 'var(--mu)', marginBottom: '14px' }}>
          {proposal.type === 'create_habit' && 'Creates a new habit'}
          {proposal.type === 'edit_habit' && 'Modifies existing habit'}
          {proposal.type === 'create_quest' && 'Creates a new quest'}
        </p>

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
      </div>
      
      {impact && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '12.5px', color: 'var(--mu)', marginBottom: '8px', fontWeight: 500 }}>Weekly capacity</div>
          <SegmentedBar value={Math.min(10, Math.ceil((impact.capacityAfter || 0) / 10))} projected={0} segments={10} />
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
  if (!proposal) return null;
  
  // Real implementation would parse proposal schema and render inputs dynamically.
  // For the UI step, we just show a placeholder representation.
  return (
    <BottomSheet isOpen={!!proposal} onClose={onDismiss}>
      <h3 className="h3">Edit proposal</h3>
      <p style={{ fontSize: '13.5px', color: 'var(--mu)' }}>{proposal.name}</p>
      
      <div style={{ marginTop: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>Name</div>
        <div style={{ 
          minHeight: '48px', display: 'flex', alignItems: 'center', padding: '0 14px', 
          backgroundColor: 'var(--s2)', borderRadius: '12px', boxShadow: 'inset 0 0 0 1px var(--ln)'
        }}>
          {proposal.name}
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
        <Button variant="primary" style={{ flex: 1 }} onClick={onSave}>Apply changes</Button>
        <Button variant="secondary" style={{ flex: 1 }} onClick={onCancel}>Cancel</Button>
      </div>
    </BottomSheet>
  );
}
