import { describe, expect, it } from 'vitest';

import {
  CALIBRATION_STAGES,
  composeCalibratedScore,
  getCalibrationStage,
  applyCalibrationHysteresis,
} from '../../src/core/scoring/calibration.js';

import {
  DISCIPLINE_CONTRACT,
  SCORE_AXES,
  SCORING_CONTRACTS,
} from '../../src/core/scoring/scoringContracts.js';

describe('workstream calibration and scoring contracts', () => {
  it('defines a calibrated score stage for evidence quality', () => {
    expect(CALIBRATION_STAGES[0].name).toBe('No data');
    expect(CALIBRATION_STAGES[5].name).toBe('Stable');

    const low = getCalibrationStage({ score: 58, coverage: 0.1, confidence: 0.21 });
    const medium = getCalibrationStage({ score: 61, coverage: 0.45, confidence: 0.48 });
    const strong = getCalibrationStage({ score: 66, coverage: 0.84, confidence: 0.84 });

    expect(low.stage).toBe(0);
    expect(medium.stage).toBe(2);
    expect(strong.stage).toBe(4);

    const output = composeCalibratedScore({ score: 72, coverage: 0.8, confidence: 0.81, sampleSize: 14 });
    expect(output.score).toBe(72);
    expect(output.calibration.stage).toBeGreaterThanOrEqual(3);
    expect(output.calibration.label).toBeTruthy();
    expect(output.sampleSize).toBe(14);
    expect(output.calibration.stage).toBe(4);

    expect(getCalibrationStage({ score: 50, coverage: 0, confidence: 0.25, hasBaseline: true }).stage).toBe(1);
    expect(getCalibrationStage({ score: 50, coverage: 0.4, confidence: 0.5, sampleSize: 2 }).stage).toBe(1);
    expect(getCalibrationStage({ score: 50, coverage: 0.4, confidence: 0.5, sampleSize: 3 }).stage).toBe(2);
    expect(applyCalibrationHysteresis(4, 3, { coverage: 0.75, confidence: 0.78 })).toBe(4);
    expect(applyCalibrationHysteresis(4, 3, { coverage: 0.2, confidence: 0.2 })).toBe(3);
  });

  it('exports the canonical scoring contracts and axes', () => {
    expect(SCORE_AXES).toContain('body');
    expect(SCORE_AXES).toContain('discipline');
    expect(SCORE_AXES).toContain('strategy');
    expect(SCORING_CONTRACTS.discipline).toBe(DISCIPLINE_CONTRACT);
    expect(DISCIPLINE_CONTRACT.signals).toContain('consistency');
    expect(DISCIPLINE_CONTRACT.signals).toContain('recovery');
    expect(DISCIPLINE_CONTRACT.explainability).toContain('Why did this number change?');
  });
});
