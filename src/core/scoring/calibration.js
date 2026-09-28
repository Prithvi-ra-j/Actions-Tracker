export const CALIBRATION_VERSION = '1.1';

export const CALIBRATION_STAGES = Object.freeze([
  { name: 'No data', stage: 0, minCoverage: 0, minConfidence: 0, minSampleSize: 0 },
  { name: 'Initial estimate', stage: 1, minCoverage: 0.2, minConfidence: 0.2, minSampleSize: 0 },
  { name: 'Early signal', stage: 2, minCoverage: 0.35, minConfidence: 0.45, minSampleSize: 3 },
  { name: 'Developing pattern', stage: 3, minCoverage: 0.55, minConfidence: 0.6, minSampleSize: 7 },
  { name: 'Established', stage: 4, minCoverage: 0.75, minConfidence: 0.8, minSampleSize: 14 },
  { name: 'Stable', stage: 5, minCoverage: 0.9, minConfidence: 0.9, minSampleSize: 28 },
]);

const HYSTERESIS = 0.05;

function clamp01(value) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function getCalibrationStage({
  score,
  coverage = 0,
  confidence = 0,
  sampleSize = null,
  hasBaseline = false,
}) {
  const normalizedScore = Number.isFinite(score) ? Number(score) : 0;
  const coverageValue = clamp01(coverage);
  const confidenceValue = clamp01(confidence);
  const samplesProvided = Number.isFinite(sampleSize);
  const samples = Math.max(0, samplesProvided ? Math.floor(sampleSize) : 0);

  for (let i = CALIBRATION_STAGES.length - 1; i >= 0; i -= 1) {
    const stage = CALIBRATION_STAGES[i];
    const baselineEligible = stage.stage === 1 && hasBaseline && confidenceValue >= stage.minConfidence;
    const meets = (!samplesProvided || samples >= stage.minSampleSize)
      && coverageValue >= stage.minCoverage
      && confidenceValue >= stage.minConfidence;
    if (baselineEligible || meets) {
      return {
        ...stage,
        score: normalizedScore,
        coverage: coverageValue,
        confidence: confidenceValue,
        sampleSize: samples,
      };
    }
  }

  return { ...CALIBRATION_STAGES[0], score: normalizedScore, coverage: coverageValue, confidence: confidenceValue, sampleSize: samples };
}

export function applyCalibrationHysteresis(previousStage, nextStage, {
  coverage = 0,
  confidence = 0,
} = {}) {
  const previous = Number.isFinite(previousStage) ? previousStage : 0;
  const next = Number.isFinite(nextStage) ? nextStage : 0;
  if (next >= previous) return next;
  const lowerThreshold = CALIBRATION_STAGES[previous]?.minConfidence
    ? CALIBRATION_STAGES[previous].minConfidence - HYSTERESIS
    : 0;
  return clamp01(confidence) < lowerThreshold || clamp01(coverage) < lowerThreshold
    ? next
    : previous;
}

export function getCalibrationRecommendation({ stage, score, confidence, coverage, sampleSize }) {
  if (stage <= 0) return { type: 'collect', message: 'Start recording meaningful evidence before interpreting this dimension.' };
  if (stage === 1) return { type: 'observe', message: 'This is an initial estimate. Keep using the system so the estimate can calibrate.' };
  if (stage === 2) return { type: 'observe', message: 'Early signal detected. More consistent evidence will improve confidence.' };
  if (stage === 3) return { type: 'stabilize', message: 'A developing pattern is visible. Avoid large plan changes based on one noisy day.' };
  if (stage === 4) return { type: 'maintain', message: 'The pattern is established. Continue collecting evidence and review meaningful changes.' };
  return { type: 'stable', message: 'The signal is stable enough for higher-confidence adaptation.' };
}

export function composeCalibratedScore({
  score,
  coverage = 0,
  confidence = 0,
  sampleSize = 0,
  hasBaseline = false,
  previousStage = null,
}) {
  const raw = getCalibrationStage({ score, coverage, confidence, sampleSize, hasBaseline });
  const stage = previousStage == null
    ? raw.stage
    : applyCalibrationHysteresis(previousStage, raw.stage, { coverage, confidence });
  return {
    score,
    coverage: clamp01(coverage),
    confidence: clamp01(confidence),
    sampleSize: Math.max(0, Number.isFinite(sampleSize) ? Math.floor(sampleSize) : 0),
    calibration: {
      version: CALIBRATION_VERSION,
      stage,
      name: CALIBRATION_STAGES[stage]?.name || 'No data',
      label: CALIBRATION_STAGES[stage]?.name || 'No data',
      confidence: clamp01(confidence),
      coverage: clamp01(coverage),
      sampleSize: Math.max(0, Number.isFinite(sampleSize) ? Math.floor(sampleSize) : 0),
      recommendation: getCalibrationRecommendation({ stage, score, confidence, coverage, sampleSize }),
    },
  };
}
