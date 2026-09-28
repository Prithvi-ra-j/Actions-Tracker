import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('release version contract', () => {
  it('keeps package.json and src/version.js on the same version', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
    const source = fs.readFileSync(path.resolve('src/version.js'), 'utf8');
    const match = source.match(/export const APP_VERSION\s*=\s*'([^']+)'/);
    expect(match?.[1]).toBe(pkg.version);
  });
});
