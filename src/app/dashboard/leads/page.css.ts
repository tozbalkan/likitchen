import { style, styleVariants } from '@vanilla-extract/css';
import { vars, breakpoints } from '../../../styles/theme.css';

/**
 * LI Kitchen & Bed — Sales Rep Lead Dashboard Styles
 *
 * Authored in Vanilla Extract strictly consuming design tokens.
 * Mobile-first responsive layout, logical properties, accessible states.
 */

export const dashboardContainer = style({
  minHeight: '100vh',
  paddingBlock: vars.space.md,
  paddingInline: vars.space.md,

  '@media': {
    [`(min-width: ${breakpoints.tablet})`]: {
      paddingBlock: vars.space.xl,
      paddingInline: vars.space.xl,
    },
  },
});

export const dashboardHeader = style({
  marginBlockEnd: vars.space.xl,
  borderBlockEnd: `${vars.border.hairline} ${vars.color.border}`,
  paddingBlockEnd: vars.space.md,
});

export const headerToolbar = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: vars.space.md,
});

export const headerTitleGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.xxs,
});

export const dashboardTitle = style({
  fontSize: vars.typography.fontSize.xl,
  fontWeight: vars.typography.fontWeight.bold,
  color: vars.color.accent,
  lineHeight: vars.typography.lineHeight.tight,
});

export const dashboardSubtitle = style({
  color: vars.color.textSecondary,
  fontSize: vars.typography.fontSize.md,
  lineHeight: vars.typography.lineHeight.normal,
});

export const headerControls = style({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: vars.space.md,
  fontSize: vars.typography.fontSize.sm,
});

export const tenantSelectWrapper = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.xs,
});

export const tenantLabel = style({
  color: vars.color.textSecondary,
  fontWeight: vars.typography.fontWeight.semibold,
  fontSize: vars.typography.fontSize.sm,
});

export const tenantSelect = style({
  paddingBlock: vars.space.xxs,
  paddingInline: vars.space.xs,
  borderRadius: vars.radius.xs,
  border: `${vars.border.hairline} ${vars.color.inputBorder}`,
  backgroundColor: vars.color.surface,
  color: vars.color.inputText,
  fontSize: vars.typography.fontSize.sm,
  minHeight: '2.25rem',
  cursor: 'pointer',

  ':focus-visible': {
    outline: `${vars.space.xxs} solid ${vars.color.focusRing}`,
    outlineOffset: vars.space.xxs,
  },
});

export const tenantBadge = style({
  paddingBlock: vars.space.xxs,
  paddingInline: vars.space.xs,
  backgroundColor: vars.color.badgeNeutralBg,
  color: vars.color.badgeNeutralText,
  borderRadius: vars.radius.xs,
  fontWeight: vars.typography.fontWeight.semibold,
  fontSize: vars.typography.fontSize.sm,
});

export const roleBadge = style({
  paddingBlock: vars.space.xxs,
  paddingInline: vars.space.xs,
  backgroundColor: vars.color.badgeSuccessBg,
  color: vars.color.badgeSuccessText,
  borderRadius: vars.radius.xs,
  fontWeight: vars.typography.fontWeight.semibold,
  fontSize: vars.typography.fontSize.sm,
});

export const leadsGrid = style({
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: vars.space.lg,

  '@media': {
    [`(min-width: ${breakpoints.tablet})`]: {
      gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))',
    },
  },
});

