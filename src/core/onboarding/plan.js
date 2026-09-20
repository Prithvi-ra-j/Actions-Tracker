// src/core/onboarding/plan.js

export function buildCommitPlan(draft, existing = null) {
  const plan = {
    axisConfigs: [],
    quests: [],
    habits: [],
    routine: {
      weeklyBudget: draft.answers.routine?.weeklyBudget ?? 168,
      constraints: draft.answers.routine?.constraints ?? [],
      timeSlots: [],
      overcommittedAcknowledged: draft.answers.routine?.overcommittedAcknowledged ?? false
    },
    selfModel: {
      identity: draft.answers.identity,
      focusAxes: draft.answers.focusAxes,
      baseline: draft.answers.baseline,
      currentState: {},
      priors: {},
      desiredSelf: draft.answers.desiredSelf,
      provenance: draft.provenance,
    },
    logs: [],
    settings: {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      weekStart: draft.answers.identity?.weekStart ?? 1, // 1 for Monday
      aiBaseUrl: draft.answers.ai?.baseUrl,
      aiModel: draft.answers.ai?.model,
      onboardingAiConsent: draft.answers.ai?.consent ?? false
    },
    findings: []
  };

  const now = new Date().toISOString();
  const today = now.split('T')[0];

  // 1. Validate D-01: Focus axes <= 3
  if (plan.selfModel.focusAxes.length > 3) {
    plan.findings.push({ id: 'D-01', severity: 'warn', message: 'More than 3 focus axes selected.' });
  }

  // 2. Process axes
  for (const axis of plan.selfModel.focusAxes) {
    const b = plan.selfModel.baseline[axis];
    if (b) {
      plan.axisConfigs.push({
        axis,
        baselineRatePerWeek: b.ratePerWeek,
        expectedPerWeek: b.intendedPerWeek,
        paused: false,
        source: 'onboarding'
      });

      // Current State and Priors
      // Calculate prior (mocked here, should use calibration if we had it but we can just use rate for now)
      // Actually plan.js is pure so it should just copy from draft. The draft has the reveal step.
    }
  }

  // Process quests
  for (const q of (draft.answers.quests || [])) {
    if (!q.metric || !q.targetValue) {
      plan.findings.push({ id: 'D-03', severity: 'block', message: `Quest '${q.title}' is missing a metric or target.` });
    }
    plan.quests.push({
      ...q,
      id: q.id || `onb3:${q.axis}:${slugify(q.title)}`,
      currentValue: 0,
      done: false
    });
  }

  // Process habits
  for (const h of (draft.answers.habits || [])) {
    plan.habits.push({
      ...h,
      id: h.id || `onb3:habit:${slugify(h.name)}`,
      createdAt: now
    });
  }

  // D-02: Each focus axis has >= 1 quest
  for (const axis of plan.selfModel.focusAxes) {
    if (!plan.quests.find(q => q.axis === axis)) {
      plan.findings.push({ id: 'D-02', severity: 'block', message: `Focus axis '${axis}' has no quests.` });
    }
  }

  // D-08: Habits <= 9
  if (plan.habits.length > 9) {
    plan.findings.push({ id: 'D-08', severity: 'block', message: `Too many habits (${plan.habits.length}). Maximum is 9.` });
  } else if (plan.habits.length > 5) {
    plan.findings.push({ id: 'D-08', severity: 'warn', message: `More than 5 habits is hard to maintain.` });
  }

  return plan;
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}
