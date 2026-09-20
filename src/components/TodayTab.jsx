import React, { useState, useEffect, useMemo } from 'react';
import { ACCENT } from '../constants.js';
import { localDateStr, formatDisplayDate } from '../helpers/dateHelpers.js';
import InsightsInbox from './InsightsInbox.jsx';
import { GITA_QUOTES } from '../data/quotes.js';
import { getGracePrompt } from '../core/occurrenceEngine.js';
import HabitRoadmapEditor from './HabitRoadmapEditor.jsx';

/**
 * Today Screen (§51)
 *
 * Execution-first view focusing on:
 * - Current Focus (Quests)
 * - Habits (Occurrences)
 * - Automatic Signals (Mock overview)
 * - Jarvis Snapshot
 */
export default function TodayTab({
  t,
  todayOccurrences,
  onCompleteOccurrence,
  onExcuseOccurrence,
  onOccurrenceReason,
  allQuests,
  onGoToGoals
}) {
  const today = localDateStr();
  const displayDate = formatDisplayDate(today);

  // Pick a daily quote deterministically based on the date string
  const dailyQuote = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
      hash = today.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % GITA_QUOTES.length;
    return GITA_QUOTES[index];
  }, [today]);

  // Active actionable quests
  const activeQuests = useMemo(() => allQuests.filter(q => q.status === 'active'), [allQuests]);

  const [loading, setLoading] = useState(true);
  const [unreadInsights, setUnreadInsights] = useState([]);

  useEffect(() => {
    loadInbox();
  }, []);

  async function loadInbox() {
    try {
      const { getActiveInsights } = await import('../database/insightsRepository.js');
      const active = await getActiveInsights();
      setUnreadInsights(active);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Handle quest check (mock implementation, since quests are handled in stats or goals)
  // For the sake of execution, we can just redirect to Goals tab to interact with quests.

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header */}
      <div>
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.15em', color: ACCENT, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          {displayDate}
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1, marginBottom: '1.5rem' }}>
          Execution
        </div>
        
        {/* Daily Quote */}
        {dailyQuote && (
          <div style={{
            padding: '1rem',
            borderLeft: `3px solid ${ACCENT}`,
            background: t.subtleBg,
            color: t.pageText,
            fontSize: '0.9rem',
            lineHeight: 1.6,
            fontStyle: 'italic',
          }}>
            "{dailyQuote.text}"
            <div style={{ marginTop: '0.5rem', fontFamily: 'monospace', fontSize: '0.65rem', color: t.muted, textTransform: 'uppercase' }}>
              — {dailyQuote.source}
            </div>
          </div>
        )}
      </div>

      {/* Jarvis Snapshot */}
      {!loading && unreadInsights.length > 0 && (
        <div style={{ border: `1px solid ${t.border}`, background: t.subtleBg, padding: '1.25rem' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.1em', color: ACCENT, textTransform: 'uppercase', marginBottom: '1rem' }}>
            System Inbox
          </div>
          <InsightsInbox t={t} onQuestsChanged={() => {}} />
        </div>
      )}

      {/* Current Focus / Quests */}
      <div>
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.1em', color: t.muted, textTransform: 'uppercase', marginBottom: '1rem' }}>
          Current Focus (Active Quests)
        </div>
        {activeQuests.length === 0 ? (
          <div style={{ fontSize: '0.85rem', color: t.muted, fontStyle: 'italic' }}>
            No active quests.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activeQuests.map(q => (
              <div key={q.id} style={{ border: `1px solid ${t.border}`, padding: '1rem', background: t.subtleBg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{q.title}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.6rem', color: t.muted, marginTop: '0.3rem', textTransform: 'uppercase' }}>
                    {q.axis} — {q.progress}/{q.maxProgress}
                  </div>
                </div>
                <button
                  onClick={onGoToGoals}
                  style={{ background: 'transparent', border: `1px solid ${ACCENT}`, color: ACCENT, padding: '0.4rem 0.8rem', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.6rem', textTransform: 'uppercase' }}
                >
                  Manage
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Your Habits */}
      <div>
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.1em', color: t.muted, textTransform: 'uppercase', marginBottom: '1rem' }}>
          Habit Roadmaps
        </div>
        <HabitRoadmapEditor t={t} />
      </div>

      <div>
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.1em', color: t.muted, textTransform: 'uppercase', marginBottom: '1rem' }}>
          Today's Habits
        </div>
        
        {(!todayOccurrences || todayOccurrences.length === 0) ? (
          <div style={{ fontSize: '0.85rem', color: t.muted, fontStyle: 'italic' }}>
            No habits scheduled for today.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {todayOccurrences.map(occ => {
              const isDone = occ.status === 'completed';
              const isExcused = occ.status === 'excused';
              const gracePrompt = getGracePrompt(occ.status, occ.graceState);
              const isGraceDayOne = occ.status === 'expected' && occ.graceState === 'grace_day_one';
              const isGraceDayTwo = occ.status === 'expected' && occ.graceState === 'grace_day_two';
              const isGraceExpired = occ.status === 'unknown' && occ.graceState === 'grace_expired';
              return (
                <div key={occ.id} style={{ 
                  border: `1px solid ${isDone ? '#4f8a5f' : (isExcused ? t.borderSoft : t.border)}`, 
                  padding: '1rem', 
                  background: isDone ? 'rgba(79,138,95,0.1)' : t.subtleBg,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  opacity: isExcused ? 0.6 : 1
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1rem', textDecoration: isExcused ? 'line-through' : 'none' }}>
                      {occ.habitTitle || 'Habit'}
                    </div>
                    {gracePrompt && <div style={{ fontSize: '0.75rem', color: isGraceExpired ? '#c1442c' : ACCENT, marginTop: '0.25rem' }}>{gracePrompt}</div>}
                    {isExcused && (
                      <div style={{ fontSize: '0.75rem', color: t.muted, marginTop: '0.25rem' }}>
                        Reason: {occ.excuseReason}
                      </div>
                    )}
                  </div>
                  
                  {!isDone && !isExcused && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => onCompleteOccurrence(occ.id)}
                        style={{ background: '#4f8a5f', border: 'none', color: '#fff', padding: '0.4rem 0.8rem', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.6rem', textTransform: 'uppercase' }}
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Reason for excusing?');
                          if (reason) onExcuseOccurrence(occ.id, reason);
                        }}
                        style={{ background: 'transparent', border: `1px solid ${t.borderSoft}`, color: t.muted, padding: '0.4rem 0.8rem', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.6rem', textTransform: 'uppercase' }}
                      >
                        Skip
                      </button>
                    </div>
                  )}

                  {isGraceExpired && !occ.reason && (
                    <button
                      onClick={() => {
                        const reason = prompt('What got in the way?');
                        if (reason?.trim()) onOccurrenceReason(occ.id, reason.trim());
                      }}
                      style={{ background: 'transparent', border: `1px solid #c1442c`, color: '#c1442c', padding: '0.4rem 0.8rem', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.6rem', textTransform: 'uppercase' }}
                    >
                      Log reason
                    </button>
                  )}

                  {isDone && (
                    <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#4f8a5f', fontWeight: 'bold' }}>
                      DONE ✓
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
