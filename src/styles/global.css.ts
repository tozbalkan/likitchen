import { globalStyle } from '@vanilla-extract/css';
import { vars } from './theme.css';

/**
 * LI Kitchen & Bed — Global CSS Resets & Document Base Styles
 */

globalStyle('*, *::before, *::after', {
  boxSizing: 'border-box',
  marginBlock: 0,
  marginInline: 0,
  paddingBlock: 0,
  paddingInline: 0,
});

globalStyle('html, body', {
  fontFamily: vars.typography.fontFamily.body,
  backgroundColor: vars.color.background,
  color: vars.color.textPrimary,
  minHeight: '100vh',
  lineHeight: vars.typography.lineHeight.normal,
});

globalStyle(':focus-visible', {
  outline: `${vars.space.xxs} solid ${vars.color.focusRing}`,
  outlineOffset: vars.space.xxs,
});

globalStyle('@media (prefers-reduced-motion: reduce)', {
  vars: {},
});
