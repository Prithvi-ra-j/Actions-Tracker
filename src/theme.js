/**
 * Shared design-token bridge.
 *
 * Components should prefer CSS variables so one source of truth controls
 * runtime themes. These exports remain for legacy JS consumers.
 */
export const COLORS = {
  accent: 'var(--ac)',
  domains: {
    body: 'var(--body)',
    discipline: 'var(--discipline)',
    knowledge: 'var(--knowledge)',
    philosophy: 'var(--knowledge)',
    creativity: 'var(--creativity)',
    strategy: 'var(--strategy)',
    social: 'var(--social)',
  },
  status: {
    success: 'var(--success)',
    warning: 'var(--warning)',
    error: 'var(--danger)',
    neutral: 'var(--mu)',
  },
};

export const SPACING = Object.freeze({
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  xxl: '3rem',
});

export const TYPOGRAPHY = Object.freeze({
  fontMono: 'var(--font-mono)',
  fontSans: 'var(--font-sans)',
});
