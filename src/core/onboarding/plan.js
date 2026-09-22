// src/core/onboarding/plan.js
//
// Onboarding establishes the user's direction and starting context.
// It deliberately does NOT construct quests, habits, schedules, or time budgets.
// Jarvis owns that design loop after the user reaches the app.

export function buildCommitPlan(draft, existing = null) {
  const focusAxes = draft.answers.focusAxes || [];
  const baseline = draft.answers.baseline || {};

  const plan = {
    axisConfigs: [],
    quests: [],
    habits: [],
    routine: null,
    selfModel: {
      identity: draft.answers.identity,
      focusAxes,
      baseline,
      currentState: {},
      priors: {},
      desiredSelf: draft.answers.desiredSelf,
      setupState: 'jarvis_design_pending',
      provenance: draft.provenance,
    },
    logs: [],
    settings: {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      weekStart: draft.answers.identity?.weekStart ?? 1,
      aiBaseUrl: draft.answers.ai?.baseUrl,
      aiModel: draft.answers.ai?.model,
      onboardingAiConsent: draft.answers.ai?.consent ?? false
    },
    findings: []
  };

  for (const axis of focusAxes) {
    const b = baseline[axis] || {};

    // Actual frequency is useful baseline evidence, but it is NOT an intended
    // schedule. Jarvis will establish cadence after understanding the user's goals.
    plan.axisConfigs.push({
      axis,
      baselineRatePerWeek: Number.isFinite(b.ratePerWeek) ? b.ratePerWeek : 0,
      expectedPerWeek: null,
      paused: false,
      hasConsistencyTerm: false,
      scoringMode: 'awaiting_jarvis_design',
      source: 'onboarding'
    });
  }

  // Discipline is cross-cutting and can be introduced later by Jarvis once
  // there are real commitments to observe.
  if (!plan.axisConfigs.find(config => config.axis === 'discipline')) {
    const disciplineBaseline = baseline.discipline || {};
    plan.axisConfigs.push({
      axis: 'discipline',
      baselineRatePerWeek: Number.isFinite(disciplineBaseline.keptShare)
        ? disciplineBaseline.keptShare * 7
        : 0,
      expectedPerWeek: null,
      paused: false,
      hasConsistencyTerm: false,
      scoringMode: 'awaiting_jarvis_design',
      source: 'onboarding'
    });
  }

  return plan;
}
