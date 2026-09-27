import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CANONICAL_DOMAINS,
  canonicalDomain,
  canonicalEntityForStore,
  getDomainRegistry,
} from '../../src/core/domain/domainRegistry.js';
import {
  isCanonicalEntity,
  normalizeDomainEntity,
  validateDomainEntity,
} from '../../src/core/domain/domainValidators.js';
import {
  clearMigrationRegistryForTests,
  getRegisteredMigrations,
  registerMigration,
  runRegisteredMigrations,
} from '../../src/database/migrationRegistry.js';
import { initDB, closeDB } from '../../src/database/db.js';
import { getAppMeta, setAppMeta } from '../../src/database/appMetaRepository.js';

describe('Actions-Tracker 2.0 foundation contracts', () => {
  beforeEach(async () => {
    clearMigrationRegistryForTests();
    try { closeDB(); } catch {}
    await initDB();
    await setAppMeta('lastMigrationVersion', 0);
  });

  it('normalizes legacy domain vocabulary without changing canonical values', () => {
    expect(canonicalDomain('strength')).toBe('body');
    expect(canonicalDomain('wisdom')).toBe('strategy');
    expect(canonicalDomain('art')).toBe('creativity');
    expect(canonicalDomain('Body')).toBe('body');
    expect(canonicalDomain('unknown')).toBe('general');
    expect(CANONICAL_DOMAINS).toContain('body');
    expect(canonicalEntityForStore('lifeObjects')).toBe('goal');
    expect(canonicalEntityForStore('questBoard')).toBe('action');
  });

  it('validates canonical entities and rejects malformed confidence', () => {
    const evidence = {
      kind: 'evidence',
      id: 'e-1',
      domain: 'strength',
      signal: 'training_session',
      source: 'user',
      observedAt: '2026-09-27T10:00:00Z',
      confidence: 0.8,
    };

    expect(validateDomainEntity(evidence)).toBe(true);
    expect(normalizeDomainEntity(evidence).domain).toBe('body');
    expect(isCanonicalEntity(evidence)).toBe(true);
    expect(() => validateDomainEntity({ ...evidence, confidence: 2 })).toThrow();
    expect(() => validateDomainEntity({ kind: 'evidence', id: 'e-2' })).toThrow();
    expect(() => validateDomainEntity({ kind: 'not_real', id: 'x' })).toThrow();
  });

  it('runs registered migrations in version order and records completion', async () => {
    const calls = [];

    registerMigration({
      version: 2,
      description: 'second',
      migrate: async () => calls.push(2),
      verify: async () => true,
    });
    registerMigration({
      version: 1,
      description: 'first',
      migrate: async () => calls.push(1),
      verify: async () => true,
    });

    expect(getRegisteredMigrations().map(m => m.version)).toEqual([1, 2]);

    const result = await runRegisteredMigrations();
    expect(calls).toEqual([1, 2]);
    expect(result.applied).toEqual([1, 2]);
    expect(await getAppMeta('lastMigrationVersion')).toBe(2);
    expect((await getAppMeta('migration_1')).status).toBe('completed');

    const secondRun = await runRegisteredMigrations();
    expect(secondRun.applied).toEqual([]);
    expect(calls).toEqual([1, 2]);
  });

  it('does not advance migration state when verification fails', async () => {
    registerMigration({
      version: 3,
      description: 'bad verification',
      migrate: async () => {},
      verify: async () => false,
    });

    await expect(runRegisteredMigrations()).rejects.toThrow(/verification failed/);
    expect(await getAppMeta('lastMigrationVersion')).toBe(0);
    expect((await getAppMeta('migration_3')).status).toBe('failed');
    expect((await getAppMeta('migrationInProgress')).version).toBe(3);
  });

  it('exposes an explicit canonical registry for downstream engines', () => {
    const registry = getDomainRegistry();
    expect(registry.domains).toEqual([...CANONICAL_DOMAINS]);
    expect(registry.entities.goal.owner).toBe('user');
    expect(registry.entities.evidence.history).toBe('append_only');
    expect(registry.legacyDomains.strength).toBe('body');
  });
});