export const leadCard = style({
  border: `${vars.border.hairline} ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  paddingBlock: vars.space.lg,
  paddingInline: vars.space.lg,
  backgroundColor: vars.color.surface,
  boxShadow: vars.shadow.card,
  transition: `background-color ${vars.transition.normal}, transform ${vars.transition.normal}`,

  ':hover': {
    backgroundColor: vars.color.surfaceHover,
    transform: 'translateY(-0.125rem)',
  },

  '@media': {
    '(prefers-reduced-motion: reduce)': {
      transition: 'none',
      ':hover': {
        transform: 'none',
      },
    },
  },
});

export const leadCardHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBlockEnd: vars.space.md,
});

export const customerName = style({
  fontSize: vars.typography.fontSize.lg,
  fontWeight: vars.typography.fontWeight.semibold,
  color: vars.color.textPrimary,
  lineHeight: vars.typography.lineHeight.tight,
});

export const scoreBadge = style({
  backgroundColor: vars.color.badgeBg,
  color: vars.color.textPrimary,
  paddingBlock: vars.space.xxs,
  paddingInline: vars.space.sm,
  borderRadius: vars.radius.full,
  fontSize: vars.typography.fontSize.sm,
  fontWeight: vars.typography.fontWeight.bold,
});

export const leadDetails = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.xs,
  color: vars.color.textSecondary,
  fontSize: vars.typography.fontSize.md,
  lineHeight: vars.typography.lineHeight.normal,
});

export const statusReady = style({
  color: vars.color.success,
  fontWeight: vars.typography.fontWeight.semibold,
});

export const statusUnresolved = style({
  color: vars.color.warning,
  fontWeight: vars.typography.fontWeight.semibold,
});

const btnTakeoverBase = style({
  marginBlockStart: vars.space.lg,
  width: '100%',
  paddingBlock: vars.space.sm,
  paddingInline: vars.space.md,
  borderRadius: vars.radius.md,
  fontWeight: vars.typography.fontWeight.bold,
  fontSize: vars.typography.fontSize.md,
  border: 'none',
  cursor: 'pointer',
  minHeight: '2.75rem',
  transition: `background-color ${vars.transition.normal}`,

  ':focus-visible': {
    outline: `${vars.space.xxs} solid ${vars.color.focusRing}`,
    outlineOffset: vars.space.xxs,
  },
});

export const btnTakeoverVariants = styleVariants({
  bot: [
    btnTakeoverBase,
    {
      backgroundColor: vars.color.success,
      color: vars.color.textPrimary,
      ':hover': {
        backgroundColor: vars.color.successHover,
      },
    },
  ],
  human: [
    btnTakeoverBase,
    {
      backgroundColor: vars.color.danger,
      color: vars.color.textPrimary,
      ':hover': {
        backgroundColor: vars.color.dangerHover,
      },
    },
  ],
});

const alertCardBase = style({
  paddingBlock: vars.space.xl,
  paddingInline: vars.space.xl,
  marginBlock: vars.space.xl,
  marginInline: 'auto',
  maxWidth: '40rem',
  borderRadius: vars.radius.md,
  textAlign: 'center',
});

export const alertCardVariants = styleVariants({
  danger: [
    alertCardBase,
    {
      border: `${vars.border.hairline} ${vars.color.dangerSurfaceBorder}`,
      backgroundColor: vars.color.dangerSurface,
      color: vars.color.dangerSurfaceText,
    },
  ],
  warning: [
    alertCardBase,
    {
      border: `${vars.border.hairline} ${vars.color.warningSurfaceBorder}`,
      backgroundColor: vars.color.warningSurface,
      color: vars.color.warningSurfaceText,
    },
  ],
});

export const alertTitle = style({
  marginBlockEnd: vars.space.md,
  fontWeight: vars.typography.fontWeight.bold,
  fontSize: vars.typography.fontSize.lg,
  lineHeight: vars.typography.lineHeight.tight,
});

export const alertMessage = style({
  marginBlockEnd: vars.space.md,
  lineHeight: vars.typography.lineHeight.normal,
});

export const alertCodeBox = style({
  paddingBlock: vars.space.sm,
  paddingInline: vars.space.sm,
  backgroundColor: vars.color.dangerSurfaceMuted,
  borderRadius: vars.radius.xs,
  fontSize: vars.typography.fontSize.sm,
  fontFamily: vars.typography.fontFamily.code,
  wordBreak: 'break-word',
});

export const retrySelectContainer = style({
  marginBlockStart: vars.space.md,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: vars.space.xs,
});

export const retrySelectLabel = style({
  fontWeight: vars.typography.fontWeight.semibold,
  color: vars.color.warningSurfaceText,
  fontSize: vars.typography.fontSize.sm,
});

export const retrySelect = style({
  paddingBlock: vars.space.xs,
  paddingInline: vars.space.sm,
  borderRadius: vars.radius.xs,
  border: `${vars.border.hairline} ${vars.color.inputBorder}`,
  backgroundColor: vars.color.surface,
  color: vars.color.inputText,
  fontSize: vars.typography.fontSize.sm,
  minHeight: '2.5rem',
  cursor: 'pointer',

  ':focus-visible': {
    outline: `${vars.space.xxs} solid ${vars.color.focusRing}`,
    outlineOffset: vars.space.xxs,
  },
});

export const loadingMessage = style({
  color: vars.color.textSecondary,
  fontSize: vars.typography.fontSize.md,
  lineHeight: vars.typography.lineHeight.normal,
});
