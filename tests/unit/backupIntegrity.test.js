import { describe, expect, it } from 'vitest';
import { addBackupIntegrity, verifyBackupIntegrity } from '../../src/database/backupIntegrity.js';

describe('backup integrity', () => {
  it('adds and verifies a SHA-256 checksum', async () => {
    const payload = { _meta: { appVersion: '1.5.1.1', schemaVersion: 1 }, goals: [{ id: 'g1' }] };
    const signed = await addBackupIntegrity(payload);
    expect(signed._meta.integrity.algorithm).toBe('SHA-256');
    expect((await verifyBackupIntegrity(signed)).verified).toBe(true);
  });

  it('rejects tampered payloads', async () => {
    const signed = await addBackupIntegrity({ _meta: { schemaVersion: 1 }, goals: [{ id: 'g1' }] });
    signed.goals[0].id = 'tampered';
    const result = await verifyBackupIntegrity(signed);
    expect(result.verified).toBe(false);
    expect(result.reason).toBe('checksum_mismatch');
  });

  it('preserves legacy backup compatibility', async () => {
    expect(await verifyBackupIntegrity({ _meta: { schemaVersion: 1 }, goals: [] })).toEqual({
      verified: false,
      legacy: true,
      reason: 'missing_integrity',
    });
  });
});
