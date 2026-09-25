import { describe, expect, it } from 'vitest';
import { FEATURE_FLAGS, getFeatureFlags, isFeatureEnabled } from '../../src/core/featureFlags.js';

describe('feature flag registry', () => {
  it('exposes the canonical flags', () => {
    expect(Object.keys(FEATURE_FLAGS)).toEqual([
      'guideAudit',
      'contextualJarvis',
      'proposalActions',
      'learningLifecycle',
    ]);
  });

  it('returns stable snapshots without exposing mutable registry state', () => {
    const snapshot = getFeatureFlags();
    expect(snapshot).toEqual(FEATURE_FLAGS);
    snapshot.guideAudit = !snapshot.guideAudit;
    expect(getFeatureFlags()).toEqual(FEATURE_FLAGS);
  });

  it('answers enablement from the canonical registry', () => {
    for (const name of Object.keys(FEATURE_FLAGS)) {
      expect(isFeatureEnabled(name)).toBe(FEATURE_FLAGS[name]);
    }
    expect(isFeatureEnabled('unknown')).toBe(false);
  });
});
