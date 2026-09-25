/**
 * Central feature-flag registry.
 *
 * Step 0 establishes one place for controlled rollout/verification. Flags are
 * intentionally environment-driven so local QA, preview deployments and
 * production can use the same code without editing components.
 *
 * Values are read once at module load. Set VITE_FLAG_<NAME>=true|false.
 */
const DEFAULTS = {
  guideAudit: true,
  contextualJarvis: true,
  proposalActions: true,
  learningLifecycle: true,
};

function readBoolean(name, fallback) {
  const raw = import.meta.env?.[`VITE_FLAG_${name.toUpperCase()}`];
  if (raw == null || raw === '') return fallback;
  return String(raw).toLowerCase() === 'true';
}

export const FEATURE_FLAGS = Object.freeze(
  Object.fromEntries(
    Object.entries(DEFAULTS).map(([name, fallback]) => [name, readBoolean(name, fallback)])
  )
);

export function isFeatureEnabled(name) {
  return Boolean(FEATURE_FLAGS[name]);
}

export function getFeatureFlags() {
  return { ...FEATURE_FLAGS };
}
