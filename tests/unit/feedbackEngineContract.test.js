import { describe, expect, it } from 'vitest';

describe('feedback engine contract', () => {
  it('delegates approved recommendations to the generalized executor', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync('src/core/ai/feedbackEngine.js', 'utf8');
    expect(source).toContain("import { executeAction } from './actionExecutor.js'");
    expect(source).toContain("actionType: 'add_quest'");
    expect(source).toContain('refusing replay');
  });
});