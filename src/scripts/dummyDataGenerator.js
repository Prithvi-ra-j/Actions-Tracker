import { importDatabase } from '../database/db.js';

const generateId = () => Math.random().toString(36).substr(2, 9);
const now = () => new Date().toISOString();

export async function generateDummyData() {
  const currentIso = now();
  
  // Helper to generate dates relative to today
  const today = new Date();
  const dateOffset = (days) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  // Helper for ISO timestamps
  const timeOffset = (days) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };

  const data = {
    _meta: {
      exportedAt: currentIso,
      appVersion: '1.5.0',
      schemaVersion: 1
    },
    settings: [
      { key: 'dummyDataActive', value: 'true' },
      { key: 'lastStatTitles', value: JSON.stringify({ strength: "Apprentice", discipline: "Apprentice", knowledge: "Apprentice", wisdom: "Apprentice", creativity: "Apprentice", strategy: "Apprentice" }) }
    ],
    axis_config: [
      { axis: 'strength', enabled: true, weight: 1, hasConsistencyTerm: true },
      { axis: 'discipline', enabled: true, weight: 1, hasConsistencyTerm: true },
      { axis: 'knowledge', enabled: true, weight: 1, hasConsistencyTerm: true },
      // Edge Case: Wisdom has no consistency term
      { axis: 'wisdom', enabled: true, weight: 1, hasConsistencyTerm: false },
      { axis: 'creativity', enabled: true, weight: 1, hasConsistencyTerm: true },
      // Edge Case: Strategy is paused
      { axis: 'strategy', enabled: true, weight: 1, hasConsistencyTerm: true, paused: true }
    ],
    logs: [
      // Onboarding logs
      { id: generateId(), localDate: dateOffset(-60), text: 'Initial Baseline: 5', axis: 'strength', value: 5, override: true, createdAt: timeOffset(-60) },
      { id: generateId(), localDate: dateOffset(-60), text: 'Initial Baseline: 3', axis: 'discipline', value: 3, override: true, createdAt: timeOffset(-60) },
      // A streak of discipline logs
      { id: generateId(), localDate: dateOffset(-5), text: 'Woke up at 6am', axis: 'discipline', value: 1, override: false, createdAt: timeOffset(-5) },
      { id: generateId(), localDate: dateOffset(-4), text: 'Woke up at 6am', axis: 'discipline', value: 1, override: false, createdAt: timeOffset(-4) },
      { id: generateId(), localDate: dateOffset(-3), text: 'Woke up at 6am', axis: 'discipline', value: 1, override: false, createdAt: timeOffset(-3) },
      { id: generateId(), localDate: dateOffset(-2), text: 'Woke up at 6am', axis: 'discipline', value: 1, override: false, createdAt: timeOffset(-2) },
      { id: generateId(), localDate: dateOffset(-1), text: 'Woke up at 6am', axis: 'discipline', value: 1, override: false, createdAt: timeOffset(-1) },
      // High volume strength day
      { id: generateId(), localDate: dateOffset(-10), text: 'Deadlift PR', axis: 'strength', value: 15, override: false, createdAt: timeOffset(-10) },
      { id: generateId(), localDate: dateOffset(-10), text: 'Squat Volume', axis: 'strength', value: 10, override: false, createdAt: timeOffset(-10) }
    ],
    questBoard: [
      // Active quest
      { id: 'q1', title: 'Read 10 Books', axis: 'knowledge', targetValue: 10, currentValue: 4, unit: 'books', done: false, createdAt: timeOffset(-20) },
      // Completed quest
      { id: 'q2', title: 'Run a Marathon', axis: 'strength', targetValue: 1, currentValue: 1, unit: 'marathons', done: true, createdAt: timeOffset(-40), completedAt: timeOffset(-1) },
      // Edge case: targetValue 0
      { id: 'q3', title: 'Meditate (Endless)', axis: 'wisdom', targetValue: 0, currentValue: 5, unit: 'sessions', done: false, createdAt: timeOffset(-5) },
      // AI Insight Quest
      { id: 'q4', title: 'AI: Re-evaluate diet plan', axis: 'strategy', targetValue: 1, currentValue: 0, unit: 'actions', done: false, linkedInsightId: 'ins1', createdAt: timeOffset(-2) }
    ],
    habits: [
      // Active habit
      { id: 'h1', domain: 'daily', title: 'Morning Stretch', timeTarget: '07:00', frequency: 'everyday', active: true, createdAt: timeOffset(-30) },
      // Paused habit
      { id: 'h2', domain: 'daily', title: 'Cold Shower', timeTarget: '07:30', frequency: 'everyday', active: false, createdAt: timeOffset(-30) }
    ],
    habitOccurrences: [
      // Occurrences for Morning Stretch
      { id: generateId(), habitId: 'h1', scheduledFor: dateOffset(-2), status: 'completed', completedAt: timeOffset(-2) },
      { id: generateId(), habitId: 'h1', scheduledFor: dateOffset(-1), status: 'skipped', completedAt: timeOffset(-1) },
      { id: generateId(), habitId: 'h1', scheduledFor: dateOffset(0), status: 'pending' }
    ],
    books: [
      { id: 'b1', title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', coverUrl: '', status: 'finished', finishedAt: dateOffset(-10), createdAt: timeOffset(-20) },
      { id: 'b2', title: 'Dune', author: 'Frank Herbert', coverUrl: '', status: 'reading', createdAt: timeOffset(-5) }
    ],
    learnings: [
      { id: 'l1', sourceId: 'b1', sourceType: 'Book', concept: 'System 1 vs System 2', explanation: 'System 1 is fast and intuitive, System 2 is slow and analytical.', createdAt: timeOffset(-11) }
    ],
    insights: [
      // Pending insight
      { id: 'ins2', type: 'pattern', title: 'Consistent Early Waking', description: 'You have woken up at 6am for 5 days in a row.', supportingEvidenceIds: ['ev1'], status: 'pending', createdAt: timeOffset(0) },
      // Confirmed insight
      { id: 'ins1', type: 'recommendation', title: 'Diet Strategy', description: 'Your strength volume is high but your energy is low.', recommendedActions: ['Re-evaluate diet plan'], status: 'confirmed', createdAt: timeOffset(-2) },
      // Rejected insight
      { id: 'ins3', type: 'contradiction', title: 'False pattern', description: 'This is an incorrect observation.', status: 'rejected', createdAt: timeOffset(-3) }
    ],
    memories: [
      { id: 'm1', content: 'User prefers to train in the morning.', type: 'semantic', status: 'confirmed', confidence: 0.9, createdAt: timeOffset(-10) }
    ],
    audits: [
      { id: 'aud1', periodStart: '2026-08', periodEnd: '2026-08', title: 'August 2026 Monthly Audit', summary: 'A strong month for strength, but knowledge lagged.', axes: { strength: { delta: '+5', narrative: 'Great progress.' } }, status: 'finalized', createdAt: timeOffset(-13) }
    ],
    decisions: [
      { id: 'dec1', title: 'Buy a new car?', context: 'Old car is breaking down.', options: [{ id: 'opt1', text: 'Buy used Toyota' }, { id: 'opt2', text: 'Repair old car' }], chosenOptionId: 'opt1', outcome: 'Car runs great. Good decision.', reflection: 'Glad I bought it.', createdAt: timeOffset(-40) }
    ],
    experiments: [
      { id: 'exp1', title: 'Keto Diet', domain: 'health', hypothesis: 'Going keto will increase energy.', status: 'concluded', result: 'failure', conclusion: 'Felt terrible after 2 weeks.', createdAt: timeOffset(-50) },
      { id: 'exp2', title: 'Polyphasic Sleep', domain: 'health', hypothesis: 'I can sleep 4 hours a day.', status: 'ongoing', createdAt: timeOffset(-2) }
    ],
    creativeWorks: [
      { id: 'cw1', title: 'My First Blog Post', url: 'https://example.com/blog1', summary: 'A post about AI.', status: 'published', createdAt: timeOffset(-15) }
    ],
    observations: [
      { id: 'obs1', content: 'The sky is unusually blue today.', tags: ['nature', 'weather'], context: 'Walking in the park', createdAt: timeOffset(-1) }
    ],
    facts: [
      { id: 'f1', type: 'Log', objectId: 'log_dummy_1', text: 'Woke up early.', localDate: dateOffset(-5), createdAt: timeOffset(-5) }
    ],
    evidence: [
      { id: 'ev1', type: 'streak', description: '5 day wake up streak', supportingFactIds: ['f1'], value: 5, unit: 'days', createdAt: timeOffset(0) }
    ],
    telemetry: [
      { id: 'tel1', type: 'jarvis_audit', date: dateOffset(-13), durationMs: 4500 }
    ],
    statSnapshots: [
      { id: 'ss1', date: dateOffset(-60), stats: { strength: 5, discipline: 3, knowledge: 0, wisdom: 0, creativity: 0, strategy: 0 } },
      { id: 'ss2', date: dateOffset(-30), stats: { strength: 20, discipline: 15, knowledge: 5, wisdom: 0, creativity: 0, strategy: 0 } },
      { id: 'ss3', date: dateOffset(-10), stats: { strength: 40, discipline: 20, knowledge: 10, wisdom: 2, creativity: 0, strategy: 0 } },
      { id: 'ss4', date: dateOffset(0), stats: { strength: 45, discipline: 25, knowledge: 15, wisdom: 5, creativity: 2, strategy: 0 } }
    ],
    goals: [],
    milestones: [],
    gymSessions: [],
    lifeObjects: [],
    selfModel: [],
    relations: [],
    syncState: []
  };

  try {
    await importDatabase(JSON.stringify(data));
    console.log('[DummyData] Successfully imported dummy data payload.');
  } catch (err) {
    console.error('[DummyData] Failed to import dummy data:', err);
    throw err;
  }
}
