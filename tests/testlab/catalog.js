export const PERSONAS = Object.freeze([
  { id: 'disciplined-optimizer', name: 'Disciplined Optimizer', traits: ['consistent logging', 'frequent reviews', 'rarely makes mistakes'] },
  { id: 'inconsistent-user', name: 'Inconsistent User', traits: ['misses multiple days', 'returns after inactivity', 'wants recovery without restarting'] },
  { id: 'chaotic-user', name: 'Chaotic User', traits: ['reschedules often', 'changes deadlines', 'partially completes plans', 'produces contradictory information'] },
  { id: 'minimalist-user', name: 'Minimalist User', traits: ['short input', 'few settings visits', 'expects contextual defaults'] },
  { id: 'voice-first-user', name: 'Voice-First User', traits: ['voice-led interaction', 'corrects transcripts', 'switches between speech and typing'] },
  { id: 'power-user', name: 'Power User', traits: ['large history', 'many goals', 'frequent queries'] },
  { id: 'returning-user', name: 'Returning User', traits: ['inactive for an extended period', 'needs continuity and recovery'] },
  { id: 'life-chaos-user', name: 'Life-Chaos User', traits: ['multiple schedules and priorities change together'] },
  { id: 'traveler-user', name: 'Traveler', traits: ['timezone changes', 'shifting day boundaries', 'ambiguous local dates'] },
  { id: 'offline-user', name: 'Offline User', traits: ['creates and edits state offline', 'reconnects and synchronizes later'] },
  { id: 'skeptical-first-timer', name: 'Skeptical First-Timer', traits: ['low patience', 'skips detail', 'expects obvious early value'] },
  { id: 'adversarial-user', name: 'Adversarial User', traits: ['repeats commands', 'cancels plans', 'rapidly submits changes'] },
]);

export const FIXTURE_DEFINITIONS = Object.freeze({
  'empty-user': { historyDays: 0, goals: 0, actions: 0 },
  'fresh-user': { historyDays: 3, goals: 1, actions: 3 },
  'consistent-user': { historyDays: 30, goals: 3, actions: 60, completionRate: 1 },
  'inconsistent-user-v3': {
    historyDays: 90,
    goals: 4,
    actions: 127,
    completedWorkouts: 18,
    missedWorkouts: 9,
    germanSessions: 12,
    missedGermanSessions: 6,
    overdueTasks: 3,
  },
  'chaotic-user': { historyDays: 90, goals: 5, actions: 127, messyData: true },
  'long-term-user': { historyDays: 365, goals: 6, actions: 730 },
  'goal-heavy-user': { historyDays: 90, goals: 30, actions: 180 },
  'overdue-user': { historyDays: 90, goals: 4, actions: 90, overdueTasks: 8 },
  'returning-user': { historyDays: 180, goals: 4, actions: 90, inactivityDays: 60 },
  'traveler-user': { historyDays: 90, goals: 4, actions: 90, timezoneChanges: true },
  'offline-user': { historyDays: 30, goals: 3, actions: 45, offlineSequence: true },
  'power-user': { historyDays: 365, goals: 50, actions: 2500 },
  'corrupted-edge-user': { historyDays: 365, goals: 5, actions: 75, messyData: true },
});

const DOMAINS = ['body', 'knowledge', 'strategy', 'creativity', 'social', 'discipline'];
const GENERIC_ACTIONS = ['workout', 'german_session', 'reading', 'planning', 'reflection', 'work'];
const INCONSISTENT_OTHER_ACTIONS = ['reading', 'planning', 'reflection', 'work'];
const MESSY_TEXT = [
  'Incomplete note — details to add later',
  'Finished and missed the same item? check yesterday',
  'Long session '.repeat(24),
  'Emoji / Unicode: 🏃‍♀️ café 東京',
  'Characters: <>&"\' ; empty values are valid too',
];

function assertDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Fixture simulatedDate must use YYYY-MM-DD.');
  }
  const parsed = new Date(`${date}T12:00:00.000Z`);
  if (parsed.toISOString().slice(0, 10) !== date) {
    throw new Error(`Fixture simulatedDate "${date}" is not a real calendar date.`);
  }
}

