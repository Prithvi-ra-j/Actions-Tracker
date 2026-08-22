import React, { useState } from 'react';
import { GOALS } from '../constants.js';
import { addLog } from '../database/logsRepository.js';
import { localDateStr } from '../helpers/dateHelpers.js';
import { ACCENT } from '../constants.js';

/**
 * ProofFearCheckin — monthly Layer-4 check-in that resurfaces the proof/fear
 * copy per domain and asks a 3-way self-tag (spec §12).
 *
 * Cycles through all 4 GOALS domains in sequence, logging one
 * 'proof_check_in' entry per domain.
 *
 * Props:
 *   onComplete  — () => void  — called after all 4 domains are tagged
 */

// Maps GOALS domain index to the primary stat axis for the log entry
const DOMAIN_AXIS = ['discipline', 'knowledge', 'creativity', 'strategy'];

const TAGS = [
  { id: 'still_true',      label: 'Still True',      icon: '✓', desc: 'I am genuinely on this path.' },
  { id: 'getting_closer',  label: 'Getting Closer',  icon: '→', desc: 'Progress is real but incomplete.' },
  { id: 'no_change',       label: 'No Change',       icon: '·', desc: 'Honest — nothing meaningful happened here.' },
];

export default function ProofFearCheckin({ onComplete }) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const domain = GOALS[step];
  const axis = DOMAIN_AXIS[step];
  const isLast = step === GOALS.length - 1;

  async function handleTag(tagId) {
    if (submitting) return;
    setSelected(tagId);
    setSubmitting(true);

    await addLog({
      axis,
      type: 'proof_check_in',
      value: tagId === 'still_true' ? 2 : tagId === 'getting_closer' ? 1 : 0,
      date: localDateStr(),
      meta: {
        domain: domain.domain,
        tag: tagId,
        proof: domain.proof,
        fear: domain.fear,
      },
    });

    await new Promise(r => setTimeout(r, 420)); // brief pause for visual feedback

    if (isLast) {
      onComplete();
    } else {
      setStep(s => s + 1);
      setSelected(null);
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9990,
      background: '#0e0c0b',
      display: 'flex',
      flexDirection: 'column',
      padding: '2rem 1.5rem',
      overflowY: 'auto',
      animation: 'checkinFadeIn 0.4s ease forwards',
    }}>
      {/* Progress dots */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', alignSelf: 'flex-start' }}>
        {GOALS.map((_, i) => (
          <div
            key={i}
            style={{
              width: i < step ? 20 : i === step ? 28 : 8,
              height: 4,
              borderRadius: 4,
              background: i <= step ? domain.color : 'rgba(255,255,255,0.12)',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div style={{
        fontFamily: 'monospace',
        fontSize: '0.42rem',
        letterSpacing: '0.35em',
        color: 'rgba(255,255,255,0.3)',
        textTransform: 'uppercase',
        marginBottom: '0.5rem',
      }}>
        Monthly Check-In
      </div>

      {/* Domain identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{domain.icon}</span>
        <div>
          <div style={{
            fontSize: '1.3rem',
            fontWeight: 900,
            color: '#f7f3ec',
            letterSpacing: '-0.01em',
            lineHeight: 1,
          }}>
            {domain.domain}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.42rem', color: domain.color, textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: 2 }}>
            {domain.label}
          </div>
        </div>
      </div>

      {/* Proof box */}
      <div style={{
        padding: '1.25rem',
        borderLeft: `3px solid ${domain.color}`,
        background: 'rgba(255,255,255,0.03)',
        marginBottom: '1rem',
      }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.38rem', letterSpacing: '0.2em', color: domain.color, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          The Proof You're After
        </div>
        <p style={{ fontSize: '0.9rem', color: '#f7f3ec', lineHeight: 1.7, fontStyle: 'italic' }}>
          "{domain.proof}"
        </p>
      </div>

      {/* Fear/reminder box */}
      <div style={{
        padding: '1.25rem',
        borderLeft: '3px solid rgba(255,255,255,0.12)',
        background: 'rgba(255,255,255,0.02)',
        marginBottom: '2.5rem',
      }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.38rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          Reminder
        </div>
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, fontStyle: 'italic' }}>
          {domain.fear}
        </p>
      </div>

      {/* 3-way tags */}
      <div style={{ fontFamily: 'monospace', fontSize: '0.42rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
        Where are you with this?
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {TAGS.map(tag => {
          const isSelected = selected === tag.id;
          return (
            <button
              key={tag.id}
              onClick={() => handleTag(tag.id)}
              disabled={submitting}
              style={{
                padding: '1rem 1.25rem',
                background: isSelected ? domain.color : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isSelected ? domain.color : 'rgba(255,255,255,0.1)'}`,
                color: isSelected ? '#0e0c0b' : '#f7f3ec',
                cursor: submitting ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                textAlign: 'left',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 900, minWidth: '1rem' }}>
                {tag.icon}
              </span>
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {tag.label}
                </div>
                <div style={{ fontSize: '0.72rem', marginTop: '0.15rem', opacity: isSelected ? 0.8 : 0.5 }}>
                  {tag.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Skip */}
      <button
        onClick={onComplete}
        style={{ marginTop: '1.5rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.4rem', letterSpacing: '0.15em', textTransform: 'uppercase', textAlign: 'center', padding: '0.5rem' }}
      >
        Skip check-in
      </button>

      <style>{`
        @keyframes checkinFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>
    </div>
  );
}
