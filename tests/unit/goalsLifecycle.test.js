import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { initDB } from '../../src/database/db.js';
import { createGoal } from '../../src/models/lifeObjectSchema.js';
import {
  addGoal,
  addGoalEvidence,
  getGoal,
  getGoalEvidence,
  reviseGoalTarget,
  setGoalStatus,
} from '../../src/database/goalsRepository.js';

describe('goal lifecycle', () => {
  it('creates goals with lifecycle and relationship fields', () => {
    const goal = createGoal({
      domain: 'body',
      label: 'Run a faster 10K',
      blockers: ['ankle recovery'],
      supportingObjectIds: ['habit_run'],
    });

    expect(goal.status).toBe('active');
    expect(goal.blockers).toEqual(['ankle recovery']);
    expect(goal.supportingObjectIds).toEqual(['habit_run']);
    expect(goal.pausedAt).toBeNull();
    expect(goal.completedAt).toBeNull();
    expect(goal.evidenceFactIds).toEqual([]);
  });

  it('persists status transitions and clears stale timestamps when reopening', async () => {
    await initDB();
    const goal = await addGoal({
      domain: 'knowledge',
      label: 'Finish a course',
      targets: [{ text: 'Complete module 1', metric: '1 module', completed: false }],
    });

    const paused = await setGoalStatus(goal.id, 'paused');
    expect(paused.status).toBe('paused');
    expect(paused.pausedAt).toBeTruthy();
    expect(paused.completedAt).toBeNull();

    const completed = await setGoalStatus(goal.id, 'completed');
    expect(completed.status).toBe('completed');
    expect(completed.completedAt).toBeTruthy();
    expect(completed.pausedAt).toBeNull();

    const active = await setGoalStatus(goal.id, 'active');
    expect(active.status).toBe('active');
    expect(active.pausedAt).toBeNull();
    expect(active.completedAt).toBeNull();

    const persisted = await getGoal(goal.id);
    expect(persisted.status).toBe('active');
  });

  it('revises and persists an individual milestone without replacing the goal', async () => {
    await initDB();
    const goal = await addGoal({
      domain: 'strategy',
      label: 'Ship portfolio project',
      targets: [
        { text: 'Define scope', metric: '1 scope', completed: false },
        { text: 'Ship MVP', metric: '1 release', completed: false },
      ],
    });

    const updated = await reviseGoalTarget(goal.id, 1, {
      completed: true,
      metric: '1 production release',
    });

    expect(updated.id).toBe(goal.id);
    expect(updated.targets).toHaveLength(2);
    expect(updated.targets[0].completed).toBe(false);
    expect(updated.targets[1]).toMatchObject({
      text: 'Ship MVP',
      completed: true,
      metric: '1 production release',
    });
  });
});


  it('records goal evidence as an immutable fact linked to the goal', async () => {
    await initDB();
    const goal = await addGoal({
      domain: 'body',
      label: 'Build running capacity',
    });

    const updated = await addGoalEvidence(goal.id, 'Completed a pain-free 30 minute base run.');
    expect(updated.evidenceFactIds).toHaveLength(1);

    const evidence = await getGoalEvidence(goal.id);
    expect(evidence).toHaveLength(1);
    expect(evidence[0].objectId).toBe(goal.id);
    expect(evidence[0].type).toBe('goal_evidence');
    expect(evidence[0].meta.text).toContain('pain-free');
  });