function dateOffset(date, days) {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

function createAction(fixtureId, index, date, kind, status, seed, messyData) {
  const axis = kind === 'workout' ? 'body' : kind === 'german_session' ? 'knowledge' : DOMAINS[(index + seed) % DOMAINS.length];
  return {
    id: `testlab/${fixtureId}/action/${String(index + 1).padStart(5, '0')}`,
    date,
    type: kind,
    axis,
    status,
    value: status === 'completed' ? 1 : 0,
    content: messyData && index % 11 === 0 ? MESSY_TEXT[(index + seed) % MESSY_TEXT.length] : `${kind.replaceAll('_', ' ')} ${index + 1}`,
    source: 'testlab',
  };
}

function createInconsistentActions(fixtureId, config, simulatedDate, seed) {
  const actions = [];
  const add = (kind, status, count) => {
    for (let index = 0; index < count; index += 1) {
      const offset = (index * 7 + seed * 3 + actions.length) % config.historyDays;
      actions.push(createAction(
        fixtureId,
        actions.length,
        dateOffset(simulatedDate, offset),
        kind,
        status,
        seed,
        true
      ));
    }
  };
  add('workout', 'completed', config.completedWorkouts);
  add('workout', 'missed', config.missedWorkouts);
  add('german_session', 'completed', config.germanSessions);
  add('german_session', 'missed', config.missedGermanSessions);
  while (actions.length < config.actions) {
    const index = actions.length;
    const kind = INCONSISTENT_OTHER_ACTIONS[(index + seed) % INCONSISTENT_OTHER_ACTIONS.length];
    const status = index % 5 === 0 ? 'partial' : index % 4 === 0 ? 'missed' : 'completed';
    const offset = (index * 13 + seed * 11) % config.historyDays;
    actions.push(createAction(
      fixtureId,
      index,
      dateOffset(simulatedDate, offset),
      kind,
      status,
      seed,
      true
    ));
  }
  return actions;
}

export function buildFixture(fixtureId, { simulatedDate = '2026-10-02', seed = 1 } = {}) {
  const config = FIXTURE_DEFINITIONS[fixtureId];
  if (!config) throw new Error(`Unknown test-lab fixture "${fixtureId}".`);
  if (!Number.isInteger(seed) || seed < 0) throw new Error('Fixture seed must be a non-negative integer.');
  assertDate(simulatedDate);

  let actions;
  if (fixtureId === 'inconsistent-user-v3') {
    actions = createInconsistentActions(fixtureId, config, simulatedDate, seed);
  } else {
    actions = Array.from({ length: config.actions }, (_, index) => {
      const actionIndex = index + 1;
      const offset = Math.min(
        Math.max(0, config.historyDays - 1),
        (actionIndex * 17 + seed * 13) % Math.max(1, config.historyDays)
      );
      const completed = config.completionRate === 1 || (actionIndex + seed) % 5 !== 0;
      return createAction(
        fixtureId,
        index,
        dateOffset(simulatedDate, offset),
        GENERIC_ACTIONS[(actionIndex + seed) % GENERIC_ACTIONS.length],
        completed ? 'completed' : 'missed',
        seed,
        Boolean(config.messyData)
      );
    });
  }

  if (config.inactivityDays) {
    const lastActiveDate = dateOffset(simulatedDate, config.inactivityDays);
    actions = actions.map(action => ({ ...action, date: dateOffset(lastActiveDate, (Number(action.id.match(/\d+$/)[0]) % config.historyDays)) }));
  }

  const goals = Array.from({ length: config.goals }, (_, index) => {
    const overdue = index < (config.overdueTasks || 0);
    const axis = DOMAINS[(index + seed) % DOMAINS.length];
    return {
      id: `testlab/${fixtureId}/goal/${String(index + 1).padStart(3, '0')}`,
      type: 'goal',
      status: index % 9 === 8 ? 'paused' : 'active',
      domain: axis,
      label: overdue ? `Overdue ${axis} goal ${index + 1}` : `${axis} goal ${index + 1}`,
      color: '#888888',
      icon: '◇',
      start: 'Test-lab fixture baseline',
      end: 'Test-lab fixture outcome',
      targets: [{
        text: `Complete ${axis} milestone`,
        metric: '',
        completed: false,
        ...(overdue ? { dueDate: dateOffset(simulatedDate, 2) } : {}),
      }],
      proof: `Fixture proof ${index + 1}`,
      fear: '',
      schemaVersion: 1,
      createdAt: `${dateOffset(simulatedDate, Math.max(0, config.historyDays - 1))}T08:00:00.000Z`,
      updatedAt: `${simulatedDate}T08:00:00.000Z`,
      source: 'testlab',
    };
  });

  return {
    id: fixtureId,
    seed,
    simulatedDate,
    config: { ...config },
    actions,
    goals,
    timeline: config.offlineSequence
      ? [{ day: 0, events: ['network_connected'] }, { day: 1, events: ['network_disconnected'] }, { day: 2, events: ['network_reconnected'] }]
      : [],
  };
}
