import React from 'react';
import { BottomSheet } from './ui/Overlays';

export function EvidenceSheet({ isOpen, onClose, title, evidenceIds = [], evidenceItems = [] }) {
  if (!isOpen) return null;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '16px' }}>
        <h3 style={{ font: '600 22px/1.15 var(--f)', letterSpacing: '-.02em', margin: '4px 0 2px' }}>
          Based on...
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--mu)', marginBottom: '14px' }}>
          {title || "Supporting evidence for this conclusion."}
        </p>
        
        {evidenceItems.length === 0 && evidenceIds.length === 0 ? (
          <div style={{ padding: '16px', background: 'var(--s1)', borderRadius: '12px', fontStyle: 'italic', color: 'var(--mu)', fontSize: '13px', textAlign: 'center' }}>
            No explicit references available.
          </div>
        ) : (
          <div className="grp" style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px var(--ln)', background: 'var(--s1)' }}>
            {(evidenceItems.length > 0 ? evidenceItems : evidenceIds.map(id => ({ id, text: `Evidence ${id.slice(-6)}` }))).map((item, idx, arr) => (
              <div key={item.id || idx} style={{ padding: '12px 14px', borderBottom: idx < arr.length - 1 ? '1px solid var(--ln)' : 'none' }}>
                <b style={{ display: 'block', font: '500 14.5px var(--f)' }}>{item.text || item.content}</b>
                <span style={{ font: '500 11.5px "Geist Mono", monospace', color: 'var(--mu)' }}>
                  {item.source || 'Log'} • {item.date || 'Recent'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
