import React, { useState, useEffect } from 'react';
import { ACCENT } from '../constants.js';
import { localDateStr, getDaysUntilYearEnd } from '../helpers/dateHelpers.js';

/**
 * Unified Goals & Timeline Screen (§54)
 * 
 * Replaces the legacy hardcoded goals/milestones/calendar with a dynamic view:
 * 1. Active Quests (Goals)
 * 2. Unlocked Milestones
 * 3. Recent Historical Timeline (completed quests/milestones)
 */
export default function GoalsTab({ t, dark, allQuests, allLogs }) {
  const [milestones, setMilestones] = useState([]);

  useEffect(() => {
    async function load() {
      const { getAllMilestoneChecks } = await import('../database/milestonesRepository.js');
      const data = await getAllMilestoneChecks();
      setMilestones(Object.entries(data).map(([id, val]) => ({ id, ...val })));
    }
    load();
  }, []);

  const activeQuests = allQuests.filter(q => q.status === 'active');
  const completedQuests = allQuests.filter(q => q.status === 'completed');
  const unlockedMilestones = milestones.filter(m => m.completed);

  // Build a timeline from completed quests and milestones
  const timelineEvents = [
    ...completedQuests.map(q => ({
      date: q.updatedAt?.split('T')[0] || localDateStr(),
      title: q.title,
      type: 'Quest Completed',
      axis: q.axis
    })),
    ...unlockedMilestones.map(m => ({
      date: m.date || localDateStr(),
      title: m.id.replace(/_/g, ' '),
      type: 'Milestone Reached',
      axis: 'milestone'
    }))
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      
      {/* Header */}
      <div>
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.15em', color: ACCENT, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          {getDaysUntilYearEnd()} days remaining
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>
          Goals & Timeline
        </div>
      </div>

      {/* Active Quests */}
      <div>
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.1em', color: t.muted, textTransform: 'uppercase', marginBottom: '1rem', borderBottom: `1px solid ${t.borderFaint}`, paddingBottom: '0.5rem' }}>
          Active Quests
        </div>
        {activeQuests.length === 0 ? (
          <div style={{ fontSize: '0.85rem', color: t.muted, fontStyle: 'italic' }}>
            No active quests. Jarvis can recommend some based on your bottlenecks.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {activeQuests.map(q => {
              const pct = Math.min(100, Math.round((q.progress / q.maxProgress) * 100));
              return (
                <div key={q.id} style={{ border: `1px solid ${t.border}`, background: t.subtleBg, padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '1rem' }}>{q.title}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: ACCENT }}>{pct}%</div>
                  </div>
                  {q.description && (
                    <div style={{ fontSize: '0.8rem', color: t.muted, marginBottom: '1rem' }}>
                      {q.description}
                    </div>
                  )}
                  <div style={{ height: 4, background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: ACCENT, borderRadius: 2, transition: 'width 0.4s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div>
        <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.1em', color: t.muted, textTransform: 'uppercase', marginBottom: '1rem', borderBottom: `1px solid ${t.borderFaint}`, paddingBottom: '0.5rem' }}>
          Historical Timeline
        </div>
        {timelineEvents.length === 0 ? (
          <div style={{ fontSize: '0.85rem', color: t.muted, fontStyle: 'italic' }}>
            Your history will be recorded here.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: `2px solid ${t.borderFaint}`, marginLeft: '0.5rem', paddingLeft: '1rem' }}>
            {timelineEvents.map((evt, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: '-1.35rem', top: '0.2rem',
                  width: '0.6rem', height: '0.6rem', borderRadius: '50%', background: ACCENT
                }} />
                <div style={{ fontFamily: 'monospace', fontSize: '0.6rem', color: t.muted, marginBottom: '0.2rem' }}>
                  {evt.date} • {evt.type}
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 500, color: t.pageText }}>
                  {evt.title}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
