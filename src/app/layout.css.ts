import { style } from '@vanilla-extract/css';

export const rootHtml = style({
  height: '100%',
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
});

export const rootBody = style({
  minHeight: '100%',
  display: 'flex',
  flexDirection: 'column',
});
