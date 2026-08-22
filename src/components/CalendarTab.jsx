import React, { useState, useMemo } from 'react';
import { getDailyItems, ACCENT } from '../constants.js';
import {
  localDateStr,
  formatDisplayDate,
  getPrevMonth, getNextMonth,
  getDaysInMonth, getFirstDayOfWeek,
  getMonthName,
} from '../helpers/dateHelpers.js';
import { isDayPerfect, getDayScore } from '../helpers/statsHelpers.js';

/**
 * Calendar tab — monthly grid with per-day completion state and detail panel.
 *
 * Props:
 *   t               — current theme object
 *   allDailyRecords — { "YYYY-MM-DD": { body, philosophy, art, history } }
 */
export default function CalendarTab({ t, allDailyRecords }) {
  const now = new Date();
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1); // 1-based
  const [selectedDate, setSelectedDate] = useState(null);

  const today        = localDateStr();
  const daysInMonth  = getDaysInMonth(viewYear, viewMonth);
  // Convert Sun-start (0) to Mon-start offset (0=Mon, 6=Sun)
  const firstDOW     = getFirstDayOfWeek(viewYear, viewMonth);
  const startOffset  = firstDOW === 0 ? 6 : firstDOW - 1;

  // ── Calendar cell array: null = empty padding, string = "YYYY-MM-DD" ────────
  const cells = useMemo(() => {
    const arr = [];
    for (let i = 0; i < startOffset; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(viewMonth).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      arr.push(`${viewYear}-${mm}-${dd}`);
    }
    return arr;
  }, [viewYear, viewMonth, daysInMonth, startOffset]);

  // ── Month navigation ─────────────────────────────────────────────────────────
  const canGoNext = !(viewYear === now.getFullYear() && viewMonth === now.getMonth() + 1);

  function navPrev() {
    const { year, month } = getPrevMonth(viewYear, viewMonth);
    setViewYear(year);
    setViewMonth(month);
    setSelectedDate(null);
  }

  function navNext() {
    if (!canGoNext) return;
    const { year, month } = getNextMonth(viewYear, viewMonth);
    setViewYear(year);
    setViewMonth(month);
    setSelectedDate(null);
  }

  const selectedRecord = selectedDate ? (allDailyRecords[selectedDate] ?? null) : null;

  return (
    <>
      {/* ── Month navigation header ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button
          id="btn-cal-prev"
          onClick={navPrev}
          aria-label="Previous month"
          style={navBtnStyle(t, true)}
        >‹</button>

        <div style={{ fontFamily: 'monospace', fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: t.pageText }}>
          {getMonthName(viewMonth)} {viewYear}
        </div>

        <button
          id="btn-cal-next"
          onClick={navNext}
          disabled={!canGoNext}
          aria-label="Next month"
          style={navBtnStyle(t, canGoNext)}
        >›</button>
      </div>

      {/* ── Day-of-week labels (Mon … Sun) ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((lbl, i) => (
          <div key={i} style={{ fontFamily: 'monospace', fontSize: '0.42rem', textAlign: 'center', color: t.muted, paddingBottom: '0.2rem' }}>
            {lbl}
          </div>
        ))}
      </div>

      {/* ── Day grid ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: '1.5rem' }}>
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={`pad-${i}`} />;

          const record   = allDailyRecords[dateStr];
          const score    = getDayScore(record);
          const perfect  = isDayPerfect(record);
          const isTd     = dateStr === today;
          const isFuture = dateStr > today;
          const isSelected = dateStr === selectedDate;
          const dayNum   = parseInt(dateStr.slice(-2), 10);

          const bg = perfect
            ? ACCENT
            : score > 0
              ? 'rgba(196,130,26,0.22)'
              : 'transparent';

          const border = isSelected
            ? t.pageText
            : isTd
              ? ACCENT
              : perfect
                ? ACCENT
                : score > 0
                  ? 'rgba(196,130,26,0.4)'
                  : t.borderFaint;

          return (
            <div
              key={dateStr}
              id={`cal-day-${dateStr}`}
              onClick={() => !isFuture && setSelectedDate(isSelected ? null : dateStr)}
              aria-label={dateStr}
              style={{
                aspectRatio: '1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: 3,
                cursor:  isFuture ? 'default' : 'pointer',
                opacity: isFuture ? 0.25 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              <span style={{
                fontFamily: 'monospace',
                fontSize: '0.55rem',
                fontWeight: isTd ? 700 : 400,
                color: perfect ? '#fff' : isTd ? ACCENT : t.pageText,
              }}>
                {dayNum}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Legend ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { bg: ACCENT,                      border: ACCENT,                       label: 'Perfect (4/4)' },
          { bg: 'rgba(196,130,26,0.22)',      border: 'rgba(196,130,26,0.4)',       label: 'Partial'       },
          { bg: 'transparent',               border: t.borderFaint,                label: 'No activity'   },
        ].map(({ bg, border, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: 12, height: 12, background: bg, border: `1px solid ${border}`, borderRadius: 2 }} />
            <span style={{ fontFamily: 'monospace', fontSize: '0.42rem', color: t.muted }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── Selected day detail ───────────────────────────────────────────────── */}
      {selectedDate && (
        <div style={{ border: `1px solid ${t.border}`, borderLeft: `4px solid ${ACCENT}`, padding: '1rem', marginTop: '0.5rem' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.2em', color: ACCENT, textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            {formatDisplayDate(selectedDate)}
          </div>

          {selectedRecord ? (
            <>
              <div style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.1em', color: t.muted, marginBottom: '0.75rem' }}>
                {getDayScore(selectedRecord)}/4 tasks complete
              </div>
              {getDailyItems(selectedDate).map(item => {
                const done = !!selectedRecord[item.id];
                return (
                  <div key={item.id} style={{
                    display: 'grid', gridTemplateColumns: 'auto 1fr auto',
                    gap: '0.65rem', padding: '0.45rem 0',
                    borderBottom: `1px solid ${t.borderFaint}`,
                    alignItems: 'center',
                  }}>
                    <div style={{
                      width: 14, height: 14, flexShrink: 0,
                      border: `2px solid ${done ? item.color : t.checkboxBorder}`,
                      borderRadius: 2,
                      background: done ? item.color : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {done && <span style={{ color: 'white', fontSize: '0.45rem' }}>✓</span>}
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.46rem', letterSpacing: '0.1em', color: item.color }}>
                      {item.icon} {item.domain}
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.46rem', color: done ? ACCENT : t.muted }}>
                      {done ? 'done' : '—'}
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div style={{ fontFamily: 'monospace', fontSize: '0.52rem', color: t.muted, fontStyle: 'italic' }}>
              No activity recorded for this day.
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ─── Style helper ──────────────────────────────────────────────────────────────

function navBtnStyle(t, active) {
  return {
    background: 'transparent',
    border: `1px solid ${active ? t.border : t.borderFaint}`,
    color: active ? t.pageText : t.muted,
    width: 36, height: 36,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: active ? 'pointer' : 'default',
    fontFamily: 'monospace', fontSize: '1.1rem',
  };
}
