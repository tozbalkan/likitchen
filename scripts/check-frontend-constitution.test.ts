import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  auditJsxStyleAttributes,
  auditStyleContent,
  auditProjectStructure,
  runFrontendConstitutionAudit,
} from './check-frontend-constitution';

describe('Frontend Constitution Guard', () => {
  describe('auditJsxStyleAttributes (JSX Style Detection via AST)', () => {
    it('1. detects inline object style: style={{ margin: "1rem" }}', () => {
      const code = `
        export function Component() {
          return <div style={{ margin: "1rem" }}>Test</div>;
        }
      `;
      const violations = auditJsxStyleAttributes(code, 'src/component.tsx');
      expect(violations).toHaveLength(1);
      expect(violations[0]!.rule).toBe('NO_JSX_INLINE_STYLE');
      expect(violations[0]!.line).toBe(3);
    });

    it('2. detects inline style variable: style={someVariable}', () => {
      const code = `
        export function Component() {
          const customStyle = { color: 'red' };
          return <div style={customStyle}>Test</div>;
        }
      `;
      const violations = auditJsxStyleAttributes(code, 'src/component.tsx');
      expect(violations).toHaveLength(1);
      expect(violations[0]!.rule).toBe('NO_JSX_INLINE_STYLE');
    });

    it('3. detects spaced JSX style attribute: style = {{ margin: 0 }}', () => {
      const code = `
        export function Component() {
          return <div style   =   {{ margin: 0 }}>Test</div>;
        }
      `;
      const violations = auditJsxStyleAttributes(code, 'src/component.tsx');
      expect(violations).toHaveLength(1);
      expect(violations[0]!.rule).toBe('NO_JSX_INLINE_STYLE');
    });

    it('17. does not false-positive on normal className strings', () => {
      const code = `
        import * as styles from './component.css';
        export function Component() {
          return <div className={styles.container}>Test</div>;
        }
      `;
      const violations = auditJsxStyleAttributes(code, 'src/component.tsx');
      expect(violations).toHaveLength(0);
    });
  });

  describe('auditStyleContent (Vanilla Extract & CSS Content Audit)', () => {
    it('7. detects hex color in style file', () => {
      const code = `
        import { style } from '@vanilla-extract/css';
        export const box = style({
          color: '#ff0000',
        });
      `;
      const violations = auditStyleContent(code, 'src/test.css.ts');
      expect(violations.some((v) => v.rule === 'NO_HEX_COLORS')).toBe(true);
    });

    it('8. detects rgb() in style file', () => {
      const code = `
        import { style } from '@vanilla-extract/css';
        export const box = style({
          color: 'rgb(255, 0, 0)',
        });
      `;
      const violations = auditStyleContent(code, 'src/test.css.ts');
      expect(violations.some((v) => v.rule === 'NO_RGB_RGBA_COLORS')).toBe(
        true,
      );
    });

    it('9. detects rgba() in style file', () => {
      const code = `
        import { style } from '@vanilla-extract/css';
        export const box = style({
          color: 'rgba(0, 0, 0, 0.5)',
        });
      `;
      const violations = auditStyleContent(code, 'src/test.css.ts');
      expect(violations.some((v) => v.rule === 'NO_RGB_RGBA_COLORS')).toBe(
        true,
      );
    });

    it('10. detects !important in style file', () => {
      const code = `
        import { style } from '@vanilla-extract/css';
        export const box = style({
          color: 'red !important',
        });
      `;
      const violations = auditStyleContent(code, 'src/test.css.ts');
      expect(violations.some((v) => v.rule === 'NO_IMPORTANT')).toBe(true);
    });

    it('11. detects transition: all in style file', () => {
      const code = `
        import { style } from '@vanilla-extract/css';
        export const box = style({
          transition: 'all 0.2s ease',
        });
      `;
      const violations = auditStyleContent(code, 'src/test.css.ts');
      expect(violations.some((v) => v.rule === 'NO_TRANSITION_ALL')).toBe(true);
    });

    it('12. detects forbidden px units in style file (e.g. 16px, 640px)', () => {
      const code = `
        import { style } from '@vanilla-extract/css';
        export const box = style({
          padding: '16px',
          maxWidth: '640px',
        });
      `;
      const violations = auditStyleContent(code, 'src/test.css.ts');
      expect(
        violations.filter((v) => v.rule === 'NO_FORBIDDEN_PX_UNITS'),
      ).toHaveLength(2);
    });

    it('5. detects Tailwind directives in CSS file', () => {
      const code = `
        @tailwind base;
        @tailwind components;
        @tailwind utilities;
      `;
      const violations = auditStyleContent(code, 'src/test.css');
      expect(violations.some((v) => v.rule === 'NO_TAILWIND_DIRECTIVES')).toBe(
        true,
      );
    });

    it('13. compliant Vanilla Extract file passes', () => {
      const code = `
        import { style } from '@vanilla-extract/css';
        import { vars } from './theme.css';
        export const box = style({
          marginBlockEnd: vars.space.md,
          color: vars.color.textPrimary,
          transition: 'background-color 0.2s ease',
        });
      `;
      const violations = auditStyleContent(code, 'src/test.css.ts');
      expect(violations).toHaveLength(0);
    });

    it('14. HSL token in central theme passes', () => {
      const code = `
        import { createGlobalTheme } from '@vanilla-extract/css';
        export const vars = createGlobalTheme(':root', {
          color: {
            background: 'hsl(222, 47%, 8%)',
            border: 'hsl(215, 25%, 27%)',
            overlay: 'hsl(0 0% 0% / 0.4)',
          },
        });
      `;
      const violations = auditStyleContent(code, 'src/styles/theme.css.ts');
      expect(violations).toHaveLength(0);
    });

    it('15. rem usage passes', () => {
      const code = `
        import { style } from '@vanilla-extract/css';
        export const card = style({
          paddingBlock: '1.5rem',
          paddingInline: '1.5rem',
          borderRadius: '0.5rem',
        });
      `;
      const violations = auditStyleContent(code, 'src/card.css.ts');
      expect(violations).toHaveLength(0);
    });
  });

  describe('auditProjectStructure (Dependencies & Files)', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'constitution-test-'));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('4. detects CSS Module file in src/', () => {
      const srcDir = path.join(tmpDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'Component.module.css'),
        '.container { margin: 0; }',
      );

      const violations = auditProjectStructure(tmpDir);
      expect(violations.some((v) => v.rule === 'NO_CSS_MODULES')).toBe(true);
    });

    it('6. detects Tailwind in PostCSS configuration', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'postcss.config.mjs'),
        'export default { plugins: { "@tailwindcss/postcss": {} } };',
      );

      const violations = auditProjectStructure(tmpDir);
      expect(violations.some((v) => v.rule === 'NO_TAILWIND_CONFIG')).toBe(
        true,
      );
    });

    it('detects Tailwind package in package.json', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          devDependencies: {
            tailwindcss: '^4.0.0',
          },
        }),
      );

      const violations = auditProjectStructure(tmpDir);
      expect(violations.some((v) => v.rule === 'NO_TAILWIND_DEPENDENCY')).toBe(
        true,
      );
    });

    it('16. unrelated # string in normal TS does not false-positive', () => {
      const srcDir = path.join(tmpDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'entity.ts'),
        'export const ISSUE_TRACKER_TAG = "#issue-12345";\nexport const HASH = "#abcdef";\n',
      );

      const result = runFrontendConstitutionAudit(tmpDir);
      expect(result.violations).toHaveLength(0);
    });

    it('18. recursively discovers and rejects deeply nested non-compliant TSX fixture (src/features/example/deep/component.tsx)', () => {
      const deepDir = path.join(tmpDir, 'src', 'features', 'example', 'deep');
      fs.mkdirSync(deepDir, { recursive: true });
      fs.writeFileSync(
        path.join(deepDir, 'component.tsx'),
        'export function DeepComponent() { return <div style={{ color: "red" }}>Deep</div>; }\n',
      );

      const result = runFrontendConstitutionAudit(tmpDir);
      expect(result.violations.length).toBeGreaterThanOrEqual(1);
      expect(
        result.violations.some(
          (v) =>
            v.rule === 'NO_JSX_INLINE_STYLE' &&
            v.file ===
              path.join('src', 'features', 'example', 'deep', 'component.tsx'),
        ),
      ).toBe(true);
    });

    it('19. recursively discovers and accepts deeply nested compliant Vanilla Extract component fixture', () => {
      const deepDir = path.join(tmpDir, 'src', 'features', 'example', 'deep');
      fs.mkdirSync(deepDir, { recursive: true });
      fs.writeFileSync(
        path.join(deepDir, 'component.css.ts'),
        "import { style } from '@vanilla-extract/css';\nexport const box = style({ marginBlockEnd: '1rem' });\n",
      );
      fs.writeFileSync(
        path.join(deepDir, 'component.tsx'),
        "import * as styles from './component.css';\nexport function DeepComponent() { return <div className={styles.box}>Deep</div>; }\n",
      );

      const result = runFrontendConstitutionAudit(tmpDir);
      expect(result.violations).toHaveLength(0);
      expect(result.scannedFilesCount).toBe(2);
    });
  });
});
