import { describe, expect, it } from 'vitest';

describe('score display contract', () => {
  it('requires projection metadata in the App-to-Stats handoff', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync('src/App.jsx', 'utf8');
    expect(source).toContain('scoreSource: projection.scoreSource');
    expect(source).toContain('coverage: projection.coverage');
    expect(source).toContain('confidence: projection.confidence');
  });
});