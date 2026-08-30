import React, { useState } from 'react';
import { ACCENT } from '../constants.js';

const LIFE_DIMS = [
  { key: 'body',     label: 'Body & Health',      icon: '⚔' },
  { key: 'mind',     label: 'Mind & Knowledge',   icon: '∞' },
  { key: 'craft',    label: 'Craft & Creativity', icon: '◈' },
  { key: 'strategy', label: 'Strategy & History', icon: '♟' },
];

/**
 * v3.2 Thin Archetype Compiler
 * Wizard that maps a high-level vision into specific, targeted capabilities
 * across the 4 primary life dimensions.
 */
export default function ArchetypeCompiler({ t, vision, onSave, onCancel }) {
  const [step, setStep] = useState(0); // 0 = intro, 1..4 = dimensions
  const [targets, setTargets] = useState({
    body: { targetValue: 50, why: '' },
    mind: { targetValue: 50, why: '' },
    craft: { targetValue: 50, why: '' },
    strategy: { targetValue: 50, why: '' },
  });

  const handleNext = () => {
    if (step < LIFE_DIMS.length) setStep(step + 1);
    else onSave(targets);
  };

  const currentDim = step > 0 ? LIFE_DIMS[step - 1] : null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem', zIndex: 1000,
    }}>
      <div style={{
        background: t.pageBg,
        border: `1px solid ${ACCENT}`,
        borderRadius: '8px',
        padding: '2rem',
        maxWidth: '500px',
        width: '100%',
        color: t.pageText,
      }}>
        {step === 0 && (
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: ACCENT, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>
              Archetype Compiler
            </div>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
              Deconstruct your vision.
            </p>
            <div style={{ padding: '1rem', background: t.subtleBg, fontStyle: 'italic', color: t.muted, marginBottom: '1.5rem', borderLeft: `2px solid ${ACCENT}` }}>
              "{vision || 'No vision set.'}"
            </div>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              To achieve this vision, you need specific capabilities. Let's break this abstract North Star down into concrete target stats for your Body, Mind, Craft, and Strategy.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={onCancel} style={{ background: 'transparent', border: 'none', color: t.muted, cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.8rem', textTransform: 'uppercase' }}>Cancel</button>
              <button onClick={handleNext} style={{ background: ACCENT, color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem', cursor: 'pointer', textTransform: 'uppercase' }}>Begin Compilation →</button>
            </div>
          </div>
        )}

        {step > 0 && currentDim && (
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: ACCENT, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Step {step} of 4 · {currentDim.label}
            </div>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{currentDim.icon}</div>
            
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontFamily: 'monospace', color: t.muted }}>TARGET STAT (1-100)</label>
            <input 
              type="range" min="1" max="100" 
              value={targets[currentDim.key].targetValue}
              onChange={e => setTargets({ ...targets, [currentDim.key]: { ...targets[currentDim.key], targetValue: parseInt(e.target.value, 10) } })}
              style={{ width: '100%', accentColor: ACCENT, marginBottom: '1rem' }}
            />
            <div style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 900, marginBottom: '1.5rem' }}>
              {targets[currentDim.key].targetValue}
            </div>

            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontFamily: 'monospace', color: t.muted }}>WHY DO YOU NEED THIS TO ACHIEVE THE VISION?</label>
            <textarea
              rows={3}
              placeholder="e.g. Need the endurance to run the business without burning out..."
              value={targets[currentDim.key].why}
              onChange={e => setTargets({ ...targets, [currentDim.key]: { ...targets[currentDim.key], why: e.target.value } })}
              style={{ width: '100%', padding: '0.75rem', background: t.invertBg, color: t.invertText, border: 'none', borderRadius: '4px', fontFamily: 'inherit', resize: 'none', marginBottom: '2rem' }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setStep(step - 1)} style={{ background: 'transparent', border: 'none', color: t.muted, cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.8rem', textTransform: 'uppercase' }}>← Back</button>
              <button onClick={handleNext} style={{ background: ACCENT, color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem', cursor: 'pointer', textTransform: 'uppercase' }}>
                {step === 4 ? 'Complete Compilation' : 'Next Dimension →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
