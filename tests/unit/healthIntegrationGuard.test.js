import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('health integration guard', () => {
  it('has no legacy mock adapter or mock fetch path', () => {
    const adapterPath = path.resolve('src/core/adapters/healthConnectAdapter.js');
    expect(fs.existsSync(adapterPath)).toBe(false);
  });

  it('uses the connector as the registered health integration', () => {
    const appSource = fs.readFileSync(path.resolve('src/App.jsx'), 'utf8');
    expect(appSource).toContain("registerConnector(new HealthConnectConnector())");
    expect(appSource).not.toContain('syncHealthData');
  });
});