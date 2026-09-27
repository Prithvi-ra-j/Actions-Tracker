export const CALIBRATION_STAGES = Object.freeze([
  { name: 'No data', stage: 0, minCoverage: 0, minConfidence: 0 },
  { name: 'Initial estimate', stage: 1, minCoverage: 0.15, minConfidence: 0.2 },
  { name: 'Early signal', stage: 2, minCoverage: 0.35, minConfidence: 0.45 },
  { name: 'Developing pattern', stage: 3, minCoverage: 0.55, minConfidence: 0.6 },
  { name: 'Established', stage: 4, minCoverage: 0.75, minConfidence: 0.8 },
  { name: 'Stable', stage: 5, minCoverage: 0.9, minConfidence: 0.9 },
]);

export function getCalibrationStage({ score, coverage = 0, confidence = 0 }) {
  const normalizedScore = Number.isFinite(score) ? Number(score) : 0;
  const coverageValue = Number.isFinite(coverage) ? Number(coverage) : 0;
  const confidenceValue = Number.isFinite(confidence) ? Number(confidence) : 0;

  for (let i = CALIBRATION_STAGES.length - 1; i >= 0; i -= 1) {
    const stage = CALIBRATION_STAGES[i];
    const meetsCoverage = coverageValue >= stage.minCoverage;
    const meetsConfidence = confidenceValue >= stage.minConfidence;
    const isMeaningful = normalizedScore > 0 || meetsCoverage || meetsConfidence;

    if (isMeaningful && meetsCoverage && meetsConfidence) {
      return { ...stage, score: normalizedScore, coverage: coverageValue, confidence: confidenceValue };
    }
  }

  return {
    ...CALIBRATION_STAGES[0],
    score: normalizedScore,
    coverage: coverageValue,
    confidence: confidenceValue,
  };
}

export function composeCalibratedScore({ score, coverage = 0, confidence = 0 }) {
  const calibration = getCalibrationStage({ score, coverage, confidence });
  return {
    score,
    coverage,
    confidence,
    calibration: {
      stage: calibration.stage,
      name: calibration.name,
      label: calibration.name,
      confidence,
      coverage,
    },
  };
}
