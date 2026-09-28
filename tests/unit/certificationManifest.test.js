import { describe, expect, it } from 'vitest';
import { CERTIFICATION_MANIFEST, getCertificationGate } from '../../src/core/certification/certificationManifest.js';

describe('certification manifest', () => {
  it('declares one authority and explicit real-world boundaries', () => {
    expect(CERTIFICATION_MANIFEST.authority).toBe('repository_and_ci');
    expect(getCertificationGate('automated').source).toBe('CI');
    expect(getCertificationGate('android').source).toBe('real_device');
    expect(getCertificationGate('longitudinal_real_world').source).toBe('real_usage');
  });
});
