/**
 * UI Primitives & Design Tokens
 * Replaces scattered inline semantic colors across components.
 */

export const COLORS = {
  // Brand
  accent: '#c1442c',
  
  // Domains (Architectural Axes)
  domains: {
    body: '#c1442c',
    discipline: '#685b8c',
    knowledge: '#4a7ba6',
    philosophy: '#4a7ba6',
    creativity: '#d99a2b',
    strategy: '#4f8a5f',
    social: '#b95b89'
  },
  
  // Semantic Status
  status: {
    success: '#4f8a5f',
    warning: '#d99a2b',
    error: '#c1442c',
    neutral: '#888888'
  }
};

export const SPACING = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  xxl: '3rem'
};

export const TYPOGRAPHY = {
  fontMono: 'monospace',
  fontSans: 'sans-serif',
};
