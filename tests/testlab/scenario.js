const NETWORK_PROFILES = new Set(['normal', 'slow', 'intermittent', 'offline']);

function requireNonEmptyString(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Scenario "${field}" must be a non-empty string.`);
  }
}

export function validateScenario(scenario) {
  if (!scenario || typeof scenario !== 'object' || Array.isArray(scenario)) {
    throw new Error('A scenario must be an object.');
  }

  for (const field of ['id', 'title', 'persona', 'fixture', 'objective']) {
    requireNonEmptyString(scenario[field], field);
  }

  if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(scenario.id)) {
    throw new Error('Scenario "id" must use uppercase letters, numbers, and hyphens.');
  }

  if (!scenario.environment || typeof scenario.environment !== 'object') {
    throw new Error('Scenario "environment" is required.');
  }
  requireNonEmptyString(scenario.environment.device, 'environment.device');
  requireNonEmptyString(scenario.environment.viewport, 'environment.viewport');
  if (scenario.environment.timezone !== undefined) {
    requireNonEmptyString(scenario.environment.timezone, 'environment.timezone');
  }
  if (!NETWORK_PROFILES.has(scenario.environment.network)) {
    throw new Error(`Unsupported network profile "${scenario.environment.network}".`);
  }
  if (scenario.environment.clock !== 'test') {
    throw new Error('Scenarios must use the deterministic test clock.');
  }

  if (typeof scenario.testTime !== 'string' || !Number.isFinite(Date.parse(scenario.testTime))) {
    throw new Error('Scenario "testTime" must be a valid date-time string.');
  }
  if (!/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(scenario.testTime)) {
    throw new Error('Scenario "testTime" must include an explicit timezone.');
  }

  for (const field of ['actions', 'expected', 'invariants']) {
    if (!Array.isArray(scenario[field]) || scenario[field].length === 0) {
      throw new Error(`Scenario "${field}" must be a non-empty array.`);
    }
    scenario[field].forEach((entry, index) => requireNonEmptyString(entry, `${field}[${index}]`));
  }

  if (scenario.breakTests !== undefined) {
    if (!Array.isArray(scenario.breakTests)) {
      throw new Error('Scenario "breakTests" must be an array when provided.');
    }
    scenario.breakTests.forEach((entry, index) => requireNonEmptyString(entry, `breakTests[${index}]`));
  }
  if (scenario.limits) {
    for (const field of ['durationMs', 'maxBrowserActions', 'maxRetries']) {
      if (!Number.isInteger(scenario.limits[field]) || scenario.limits[field] < 0) {
        throw new Error(`Scenario limit "${field}" must be a non-negative integer.`);
      }
    }
    if (scenario.limits.destructiveAuthorized !== undefined &&
        typeof scenario.limits.destructiveAuthorized !== 'boolean') {
      throw new Error('Scenario limit "destructiveAuthorized" must be a boolean.');
    }
  }

  if (!scenario.evidence || typeof scenario.evidence !== 'object') {
    throw new Error('Scenario "evidence" is required.');
  }
  for (const field of ['screenshots', 'console', 'network', 'stateSnapshot']) {
    if (typeof scenario.evidence[field] !== 'boolean') {
      throw new Error(`Scenario evidence "${field}" must be a boolean.`);
    }
  }

  return scenario;
}

export function defineScenario(scenario) {
  return Object.freeze(validateScenario(scenario));
}
