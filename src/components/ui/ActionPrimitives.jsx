import React from 'react';
import { Card } from './Cards.jsx';
import { Button } from './Buttons.jsx';
import { Chip } from './Indicators.jsx';
import { Check, PencilSimple, X } from '@phosphor-icons/react';

export function ImpactChips({ impacts = [] }) {
  // impacts: [{ label: '~ Routine', color: 'var(--mu)' }, { label: 'Body up', color: 'var(--body)' }]
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '8px 0' }}>
      {impacts.map((imp, i) => (
        <span key={i} className="mono" style={{ 
          fontSize: '11.5px', 
          color: imp.color || 'var(--tx)',
          backgroundColor: `color-mix(in srgb, ${imp.color || 'var(--mu)'} 15%, transparent)`,
          padding: 'var(--space-1) var(--space-2)',
          borderRadius: 'var(--radius-chip)'
        }}>
          {imp.label}
        </span>
      ))}
    </div>
  );
}

export function ActionProposalCard({ title, description, impacts = [], onApply, onEdit, onDismiss }) {
  // In a real implementation this would use framer-motion or a custom swipe gesture for swipe-to-apply
  return (
    <Card style={{ border: '1px solid var(--ac)', padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px' }}>
        <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 600 }}>{title}</h4>
        <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--mu)' }}>{description}</p>
        <ImpactChips impacts={impacts} />
      </div>
      <div style={{ display: 'flex', borderTop: '1px solid var(--hairline)' }}>
        <button aria-label="Dismiss proposal" onClick={onDismiss} style={{ flex: 1, padding: '12px', background: 'transparent', border: 'none', color: 'var(--tx)', borderRight: '1px solid var(--hairline)', cursor: 'pointer' }}><X size={16} aria-hidden="true" /> Dismiss</button>
        <button onClick={onEdit} style={{ flex: 1, padding: '12px', background: 'transparent', border: 'none', color: 'var(--tx)', borderRight: '1px solid var(--hairline)', cursor: 'pointer' }}><PencilSimple size={16} aria-hidden="true" /> Edit</button>
        <button onClick={onApply} style={{ flex: 2, padding: '12px', background: 'color-mix(in srgb, var(--ac) 15%, transparent)', border: 'none', color: 'var(--ac)', fontWeight: 600, cursor: 'pointer' }}><Check size={16} aria-hidden="true" /> Apply</button>
      </div>
    </Card>
  );
}

export function Receipt({ title, subtitle, onUndo }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      backgroundColor: 'var(--s1)',
      borderRadius: 'var(--r-control)',
      border: '1px solid var(--hairline)'
    }}>
      <div>
        <div style={{ fontSize: '14px', fontWeight: 500 }}>{title}</div>
        {subtitle && <div style={{ fontSize: '12.5px', color: 'var(--mu)' }}>{subtitle}</div>}
      </div>
      {onUndo && (
        <Button variant="secondary" onClick={onUndo} style={{ minHeight: '32px', height: '32px', padding: '0 12px', fontSize: '13px' }}>
          Undo
        </Button>
      )}
    </div>
  );
}

export function EvidenceCard({ title, date, description, onClick }) {
  return (
    <Card onClick={onClick} style={{ padding: '12px', marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '14px', fontWeight: 500 }}>{title}</span>
        <span className="mono" style={{ fontSize: '11.5px', color: 'var(--mu)' }}>{date}</span>
      </div>
      {description && <div style={{ fontSize: '13px', color: 'var(--mu)' }}>{description}</div>}
    </Card>
  );
}

export function ProvenanceRow({ text, onClick }) {
  return (
    <div 
      onClick={onClick}
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '6px',
        padding: '4px 8px', 
        backgroundColor: 'var(--s1)', 
        borderRadius: '12px',
        cursor: onClick ? 'pointer' : 'default',
        border: '1px solid var(--hairline)'
      }}
    >
      <div style={{ display: 'flex', gap: '2px' }}>
        <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--ac)' }} />
        <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--ac)', opacity: 0.5 }} />
      </div>
      <span className="mono" style={{ fontSize: '11.5px', color: 'var(--mu)' }}>{text}</span>
    </div>
  );
}
