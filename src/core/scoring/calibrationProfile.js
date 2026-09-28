const clamp01 = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

export const CALIBRATION_PROFILE_VERSION = '1.0';

export function calculateCalibrationProfile({
  sampleSize = 0,
  coverage = 0,
  confidence = 0,
  freshness = 1,
  contradictionRate = 0,
  sourceDiversity = 1,
  baselineAvailable = false,
  now = new Date(),
} = {}) {
  const samples = Math.max(0, Math.floor(Number(sampleSize) || 0));
  const cov = clamp01(coverage);
  const conf = clamp01(confidence);
  const fresh = clamp01(freshness);
  const contradictions = clamp01(contradictionRate);
  const diversity = clamp01(sourceDiversity);

  const sampleFactor = Math.min(1, samples / 28);
  const contradictionFactor = 1 - contradictions;
  const rawSignal = (
    cov * 0.28 +
    conf * 0.28 +
    fresh * 0.16 +
    sampleFactor * 0.16 +
    diversity * 0.08 +
    (baselineAvailable ? 0.04 : 0)
  ) * contradictionFactor;

  let stage = 'No data';
  if (samples >= 28 && cov >= 0.9 && conf >= 0.9 && fresh >= 0.8 && contradictions <= 0.1) stage = 'Stable';
  else if (samples >= 14 && cov >= 0.75 && conf >= 0.8 && fresh >= 0.65 && contradictions <= 0.2) stage = 'Established';
  else if (samples >= 7 && cov >= 0.55 && conf >= 0.6 && fresh >= 0.5) stage = 'Developing pattern';
  else if (samples >= 3 && cov >= 0.35 && conf >= 0.45) stage = 'Early signal';
  else if (baselineAvailable || samples > 0 || cov > 0 || conf > 0) stage = 'Initial estimate';

  return {
    version: CALIBRATION_PROFILE_VERSION,
    generatedAt: now.toISOString(),
    sampleSize: samples,
    coverage: cov,
    confidence: conf,
    freshness: fresh,
    contradictionRate: contradictions,
    sourceDiversity: diversity,
    evidenceSufficiency: Math.round(rawSignal * 100) / 100,
    stage,
    sufficientlyCalibrated: ['Established', 'Stable'].includes(stage),
    warning: stage === 'No data'
      ? 'Insufficient evidence.'
      : contradictions > 0.25
        ? 'Conflicting evidence is limiting confidence.'
        : fresh < 0.35
          ? 'Evidence is stale; recent observations would improve calibration.'
          : null,
  };
}

export function getCalibrationDisplay(profile) {
  if (!profile) return { headline: 'Insufficient evidence.', detail: 'No calibration profile is available.' };
  const confidence = Math.round(clamp01(profile.confidence) * 100);
  return {
    headline: profile.stage === 'No data' ? 'Insufficient evidence.' : profile.stage,
    detail: `Confidence ${confidence}% · ${profile.sampleSize} evidence events · ${Math.round(profile.coverage * 100)}% coverage`,
  };
}
