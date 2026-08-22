import React, { useState } from 'react';
import { addLog } from '../database/logsRepository.js';
import { ACCENT } from '../constants.js';
import { localDateStr } from '../helpers/dateHelpers.js';

const AXES = ['strength', 'discipline', 'knowledge', 'wisdom', 'creativity', 'strategy'];

export default function OnboardingScreen({ t, onComplete }) {
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState({});

  const currentAxis = AXES[step];

  const handleNext = async (score) => {
    const newScores = { ...scores, [currentAxis]: score };
    setScores(newScores);

    if (step < AXES.length - 1) {
      setStep(step + 1);
    } else {
      // Save logs
      const today = localDateStr();
      for (const axis of AXES) {
        await addLog({
          axis,
          type: 'onboarding_assessment',
          value: newScores[axis],
          date: today,
          meta: {}
        });
      }
      onComplete();
    }
  };

  return (
    <div style={{ background: t.pageBg, color: t.pageText, minHeight: '100dvh', padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <h1 style={{ fontFamily: 'monospace', fontSize: '1.2rem', textTransform: 'uppercase', color: ACCENT }}>Initial Assessment</h1>
      <p style={{ marginTop: '1rem', color: t.muted, lineHeight: 1.6 }}>
        Rate your current baseline in <strong>{currentAxis.toUpperCase()}</strong> (0 - 100).
      </p>
      
      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
        {[0, 20, 40, 60, 80, 100].map(val => (
          <button 
            key={val} 
            onClick={() => handleNext(val)}
            style={{ 
              padding: '1rem', 
              background: t.subtleBg, 
              border: `1px solid ${t.border}`, 
              color: t.pageText, 
              cursor: 'pointer',
              flex: '1 1 30%',
              fontFamily: 'monospace',
              fontSize: '1.2rem',
            }}
          >
            {val}
          </button>
        ))}
      </div>
    </div>
  );
}
