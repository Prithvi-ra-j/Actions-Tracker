import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { closeDB, exportDatabase, initDB } from '../../src/database/db.js';

describe('database backup failures', () => {
  beforeEach(async () => {
    closeDB();
    await initDB();
  });

  afterEach(() => {
    closeDB();
  });

  it('surfaces store read failures instead of exporting a success-shaped empty backup', async () => {
    closeDB();

    await expect(exportDatabase()).rejects.toThrow('Database is not initialised');
  });
});
