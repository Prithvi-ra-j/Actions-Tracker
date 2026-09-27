import { describe, expect, it } from 'vitest';
import { inferAssistantMode, resolveAssistantMode } from '../../src/core/ai/assistantModeResolver.js';
import { redactContextForLLM, redactSensitiveText } from '../../src/core/ai/contextRedaction.js';

describe('Jarvis intelligence boundaries', () => {
  it('infers useful modes without requiring a mode picker', () => {
    expect(inferAssistantMode('Can you review my progress?')).toBe('review');
    expect(inferAssistantMode('Help me plan next week')).toBe('plan');
    expect(inferAssistantMode('Log that I finished the workout')).toBe('capture');
    expect(resolveAssistantMode('review this', 'audit')).toBe('audit');
  });

  it('redacts common secrets before context leaves the app', () => {
    const text = redactSensitiveText('email me at test@example.com with key sk_abcdefghijklmnopqrstuvwxyz');
    expect(text).not.toContain('test@example.com');
    expect(text).not.toContain('sk_abcdefghijklmnopqrstuvwxyz');
  });

  it('removes identity name from outbound model context while retaining useful context', () => {
    const safe = redactContextForLLM({
      user_identity: { name: 'Private Name', roles: ['builder'], constraints: ['9am to 6pm'] },
      semantic_memories: [{ id: 'm1', content: 'Contact test@example.com', confidence: 0.8 }],
    });
    expect(safe.user_identity.name).toBeUndefined();
    expect(safe.user_identity.roles).toEqual(['builder']);
    expect(safe.semantic_memories[0].content).toContain('[redacted-email]');
  });
});
