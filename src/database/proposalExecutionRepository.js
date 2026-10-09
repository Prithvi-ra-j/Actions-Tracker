import { dbAdd, dbGet, dbPut } from './db.js';

const STORE = 'proposalExecutions';

export async function getProposalExecution(idempotencyKey) {
  return dbGet(STORE, idempotencyKey);
}

export async function beginProposalExecution({ idempotencyKey, proposalId, actionType }) {
  const record = {
    idempotencyKey,
    proposalId,
    actionType,
    status: 'applying',
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  try {
    await dbAdd(STORE, record);
    return { created: true, record };
  } catch (error) {
    if (error?.name !== 'ConstraintError') throw error;
    const existing = await getProposalExecution(idempotencyKey);
    if (!existing) throw error;
    return { created: false, record: existing };
  }
}

export async function finishProposalExecution(idempotencyKey, patch) {
  const existing = await getProposalExecution(idempotencyKey);
  if (!existing) throw new Error('Proposal execution record does not exist.');
  const record = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  await dbPut(STORE, record);
  return record;
}
