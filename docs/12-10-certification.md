# Actions-Tracker 12/10 Certification

## Definition

**12/10 = the system can demonstrate, with longitudinal evidence, that its intelligence improves its decisions over time while remaining trustworthy, explainable, controllable, and resilient.**

## Implemented architecture

| Capability | Implementation | Evidence |
|---|---|---|
| Continuous personal baselines | `src/core/calibration/` | Baseline, deviation, trend and confidence modules + tests |
| Goal adaptation | `src/core/goals/goalOutcomeEngine.js`, `goalAdaptationEngine.js`, `goalLearningEngine.js` | Outcome/adaptation tests |
| Intervention learning | `src/core/interventions/` | Effectiveness, predictor, outcome collector and decision outcome metrics |
| Adaptive Today | `todayRecommendationEngine.js` | Baseline signals, intervention history, confidence, impact and expiry fields |
| Evidence provenance | `src/core/evidence/` | Claims, provenance graph and contradiction handling |
| Memory trust model | `src/core/ai/trustModel.js` | Explicit truth classes and trust levels |
| Connector platform | `src/core/sync/` | Contract validation, normalization and replay-safe deduplication |
| Data recovery | `src/core/recovery/dataIntegrity.js` | Integrity scan and recovery classification |
| Performance | `src/core/observability/performanceBudget.js` | Measurable local performance budgets |
| Intelligence evaluation | `tests/intelligence/` | Calibration, recommendation, intervention, grounding, contradiction and proactive tests |
| Agent security | `tests/security/` | Action schema, redaction and indirect-injection tests |

## Current validation state

- [x] Repository unit/property/scenario/build workflow passes on latest validated implementation run.
- [x] Intelligence evaluation tests are part of CI.
- [x] Security adversarial tests are part of CI.
- [x] Integration contract tests are part of CI.
- [x] Data-integrity tests are part of CI.
- [ ] Real Android device certification.
- [ ] Health Connect / NutriLift provider certification.
- [ ] TalkBack/accessibility certification.
- [ ] Real-device performance measurements.
- [ ] 30/60/90-day longitudinal outcome evidence.

## Longitudinal proof metrics

The product should retain these metrics over time:

- `decision_outcome_rate`: measurable positive outcome / eligible recommendations.
- `intervention_success_rate`: positive intervention outcomes / completed interventions.
- `grounding_rate`: grounded claims / claims presented as factual.
- `contradiction_rate`: conflicted claims / claims evaluated.
- `baseline_confidence`: confidence of each learned personal baseline.
- `adaptation_count`: goal plans changed because of measured evidence.
- `false_positive_rate`: surfaced proactive signals rejected or marked not relevant.
- `recommendation_acceptance_rate` and `execution_rate`.

## Golden longitudinal journey

### Day 1
User creates a goal. System stores the goal, plan, evidence requirements and initial provisional state.

### Days 2–7
Meaningful completions and misses become observations. Baselines remain provisional.

### Day 14+
Baseline confidence grows as observations accumulate. Deviations are calculated against the user's own history rather than a population default.

### Day 30
Repeated patterns can become learned patterns only when evidence and confidence thresholds are met.

### Day 45+
Interventions record a hypothesis, baseline, outcome window and measured result. Effectiveness is stored without claiming causation.

### Day 60+
Successful intervention types can receive evidence-backed ranking adjustments. Failed interventions reduce reuse.

### Day 90
The evaluation layer can compare recommendation and intervention outcomes over time.

## Certification rule

This document is a **proof framework**, not a claim that 90-day real-user evidence already exists. A full 12/10 release requires the unchecked real-world gates above to be completed with dated evidence.
