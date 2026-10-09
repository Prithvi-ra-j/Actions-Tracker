import { describe, expect, it } from 'vitest';
import { defineScenario, validateScenario } from './scenario.js';
import { createLifeTimeline } from './lifeTimeline.js';
import { buildFixture, FIXTURE_DEFINITIONS, PERSONAS } from './catalog.js';

const scenarioFixture = {
  id: 'LAB-SMOKE-001',
  title: 'Deterministic lab setup',
  persona: 'returning-user',
  fixture: 'inconsistent-user-v3',
  environment: {
    device: 'desktop',
    viewport: '1280x800',
    network: 'normal',
    clock: 'test',
  },
  testTime: '2026-10-02T08:00:00+05:30',
  objective: 'Resume a seeded user state.',
  actions: ['Open the app'],
  expected: ['The app opens'],
  invariants: ['No duplicate data is created'],
  breakTests: ['Reload once'],
  limits: { durationMs: 60_000, maxBrowserActions: 20, maxRetries: 1 },
  evidence: { screenshots: true, console: true, network: true, stateSnapshot: true },
};

describe('test-lab scenario contracts', () => {
  it('accepts a complete scenario and returns it unchanged', () => {
    expect(defineScenario(scenarioFixture)).toEqual(scenarioFixture);
  });

  it.each([
    ['missing deterministic timezone', { ...scenarioFixture, testTime: '2026-10-02T08:00:00' }],
    ['unknown network profile', { ...scenarioFixture, environment: { ...scenarioFixture.environment, network: 'unknown' } }],
    ['missing invariant', { ...scenarioFixture, invariants: [] }],
    ['invalid action limit', { ...scenarioFixture, limits: { ...scenarioFixture.limits, maxBrowserActions: -1 } }],
  ])('rejects %s', (_name, invalidScenario) => {
    expect(() => validateScenario(invalidScenario)).toThrow();
  });
});

describe('test-lab life timeline', () => {
  it('injects scheduled events once in chronological order and captures checkpoints', async () => {
    const injected = [];
    const timeline = createLifeTimeline({
      startAt: '2026-10-01T00:00:00Z',
      events: [
        { day: 2, events: ['open_app'] },
        { day: 0, events: ['workout', 'work'] },
        { day: 1, events: ['poor_sleep'] },
      ],
      onEvent: async event => injected.push(event),
    });

    await timeline.advanceDays(2);
    await timeline.advanceDays(1);

    expect(injected.map(event => event.events)).toEqual([
      ['workout', 'work'],
      ['poor_sleep'],
      ['open_app'],
    ]);
    expect(timeline.snapshot()).toMatchObject({
      currentDay: 3,
      currentTime: '2026-10-04T00:00:00.000Z',
      events: [{ day: 0 }, { day: 1 }, { day: 2 }],
    });
  });

  it('pauses event injection until resumed', async () => {
    const injected = [];
    const timeline = createLifeTimeline({
      startAt: '2026-10-01T00:00:00Z',
      events: [{ day: 1, events: ['job_schedule_changed'] }],
      onEvent: event => injected.push(event),
    });

    timeline.pause();
    await timeline.advanceDays(1);
    expect(injected).toEqual([]);
    expect(timeline.snapshot().currentDay).toBe(0);

    timeline.resume();
    await timeline.advanceDays(1);
    expect(injected).toHaveLength(1);
  });

  it('rejects invalid or backwards time movement', async () => {
    const timeline = createLifeTimeline({ startAt: '2026-10-01T00:00:00Z' });

    await expect(timeline.advanceToDay(-1)).rejects.toThrow();
    expect(() => timeline.advanceDays(1.5)).toThrow();
  });
});

describe('test-lab personas and deterministic fixtures', () => {
  it('covers the twelve blueprint personas and all named fixture families', () => {
    expect(PERSONAS).toHaveLength(12);
    expect(Object.keys(FIXTURE_DEFINITIONS)).toHaveLength(13);
  });

  it.each(Object.entries(FIXTURE_DEFINITIONS))('builds deterministic fixture %s with declared sizes', (fixtureId, definition) => {
    const first = buildFixture(fixtureId);
    const second = buildFixture(fixtureId);

    expect(first.id).toBe(fixtureId);
    expect(first).toEqual(second);
    expect(first.actions).toHaveLength(definition.actions);
    expect(first.goals).toHaveLength(definition.goals);
    expect(new Set(first.actions.map(action => action.id)).size).toBe(definition.actions);
  });

  it('rebuilds the inconsistent-user v3 world with the declared domain counts', () => {
    const first = buildFixture('inconsistent-user-v3');
    expect(first.actions.filter(action => action.type === 'workout' && action.status === 'completed')).toHaveLength(18);
    expect(first.actions.filter(action => action.type === 'workout' && action.status === 'missed')).toHaveLength(9);
    expect(first.actions.filter(action => action.type === 'german_session' && action.status === 'completed')).toHaveLength(12);
    expect(first.actions.filter(action => action.type === 'german_session' && action.status === 'missed')).toHaveLength(6);
    expect(first.goals.filter(goal => goal.targets[0].dueDate)).toHaveLength(3);
  });

  it('rejects unknown fixture names, invalid seeds, and impossible simulated dates', () => {
    expect(() => buildFixture('unknown')).toThrow('Unknown test-lab fixture');
    expect(() => buildFixture('fresh-user', { seed: -1 })).toThrow('non-negative integer');
    expect(() => buildFixture('fresh-user', { simulatedDate: '2026-02-30' })).toThrow('not a real calendar date');
  });
});
