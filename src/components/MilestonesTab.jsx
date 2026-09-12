import React, { useMemo } from 'react';
import { ACCENT } from '../constants.js';
import { localDateFromStr } from '../helpers/dateHelpers.js';

export default function MilestonesTab({ t, milestoneChecks, onToggle, allLogs }) {
  const now = new Date();

  const { MILESTONES, phaseEndDates, daysRemaining } = useMemo(() => {
    let startDate = new Date(); // default to today
    if (allLogs && allLogs.length > 0) {
      const earliest = allLogs.reduce((min, log) => (log.date < min ? log.date : min), allLogs[0].date);
      startDate = localDateFromStr(earliest);
    }
    
    // Normalize startDate to midnight
    startDate.setHours(0,0,0,0);

    const addDays = (d, days) => {
      const res = new Date(d);
      res.setDate(res.getDate() + days);
      res.setHours(23, 59, 59, 999);
      return res;
    };

    const formatPeriod = (start, end) => {
      const s = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const e = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      return `${s} → ${e}`;
    };

    const p1Start = startDate;
    const p1End = addDays(p1Start, 29);
    
    const p2Start = new Date(p1End.getTime() + 1000); // next day
    p2Start.setHours(0,0,0,0);
    const p2End = addDays(p2Start, 29);
    
    const p3Start = new Date(p2End.getTime() + 1000);
    p3Start.setHours(0,0,0,0);
    const p3End = addDays(p3Start, 29);

    const generatedEndDates = [p1End, p2End, p3End];

    // Compute remaining days to the absolute end of the 90 day window
    const nowMidnight = new Date();
    nowMidnight.setHours(0,0,0,0);
    const diffMs = p3End.getTime() - nowMidnight.getTime();
    const remaining = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));

    const generatedMilestones = [
      {
        period: formatPeriod(p1Start, p1End),
        label: "Foundation",
        color: "#c1442c",
        tasks: [
          "Buy the notebook. Label it. Today.",
          "Begin training 4x/week. Miss nothing in the first 30 days.",
          "Read Meditations — 10 pages per session, 3x per week.",
          "Draw for 20 minutes every Thursday.",
          "Start 48 Laws of Power.",
        ],
      },
      {
        period: formatPeriod(p2Start, p2End),
        label: "Production",
        color: "#d99a2b",
        tasks: [
          "Physical benchmark attempt — 10K or 50 push-ups.",
          "Complete your first biography (Caesar or Napoleon).",
          "Finish the sketchbook.",
          "Write your 10-entry personal Meditations.",
          "Identify your finished creative piece and begin it.",
        ],
      },
      {
        period: formatPeriod(p3Start, p3End),
        label: "Proof",
        color: "#4f8a5f",
        tasks: [
          "Share your creative piece. Publicly. No excuses.",
          "Write your strategic self-analysis — one honest page.",
          "Count your books. Count your training days. Count your notebook pages.",
          "Speak about Stoicism — to one person, for five minutes.",
          "Write one paragraph: who were you when you started? Who are you now?",
        ],
      },
    ];

    return { MILESTONES: generatedMilestones, phaseEndDates: generatedEndDates, daysRemaining: remaining };
  }, [allLogs]);

  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 900, fontStyle: 'italic', lineHeight: 1.1, marginBottom: '0.5rem' }}>
          {daysRemaining} Days.
        </div>
        <p style={{ fontSize: '0.88rem', fontStyle: 'italic', color: t.muted, lineHeight: 1.7 }}>
          Not enough time to become a different person. Exactly enough time to prove to yourself that you can.
        </p>
      </div>

      {MILESTONES.map((m, mi) => {
        const endDate = phaseEndDates[mi];
        const prevEndDate = mi > 0 ? phaseEndDates[mi - 1] : null;
        const isPast = now > endDate;
        const isActive = now <= endDate && (!prevEndDate || now > prevEndDate);
        const isFuture = prevEndDate && now <= prevEndDate;

        // Check for lagging tasks
        const hasUncheckedTasks = m.tasks.some((_, ti) => !milestoneChecks[`m-${mi}-${ti}`]);
        const isLagging = isPast && hasUncheckedTasks;

        return (
          <div key={mi} style={{ marginBottom: '1.5rem', opacity: isFuture ? 0.4 : 1, transition: 'opacity 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: `2px solid ${isActive ? m.color : t.borderSoft}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.2em', color: isActive ? m.color : t.muted, textTransform: 'uppercase' }}>
                  {m.period}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: isFuture ? t.muted : t.pageText }}>
                  {m.label}
                </div>
              </div>
              
              {isActive && (
                <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', padding: '0.15rem 0.4rem', background: m.color, color: '#fff', borderRadius: 2, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  Current Phase
                </div>
              )}
              {isLagging && (
                <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', padding: '0.15rem 0.4rem', background: 'transparent', border: '1px solid #c1442c', color: '#c1442c', borderRadius: 2, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  Lagging
                </div>
              )}
            </div>

            {m.tasks.map((task, ti) => {
              const key  = `m-${mi}-${ti}`;
              const done = !!milestoneChecks[key];
              return (
                <div
                  key={ti}
                  id={`milestone-task-${key}`}
                  onClick={() => onToggle(key)}
                  style={{
                    display: 'grid', gridTemplateColumns: 'auto 1fr',
                    gap: '0.75rem', padding: '0.7rem 0',
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
                      border: `2px solid ${done ? m.color : t.checkboxBorder}`,
                      borderRadius: 4,
                      background: done ? m.color : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: done ? 'scale(1.15)' : 'scale(1)',
                    }}>
                      {done && <span style={{ color: 'white', fontSize: '0.65rem' }}>✓</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.9rem', lineHeight: 1.6, textDecoration: done ? 'line-through' : 'none', color: done ? t.muted : t.pageText }}>
                    {task}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}

      <div style={{ background: t.invertBg, color: t.invertText, padding: '1.25rem', marginTop: '1rem' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.25em', color: ACCENT, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          Day 90 — The Only Question
        </div>
        <p style={{ fontSize: '0.9rem', fontStyle: 'italic', lineHeight: 1.7, color: t.invertMuted80 }}>
          Did you become someone who cannot go back to who he was when you started? That is the only metric that matters.
        </p>
      </div>
    </>
  );
}
