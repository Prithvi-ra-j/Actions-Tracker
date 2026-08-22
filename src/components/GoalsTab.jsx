import React from 'react';
import { GOALS, ACCENT, hexRgb } from '../constants.js';
import { getDaysUntilYearEnd } from '../helpers/dateHelpers.js';

/**
 * Goals tab — existing four goal domains with expandable target checklists.
 * Preserves the original design exactly; checkboxes now persist via IndexedDB.
 *
 * Props:
 *   t             — current theme object
 *   dark          — boolean, dark mode flag
 *   goalChecks    — { "gi-ti": boolean }
 *   onToggle(key) — called when a target checkbox is tapped
 *   expanded      — currently expanded goal index (null = all collapsed)
 *   setExpanded   — setter for expanded
 */
export default function GoalsTab({ t, dark, goalChecks, onToggle, expanded, setExpanded }) {
  const totalTargets = GOALS.reduce((a, g) => a + g.targets.length, 0);
  const doneTargets  = Object.values(goalChecks).filter(Boolean).length;

  return (
    <>
      {/* ── Starting point banner ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: t.subtleBg, borderLeft: `3px solid ${ACCENT}` }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.25em', color: ACCENT, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
          Your Starting Point
        </div>
        <p style={{ fontSize: '0.85rem', fontStyle: 'italic', color: t.muted, lineHeight: 1.7 }}>
          August 23, 2026. Inconsistent body. Creative dormant since school. Rarely reads. Narrowly specialized at work.{' '}
          <strong style={{ fontStyle: 'normal', color: t.pageText }}>{getDaysUntilYearEnd()} days until December 31.</strong>
        </p>
      </div>

      {/* ── Fear callout ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.75rem', padding: '1rem 1.1rem', background: t.invertBg, color: t.invertText }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.25em', color: ACCENT, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
          Your Real Fear
        </div>
        <p style={{ fontSize: '0.88rem', lineHeight: 1.7, color: t.invertMuted80 }}>
          Spreading too thin and mastering nothing. The antidote is not doing less — it is{' '}
          <em>rotating deliberately</em>. One domain per morning. Every domain gets its day. Depth accumulates in each lane separately. This is how you get all four without losing any.
        </p>
      </div>

      {/* ── Goal cards ────────────────────────────────────────────────────────── */}
      {GOALS.map((g, gi) => {
        const isOpen = expanded === gi;
        const doneCt = g.targets.filter((_, ti) => goalChecks[`${gi}-${ti}`]).length;

        return (
          <div key={gi} style={{ marginBottom: '0.75rem', border: `1px solid ${isOpen ? g.color : t.border}`, borderLeft: `4px solid ${g.color}`, overflow: 'hidden' }}>

            {/* Card header */}
            <div
              id={`goal-card-${gi}`}
              onClick={() => setExpanded(isOpen ? null : gi)}
              style={{ padding: '1.1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.25em', color: g.color, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  {g.label} · {g.domain}
                </div>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>{g.end}</div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: t.muted }}>
                  {doneCt}/{g.targets.length} targets checked
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                {/* Mini progress dots */}
                <div style={{ display: 'flex', gap: 3 }}>
                  {g.targets.map((_, ti) => (
                    <div key={ti} style={{ width: 6, height: 6, borderRadius: '50%', background: goalChecks[`${gi}-${ti}`] ? g.color : t.checkboxBorder }} />
                  ))}
                </div>
                <span style={{ fontFamily: 'monospace', color: t.muted, fontSize: '1rem', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>›</span>
              </div>
            </div>

            {/* Expanded content */}
            {isOpen && (
              <div style={{ borderTop: `1px solid ${t.borderFaint}`, padding: '0 1.1rem 1.1rem' }}>
                {/* Start / End grid */}
                <div style={{ marginTop: '1rem', marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.78rem' }}>
                  <div style={{ padding: '0.6rem', background: t.subtleBg }}>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.15em', color: t.muted, marginBottom: '0.25rem' }}>WHERE YOU START</div>
                    <div style={{ fontStyle: 'italic', color: t.muted }}>{g.start}</div>
                  </div>
                  <div style={{ padding: '0.6rem', background: `rgba(${hexRgb(g.color)}, ${dark ? 0.12 : 0.05})` }}>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.15em', color: g.color, marginBottom: '0.25rem' }}>WHERE YOU END</div>
                    <div style={{ fontStyle: 'italic', color: t.pageText }}>{g.end}</div>
                  </div>
                </div>

                <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.2em', color: t.muted, textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  Specific Targets
                </div>

                {/* Target checkboxes */}
                {g.targets.map((tg, ti) => {
                  const key   = `${gi}-${ti}`;
                  const done  = !!goalChecks[key];
                  return (
                    <div
                      key={ti}
                      id={`goal-target-${key}`}
                      onClick={() => onToggle(key)}
                      style={{
                        display: 'grid', gridTemplateColumns: 'auto 1fr auto',
                        gap: '0.75rem', padding: '0.75rem 0',
                        borderBottom: `1px solid ${t.borderFaint}`,
                        cursor: 'pointer', alignItems: 'start',
                      }}
                    >
                      <div style={{
                        minWidth: 44, minHeight: 44, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <div style={{
                          width: 20, height: 20,
                          border: `2px solid ${done ? g.color : t.checkboxBorder}`,
                          borderRadius: 4,
                          background: done ? g.color : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          transform: done ? 'scale(1.15)' : 'scale(1)',
                        }}>
                          {done && <span style={{ color: 'white', fontSize: '0.75rem' }}>✓</span>}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.88rem', lineHeight: 1.6, textDecoration: done ? 'line-through' : 'none', color: done ? t.muted : t.pageText }}>
                        {tg.text}
                      </span>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: g.color, letterSpacing: '0.08em', whiteSpace: 'nowrap', paddingTop: 2 }}>
                        {tg.metric}
                      </span>
                    </div>
                  );
                })}

                {/* How You'll Know */}
                <div style={{ marginTop: '1rem', padding: '0.85rem', background: t.subtleBg, borderLeft: `2px solid ${g.color}` }}>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.15em', color: g.color, marginBottom: '0.3rem', textTransform: 'uppercase' }}>How You'll Know</div>
                  <p style={{ fontSize: '0.82rem', fontStyle: 'italic', color: t.muted, lineHeight: 1.65 }}>{g.proof}</p>
                </div>

                {/* Watch Out For */}
                <div style={{ marginTop: '0.75rem', padding: '0.85rem', background: t.subtleBg }}>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.15em', color: t.muted, marginBottom: '0.3rem', textTransform: 'uppercase' }}>Watch Out For</div>
                  <p style={{ fontSize: '0.82rem', fontStyle: 'italic', color: t.muted, lineHeight: 1.65 }}>{g.fear}</p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
