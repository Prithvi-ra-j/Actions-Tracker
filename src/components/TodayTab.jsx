import React, { useMemo, useState, useEffect } from 'react';
import { getDailyItems, ACCENT } from '../constants.js';
import { localDateStr, formatDisplayDate, getCurrentWeekDates, WEEK_LABELS } from '../helpers/dateHelpers.js';
import SundayReflection from './SundayReflection.jsx';
import EvidencePrompt from './EvidencePrompt.jsx';
import { GITA_QUOTES } from '../data/quotes.js';

/**
 * Today tab — daily task checklist and weekly row.
 *
 * Props:
 *   t               — current theme object
 *   allLogs         — array of all event logs
 *   evaluations     — map of targetRef -> fact
 *   onToggle(id)    — called when user taps a task
 *   onEvaluate      — (targetRef, data) => Promise<void>
 *   onGoToGoals()   — called when user taps the "Open full goals" button
 */
export default function TodayTab({ t, allLogs, evaluations, onToggle, onEvaluate, onGoToGoals, hasSundayReflection, onSundayReflection }) {
  const today = localDateStr();
  
  // Calculate today's record directly from logs
  const todayRecord = useMemo(() => {
    const rec = { body: false, philosophy: false, art: false, history: false };
    const todayLogs = allLogs.filter(l => l.type === 'daily_checkbox' && l.date === today);
    for (const log of todayLogs) {
      if (log.meta?.task) rec[log.meta.task] = true;
    }
    return rec;
  }, [allLogs, today]);

  const dailyDone  = [todayRecord.body, todayRecord.philosophy, todayRecord.art, todayRecord.history].filter(Boolean).length;
  const isComplete = dailyDone === 4;
  const pct        = Math.round((dailyDone / 4) * 100);

  const [evaluatingId, setEvaluatingId] = useState(null);
  const dailyItems = useMemo(() => getDailyItems(today), [today]);

  const now = new Date();
  const weekDates = getCurrentWeekDates();

  // Pick a daily quote deterministically based on the date string
  const dailyQuote = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
      hash = (hash << 5) - hash + today.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % GITA_QUOTES.length;
    return GITA_QUOTES[index];
  }, [today]);

  // Helper for weekly row
  const getDayScore = (dateStr) => {
    return allLogs.filter(l => l.type === 'daily_checkbox' && l.date === dateStr).length;
  };

  return (
    <>
      {/* ── Date header ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.25em', color: ACCENT, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          Today · {formatDisplayDate(today)}
        </div>
        <div style={{ fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.3, marginBottom: '0.5rem', fontFamily: 'Georgia, serif' }}>
          “{dailyQuote.text}”
        </div>
        <p style={{ fontSize: '0.85rem', fontStyle: 'italic', color: t.muted, lineHeight: 1.6 }}>
          — {dailyQuote.speaker}
        </p>
      </div>

      {/* ── Score + progress ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.25rem', background: t.invertBg, color: t.invertText, padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.15em', color: t.invertMuted50, marginBottom: '0.2rem' }}>
              DAILY SCORE
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1, color: isComplete ? ACCENT : t.invertText }}>
              {dailyDone}/{dailyItems.length}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.1em', color: t.invertMuted50, marginTop: '0.15rem' }}>
              {pct}% COMPLETE
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: '0.75rem', height: 4, background: t.trackBg2, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: ACCENT,
            transition: 'width 0.4s ease',
            borderRadius: 4,
          }} />
        </div>
        {pct === 100 && (
          <div style={{
            marginTop: '1rem',
            textAlign: 'center',
            fontFamily: 'monospace',
            fontSize: '0.65rem',
            letterSpacing: '0.2em',
            color: '#4f8a5f',
            textTransform: 'uppercase',
            animation: 'pulse 2s infinite' // defined in App.jsx
          }}>
            ✦ Perfect Day ✦
          </div>
        )}
      </div>

      {/* ── Sunday Reflection ─────────────────────────────────────────────────── */}
      {now.getDay() === 0 && !hasSundayReflection && (
        <SundayReflection t={t} onSubmit={onSundayReflection} />
      )}

      {/* ── Task list ────────────────────────────────────────────────────────── */}
      {dailyItems.map(item => {
        const done = !!todayRecord[item.id];
        const targetRef = `daily:${today}:${item.id}`;
        const evaluation = evaluations?.[targetRef];

        return (
          <div key={item.id} style={{ marginBottom: '0.7rem' }}>
            <div
              id={`daily-task-${item.id}`}
              onClick={() => {
                if (evaluatingId === item.id) return;
                onToggle(item.id);
              }}
              style={{
                borderLeft:   `4px solid ${item.color}`,
                borderTop:    `1px solid ${t.borderSoft}`,
                borderRight:  `1px solid ${t.borderSoft}`,
                borderBottom: `1px solid ${t.borderSoft}`,
                padding:      '1rem',
                display:      'grid',
                gridTemplateColumns: 'auto 1fr auto',
                gap:          '0.85rem',
                alignItems:   'center',
                cursor:       evaluatingId === item.id ? 'default' : 'pointer',
                background:   done ? t.subtleBg2 : 'transparent',
                transition:   'background 0.2s',
              }}
            >
              {/* Checkbox */}
              <div style={{
                minWidth: 44, minHeight: 44, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <div style={{
                  width: 24, height: 24,
                  border: `2px solid ${done ? item.color : t.checkboxBorder2}`,
                  borderRadius: 4,
                  background: done ? item.color : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: done ? 'scale(1.15)' : 'scale(1)',
                }}>
                  {done && <span style={{ color: 'white', fontSize: '0.85rem' }}>✓</span>}
                </div>
              </div>

              {/* Label */}
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.18em', color: item.color, marginBottom: '0.25rem' }}>
                  {item.icon} · {item.domain}
                </div>
                <div style={{ fontSize: '0.92rem', lineHeight: 1.5, textDecoration: done ? 'line-through' : 'none', color: done ? t.muted : t.pageText, transition: 'color 0.2s' }}>
                  {item.text}
                </div>
              </div>

              {/* Evaluation Badge / Action */}
              {done && (
                <div>
                  {evaluation ? (
                    <div style={{
                      fontFamily: 'monospace', fontSize: '0.65rem', padding: '0.2rem 0.4rem',
                      background: t.subtleBg, color: t.muted, borderRadius: '4px', border: `1px solid ${t.border}`
                    }}>
                      Impact: {evaluation.value > 0 ? '+1' : evaluation.value < 0 ? '-1' : '0'}
                    </div>
                  ) : evaluatingId !== item.id ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); setEvaluatingId(item.id); }}
                      style={{
                        background: 'transparent', color: ACCENT, border: `1px solid ${ACCENT}`,
                        padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.65rem',
                        fontFamily: 'monospace', cursor: 'pointer', textTransform: 'uppercase'
                      }}
                    >
                      Rate
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            {/* Inline Evaluation Prompt */}
            {done && evaluatingId === item.id && !evaluation && (
              <EvidencePrompt
                t={t}
                onCancel={() => setEvaluatingId(null)}
                onSave={async (evalData) => {
                  await onEvaluate(targetRef, evalData);
                  setEvaluatingId(null);
                }}
              />
            )}
          </div>
        );
      })}

      {/* ── Weekly row ───────────────────────────────────────────────────────── */}
      <div style={{ marginTop: '1.75rem', marginBottom: '1.25rem' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.2em', color: t.muted, textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          This Week
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.2rem' }}>
          {weekDates.map((dateStr, i) => {
            const score   = getDayScore(dateStr);
            const perfect = score === 4;
            const isTd    = dateStr === today;
            const isFuture = dateStr > today;

            return (
              <div key={dateStr} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.04em', color: isTd ? ACCENT : t.muted }}>
                  {WEEK_LABELS[i]}
                </div>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  border: `2px solid ${isTd ? ACCENT : perfect ? ACCENT : t.borderSoft}`,
                  background: perfect ? ACCENT : score > 0 ? 'rgba(196,130,26,0.25)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem',
                  opacity: isFuture ? 0.25 : 1,
                }}>
                  {!isFuture && (perfect ? <span style={{ color: '#fff' }}>✓</span> : score > 0 ? <span style={{ color: ACCENT }}>{score}</span> : null)}
                </div>
              </div>
            );
          })}
      </div>
      </div>

      <button
        id="btn-open-goals"
        onClick={onGoToGoals}
        style={{
          width: '100%', padding: '0.85rem', marginTop: '0.4rem',
          background: 'transparent', border: `1px solid ${t.border}`, color: t.pageText,
          fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.15em',
          textTransform: 'uppercase', cursor: 'pointer',
        }}
      >
        Open full goals →
      </button>
    </>
  );
}
