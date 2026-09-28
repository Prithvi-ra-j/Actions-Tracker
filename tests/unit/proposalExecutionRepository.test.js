// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { closeDB, initDB } from '../../src/database/db.js';
import { beginProposalExecution, finishProposalExecution, getProposalExecution } from '../../src/database/proposalExecutionRepository.js';

describe('proposal execution ledger', () => {
  beforeEach(async () => {
    closeDB();
    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase('actions-tracker');
      request.onsuccess = resolve;
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('database deletion blocked'));
    });
    await initDB();
  });

  it('creates one applying record per idempotency key', async () => {
    const first = await beginProposalExecution({ idempotencyKey: 'proposal:A:apply', proposalId: 'A', actionType: 'add_goal' });
    const second = await beginProposalExecution({ idempotencyKey: 'proposal:A:apply', proposalId: 'A', actionType: 'add_goal' });

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect((await getProposalExecution('proposal:A:apply')).status).toBe('applying');
  });

  it('persists the applied result for replay', async () => {
    await beginProposalExecution({ idempotencyKey: 'proposal:B:apply', proposalId: 'B', actionType: 'add_goal' });
    await finishProposalExecution('proposal:B:apply', { status: 'applied', result: { id: 'goal-1' } });

    const record = await getProposalExecution('proposal:B:apply');
    expect(record.status).toBe('applied');
    expect(record.result.id).toBe('goal-1');
  });
});
