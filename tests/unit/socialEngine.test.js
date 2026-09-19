import { describe, expect, it } from 'vitest';
import { collectSignals } from '../../src/domains/social/socialEngine.js';

describe('socialEngine', () => {
  it('collects social signals without throwing', () => {
    const signals = collectSignals({
      facts: [
        { id: 'interaction-1', type: 'social.interaction', value: 80 },
        { id: 'reflection-1', type: 'social.reflection', value: 60 },
      ],
    });

    expect(signals.map(signal => signal.signal)).toEqual([
      'social.interaction',
      'social.reflection',
    ]);
  });
});
