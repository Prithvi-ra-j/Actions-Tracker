import React, { useMemo, useState, useEffect } from 'react';
import { getDailyItems, ACCENT } from '../constants.js';
import { localDateStr, formatDisplayDate, getCurrentWeekDates, WEEK_LABELS } from '../helpers/dateHelpers.js';
import {
  isDayPerfect, getDayScore,
  calcCurrentStreak, calcLongestStreak,
  calcPerfectDays, calcTotalTasks,
  calcWeeklyStats, calcMonthlyStats,
} from '../helpers/statsHelpers.js';
import SundayReflection from './SundayReflection.jsx';

/**
 * Today tab — daily task checklist, streak display, weekly row, and stats grid.
 *
 * Props:
 *   t               — current theme object
 *   allDailyRecords — { "YYYY-MM-DD": { body, philosophy, art, history } }
 *   onToggle(id)    — called when user taps a task
 *   onGoToGoals()   — called when user taps the "Open full goals" button
 */
export default function TodayTab({ t, allDailyRecords, onToggle, onGoToGoals, hasSundayReflection, onSundayReflection }) {
  const today = localDateStr();
  const todayRecord = allDailyRecords[today] ?? { body: false, philosophy: false, art: false, history: false };
  const dailyDone  = getDayScore(todayRecord);
  const isComplete = dailyDone === 4;
  const pct        = Math.round((dailyDone / 4) * 100);

  const dailyItems = useMemo(() => getDailyItems(today), [today]);

  // ── Streak / stats — memoised so they don't recompute on every render ────────
  const currentStreak = useMemo(() => calcCurrentStreak(allDailyRecords), [allDailyRecords]);
  const longestStreak = useMemo(() => calcLongestStreak(allDailyRecords), [allDailyRecords]);
  const perfectDays   = useMemo(() => calcPerfectDays(allDailyRecords),   [allDailyRecords]);
  const totalTasks    = useMemo(() => calcTotalTasks(allDailyRecords),     [allDailyRecords]);

  const now          = new Date();
  const weeklyStats  = useMemo(() => calcWeeklyStats(allDailyRecords),    [allDailyRecords]);
  const monthlyStats = useMemo(
    () => calcMonthlyStats(allDailyRecords, now.getFullYear(), now.getMonth() + 1),
    [allDailyRecords],
  );

  const weekDates = getCurrentWeekDates();

  // Streak warning (after 7 PM, incomplete, and having an active streak)
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  useEffect(() => {
    const interval = setInterval(() => setCurrentHour(new Date().getHours()), 60000);
    return () => clearInterval(interval);
  }, []);
  const showStreakWarning = currentStreak > 0 && dailyDone < 4 && currentHour >= 19;

  return (
    <>
      {/* ── Date header ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.52rem', letterSpacing: '0.25em', color: ACCENT, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          Today · {formatDisplayDate(today)}
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1, marginBottom: '0.5rem' }}>
          {isComplete ? 'Day complete.' : 'Do the work.'}
        </div>
        <p style={{ fontSize: '0.85rem', fontStyle: 'italic', color: t.muted, lineHeight: 1.6 }}>
          {isComplete ? 'Four for four. Well done.' : "Four small wins. Then you're done."}
        </p>
      </div>

      {/* ── Score + progress ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.25rem', background: t.invertBg, color: t.invertText, padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.48rem', letterSpacing: '0.15em', color: t.invertMuted50, marginBottom: '0.2rem' }}>
              DAILY SCORE
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1, color: isComplete ? ACCENT : t.invertText }}>
              {dailyDone}/{dailyItems.length}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.48rem', letterSpacing: '0.1em', color: t.invertMuted50, marginTop: '0.15rem' }}>
              {pct}% COMPLETE
            </div>
          </div>

          {/* Streak badge */}
          {currentStreak > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.4rem', lineHeight: 1 }}>🔥</div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.1em', color: ACCENT, marginTop: '0.2rem' }}>
                {currentStreak} DAY STREAK
              </div>
            </div>
          )}
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
      </div>

      {/* ── Streak Warning ────────────────────────────────────────────────────── */}
      {showStreakWarning && (
        <div style={{
          padding: '1rem',
          background: 'rgba(193, 68, 44, 0.15)', // transparent red
          borderLeft: '4px solid #c1442c',
          marginBottom: '1.25rem',
        }}>
          <div style={{ fontFamily: 'monospace', fontSize: '0.45rem', letterSpacing: '0.15em', color: '#c1442c', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Warning
          </div>
          <div style={{ fontSize: '0.85rem', color: t.pageText }}>
            Your <strong>{currentStreak} day streak</strong> is at risk. Finish today's work.
          </div>
        </div>
      )}

      {/* ── Sunday Reflection ─────────────────────────────────────────────────── */}
      {now.getDay() === 0 && !hasSundayReflection && (
        <SundayReflection t={t} onSubmit={onSundayReflection} />
      )}

      {/* ── Task list ────────────────────────────────────────────────────────── */}
      {dailyItems.map(item => {
        const done = !!todayRecord[item.id];
        return (
          <div
            key={item.id}
            id={`daily-task-${item.id}`}
            onClick={() => onToggle(item.id)}
            style={{
              borderLeft:   `4px solid ${item.color}`,
              borderTop:    `1px solid ${t.borderSoft}`,
              borderRight:  `1px solid ${t.borderSoft}`,
              borderBottom: `1px solid ${t.borderSoft}`,
              padding:      '1rem',
              marginBottom: '0.7rem',
              display:      'grid',
              gridTemplateColumns: 'auto 1fr',
              gap:          '0.85rem',
              alignItems:   'center',
              cursor:       'pointer',
              background:   done ? t.subtleBg2 : 'transparent',
              transition:   'background 0.2s',
            }}
          >
            {/* Checkbox */}
            <div style={{
              width: 24, height: 24, flexShrink: 0,
              border: `2px solid ${done ? item.color : t.checkboxBorder2}`,
              borderRadius: 4,
              background: done ? item.color : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}>
              {done && <span style={{ color: 'white', fontSize: '0.75rem' }}>✓</span>}
            </div>

            {/* Label */}
            <div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.48rem', letterSpacing: '0.18em', color: item.color, marginBottom: '0.25rem' }}>
                {item.icon} · {item.domain}
              </div>
              <div style={{ fontSize: '0.92rem', lineHeight: 1.5, textDecoration: done ? 'line-through' : 'none', color: done ? t.muted : t.pageText, transition: 'color 0.2s' }}>
                {item.text}
              </div>
            </div>
          </div>
        );
      })}

      {/* ── Weekly row ───────────────────────────────────────────────────────── */}
      <div style={{ marginTop: '1.75rem', marginBottom: '1.25rem' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.48rem', letterSpacing: '0.2em', color: t.muted, textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          This Week
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.2rem' }}>
          {weekDates.map((dateStr, i) => {
            const record  = allDailyRecords[dateStr];
            const score   = getDayScore(record);
            const perfect = isDayPerfect(record);
            const isTd    = dateStr === today;
            const isFuture = dateStr > today;

            return (
              <div key={dateStr} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{ fontFamily: 'monospace', fontSize: '0.4rem', letterSpacing: '0.04em', color: isTd ? ACCENT : t.muted }}>
                  {WEEK_LABELS[i]}
                </div>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  border: `2px solid ${isTd ? ACCENT : perfect ? ACCENT : t.borderSoft}`,
                  background: perfect ? ACCENT : score > 0 ? 'rgba(196,130,26,0.25)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.55rem',
                  opacity: isFuture ? 0.25 : 1,
                }}>
                  {!isFuture && (perfect ? <span style={{ color: '#fff' }}>✓</span> : score > 0 ? <span style={{ color: ACCENT }}>{score}</span> : null)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Stats grid ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'CURRENT STREAK', value: `${currentStreak}d` },
          { label: 'LONGEST STREAK', value: `${longestStreak}d` },
          { label: 'PERFECT DAYS',   value: perfectDays },
          { label: 'TASKS DONE',     value: totalTasks  },
          { label: 'THIS WEEK',      value: `${weeklyStats.pct}%`  },
          { label: 'THIS MONTH',     value: `${monthlyStats.pct}%` },
        ].map(({ label, value }) => (
          <div key={label} style={{ padding: '0.75rem', background: t.subtleBg, borderLeft: `2px solid ${t.border}` }}>
            <div style={{ fontFamily: 'monospace', fontSize: '0.42rem', letterSpacing: '0.12em', color: t.muted, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              {label}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700, color: t.pageText }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <button
        id="btn-open-goals"
        onClick={onGoToGoals}
        style={{
          width: '100%', padding: '0.85rem', marginTop: '0.4rem',
          background: 'transparent', border: `1px solid ${t.border}`, color: t.pageText,
          fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.15em',
          textTransform: 'uppercase', cursor: 'pointer',
        }}
      >
        Open full goals →
      </button>
    </>
  );
}
