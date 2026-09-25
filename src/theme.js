/** Canonical design-token bridge for legacy JS consumers. */
export const COLORS = Object.freeze({
  background: 'var(--color-bg)',
  surface1: 'var(--color-surface-1)',
  surface2: 'var(--color-surface-2)',
  text: 'var(--color-text)',
  muted: 'var(--color-text-muted)',
  accent: 'var(--color-accent)',
  domains: {
    body: 'var(--color-axis-body)',
    discipline: 'var(--color-axis-discipline)',
    knowledge: 'var(--color-axis-knowledge)',
    philosophy: 'var(--color-axis-knowledge)',
    creativity: 'var(--color-axis-creativity)',
    strategy: 'var(--color-axis-strategy)',
    social: 'var(--color-axis-social)',
  },
  status: {
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    error: 'var(--color-danger)',
    neutral: 'var(--color-text-muted)',
  },
});

export const SPACING = Object.freeze({
  xs: 'var(--space-1)',
  sm: 'var(--space-2)',
  md: 'var(--space-4)',
  lg: 'var(--space-6)',
  xl: 'var(--space-8)',
  xxl: 'var(--space-12)',
});

export const RADII = Object.freeze({
  container: 'var(--radius-container)',
  control: 'var(--radius-control)',
  chip: 'var(--radius-chip)',
  sheet: 'var(--radius-sheet)',
  check: 'var(--radius-check)',
});

export const TYPOGRAPHY = Object.freeze({
  fontMono: 'var(--font-mono)',
  fontSans: 'var(--font-sans)',
});
