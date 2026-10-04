import { createGlobalTheme } from '@vanilla-extract/css';

/**
 * LI Kitchen & Bed — Canonical Design System Tokens
 *
 * Exclusively HSL colors, rem-based dimensional units, and logical layout tokens.
 */
export const vars = createGlobalTheme(':root', {
  color: {
    background: 'hsl(222, 47%, 8%)',
    surface: 'hsl(217, 33%, 15%)',
    surfaceHover: 'hsl(217, 33%, 18%)',
    border: 'hsl(215, 25%, 27%)',

    textPrimary: 'hsl(210, 40%, 98%)',
    textSecondary: 'hsl(215, 20%, 65%)',
    accent: 'hsl(199, 89%, 48%)',

    success: 'hsl(142, 71%, 45%)',
    successHover: 'hsl(142, 71%, 38%)',
    danger: 'hsl(0, 84%, 60%)',
    dangerHover: 'hsl(0, 84%, 50%)',
    warning: 'hsl(48, 96%, 53%)',
    badgeBg: 'hsl(199, 89%, 30%)',
    focusRing: 'hsl(199, 89%, 48%)',

    // Alert & status surfaces
    dangerSurface: 'hsl(0, 60%, 97%)',
    dangerSurfaceBorder: 'hsl(0, 60%, 50%)',
    dangerSurfaceText: 'hsl(0, 60%, 25%)',
    dangerSurfaceMuted: 'hsl(0, 60%, 92%)',
    warningSurface: 'hsl(35, 90%, 97%)',
    warningSurfaceBorder: 'hsl(35, 90%, 50%)',
    warningSurfaceText: 'hsl(35, 90%, 25%)',

    // Neutral & contextual badges
    badgeNeutralBg: 'hsl(215, 20%, 90%)',
    badgeNeutralText: 'hsl(222, 47%, 8%)',
    badgeSuccessBg: 'hsl(140, 40%, 90%)',
    badgeSuccessText: 'hsl(140, 50%, 25%)',

    // Form controls
    inputBorder: 'hsl(215, 25%, 35%)',
    inputBg: 'hsl(217, 33%, 15%)',
    inputText: 'hsl(210, 40%, 98%)',
  },

  space: {
    none: '0',
    xxs: '0.25rem',
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem',
  },

  typography: {
    fontFamily: {
      body: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      code: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      md: '1rem',
      lg: '1.25rem',
      xl: '1.875rem',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },

  radius: {
    none: '0',
    xs: '0.25rem',
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    full: '9999rem',
  },

  shadow: {
    none: 'none',
    card: '0 0.25rem 0.75rem hsl(0 0% 0% / 0.4)',
  },

  border: {
    hairline: '0.0625rem solid',
  },

  transition: {
    fast: '0.15s ease',
    normal: '0.2s ease',
  },

  breakpoint: {
    tablet: '48rem',
    desktop: '64rem',
  },
});

/**
 * Breakpoint constants for CSS @media queries where CSS custom properties cannot be evaluated.
 */
export const breakpoints = {
  tablet: '48rem',
  desktop: '64rem',
} as const;
