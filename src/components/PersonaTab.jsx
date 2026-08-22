import React from 'react';
import { PERSONA, ACCENT } from '../constants.js';
import BookTracker from './BookTracker.jsx';
import GymLog from './GymLog.jsx';
import { getThresholdTitle } from '../helpers/statsEngine.js';

const AXIS_META = {
  strength:   { label: 'Strength',   color: '#c1442c' },
  discipline: { label: 'Discipline', color: '#c1442c' },
  knowledge:  { label: 'Knowledge',  color: '#4a7ba6' },
  wisdom:     { label: 'Wisdom',     color: '#4a7ba6' },
  creativity: { label: 'Creativity', color: '#d99a2b' },
  strategy:   { label: 'Strategy',   color: '#4f8a5f' },
};

/**
 * The Man / Persona tab.
 *
 * Props:
 *   t         — current theme object
 *   stats     — { strength, discipline, knowledge, wisdom, creativity, strategy }  (0-99)
 *   allQuests — questBoard items array
 */
export default function PersonaTab({ t, stats = {}, allQuests = [] }) {
  return (
    <>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', letterSpacing: '0.3em', color: '#c1442c', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          December 31, 2026
        </div>
        <div style={{ fontSize: 'clamp(2rem, 8vw, 3.5rem)', fontWeight: 900, lineHeight: 0.95, letterSpacing: '-0.02em', marginBottom: '1.5rem' }}>
          Prithvi.<br />
          <span style={{ fontStyle: 'italic', color: '#c1442c' }}>Remade.</span>
        </div>
      </div>

      {PERSONA.map((p, i) => (
        <div key={i} style={{
          padding: '1.25rem 0',
          borderBottom: `1px solid ${t.border}`,
          display: 'grid',
          gridTemplateColumns: '1.5rem 1fr',
          gap: '1rem',
          alignItems: 'start',
        }}>
          <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: ACCENT, paddingTop: '0.35rem' }}>
            {String(i + 1).padStart(2, '0')}
          </span>
          <p style={{ fontSize: '1rem', lineHeight: 1.75 }}>{p}</p>
        </div>
      ))}

      <div style={{ marginTop: '2rem', background: t.invertBg, color: t.invertText, padding: '1.5rem' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', letterSpacing: '0.25em', color: ACCENT, textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          The Question You Will Answer In December
        </div>
        <p style={{ fontSize: '0.95rem', fontStyle: 'italic', lineHeight: 1.75, color: t.invertMuted85 }}>
          "Who were you in August 2026, and who are you now?"
        </p>
        <div style={{ marginTop: '1.25rem', height: 1, background: t.invertDivider }} />
        <p style={{ marginTop: '1.25rem', fontSize: '0.8rem', fontStyle: 'italic', lineHeight: 1.7, color: t.invertMuted50 }}>
          Write this answer on December 31. One paragraph. Honest. That paragraph is the real measure of everything.
        </p>
      </div>

      <div style={{ marginTop: '1.5rem', padding: '1.1rem', border: `1px solid ${t.border}`, borderLeft: `4px solid ${ACCENT}` }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', letterSpacing: '0.25em', color: t.muted, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          What You Want People To Feel
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
          {[
            "The most interesting person in the room.",
            "Calm. Completely unshakeable.",
            "Someone who has actually lived and done things.",
            "Someone you can trust with anything.",
          ].map((q, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.88rem' }}>
              <span style={{ color: ACCENT, fontSize: '0.7rem' }}>✦</span>
              <span>{q}</span>
            </div>
          ))}
        </div>
        <p style={{ marginTop: '1rem', fontSize: '0.78rem', fontStyle: 'italic', color: t.muted, lineHeight: 1.65 }}>
          All four. Not one or two. All four. This is why you cannot afford to neglect any domain — each one builds a different facet of the same man.
        </p>
      </div>

      <div style={{ marginTop: '3rem' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', letterSpacing: '0.25em', color: ACCENT, textTransform: 'uppercase', marginBottom: '1rem' }}>
          Character Stats · Phase 2 Preview
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1.5rem' }}>
          {Object.entries(AXIS_META).map(([axis, meta]) => {
            const val = Math.round(stats[axis] ?? 0);
            const title = getThresholdTitle(axis, val);
            const axisQuests = allQuests.filter(q => q.axis === axis);
            return (
              <div key={axis} style={{ padding: '0.85rem', background: t.subtleBg, borderLeft: `3px solid ${meta.color}` }}>
                <div style={{ fontFamily: 'monospace', fontSize: '0.62rem', letterSpacing: '0.15em', color: meta.color, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                  {meta.label}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '1.6rem', fontWeight: 900, color: t.pageText }}>{val}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.62rem', color: t.muted }}>{title}</span>
                </div>
                {/* stat bar */}
                <div style={{ marginTop: '0.4rem', height: 3, background: t.trackBg2, borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${val}%`, background: meta.color, borderRadius: 3, transition: 'width 0.4s ease' }} />
                </div>
                {/* quest mini-list */}
                {axisQuests.map(q => (
                  <div key={q.id} style={{ marginTop: '0.4rem', fontSize: '0.65rem', color: t.muted, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{q.title}</span>
                    <span style={{ fontFamily: 'monospace', flexShrink: 0, marginLeft: '0.5rem', color: q.done ? ACCENT : t.muted }}>
                      {q.done ? '✓' : `${Math.round(q.currentValue)}/${q.targetValue}`}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: ACCENT, textTransform: 'uppercase', marginBottom: '1rem' }}>
          Data Entry (Phase 1 Testing)
        </div>
        <BookTracker t={t} />
        <GymLog t={t} />
      </div>
    </>
  );
}
