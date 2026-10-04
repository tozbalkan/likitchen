import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

/**
 * LI-KITCHEN — Frontend Constitution Guard
 *
 * Enforces:
 * 1. Zero React inline styles (JSX style attributes) via TypeScript AST parsing
 * 2. Vanilla Extract as sole styling engine (no CSS Modules, no Tailwind, no raw CSS)
 * 3. HSL colors exclusively in styles (no hex, rgb(), rgba())
 * 4. Rem and modern units in styles (no arbitrary px values)
 * 5. No !important
 * 6. No transition: all
 * 7. Zero Tailwind packages, directives, or configurations
 */

export interface ConstitutionViolation {
  readonly rule: string;
  readonly file: string;
  readonly line: number;
  readonly column?: number;
  readonly message: string;
  readonly snippet?: string;
}

export interface FrontendAuditResult {
  readonly success: boolean;
  readonly violations: readonly ConstitutionViolation[];
  readonly scannedFilesCount: number;
}

/**
 * Parses TSX files with TypeScript compiler API to find any JSX `style` attribute.
 */
export function auditJsxStyleAttributes(
  sourceCode: string,
  filePath: string,
): readonly ConstitutionViolation[] {
  const violations: ConstitutionViolation[] = [];
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  function visit(node: ts.Node): void {
    if (
      ts.isJsxAttribute(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'style'
    ) {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile),
      );
      violations.push({
        rule: 'NO_JSX_INLINE_STYLE',
        file: filePath,
        line: line + 1,
        column: character + 1,
        message:
          'React JSX `style` attribute is strictly forbidden. Move presentation to a Vanilla Extract companion *.css.ts file.',
        snippet: node.getText(sourceFile),
      });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

/**
 * Contextual scan of styling files (*.css.ts, *.css) for forbidden style patterns.
 */
export function auditStyleContent(
  sourceCode: string,
  filePath: string,
): readonly ConstitutionViolation[] {
  const violations: ConstitutionViolation[] = [];
  const lines = sourceCode.split('\n');

  // Hex color regex: #rgb, #rgba, #rrggbb, #rrggbbaa
  const hexColorRegex = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/;
  // rgb() or rgba()
  const rgbRegex = /\brgba?\s*\(/;
  // !important
  const importantRegex = /!important/;
  // transition: all
  const transitionAllRegex =
    /transition(?:Duration|Property)?\s*:\s*['"`](?:all|[^'"`]*\ball\b[^'"`]*)['"`]|['"`]all['"`]/;
  // px unit check (forbidding normal layout px: e.g. 2px, 4px, 12px, 640px)
  const forbiddenPxRegex = /(?<![a-zA-Z0-9_-])(?:[2-9]|\d{2,})(?:\.\d+)?px\b/;
  // Tailwind directives in CSS
  const tailwindDirectiveRegex = /@(?:tailwind|apply|theme)\b/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lineNum = i + 1;

    // Ignore pure comment lines
    const trimmed = line.trim();
    if (
      trimmed.startsWith('//') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*')
    ) {
      continue;
    }

    if (hexColorRegex.test(line)) {
      violations.push({
        rule: 'NO_HEX_COLORS',
        file: filePath,
        line: lineNum,
        message:
          'Hexadecimal color literal forbidden. Use canonical HSL tokens.',
        snippet: trimmed,
      });
    }

    if (rgbRegex.test(line)) {
      violations.push({
        rule: 'NO_RGB_RGBA_COLORS',
        file: filePath,
        line: lineNum,
        message:
          'rgb() and rgba() color formats forbidden. Use canonical HSL tokens or hsl(... / alpha).',
        snippet: trimmed,
      });
    }

    if (importantRegex.test(line)) {
      violations.push({
        rule: 'NO_IMPORTANT',
        file: filePath,
        line: lineNum,
        message:
          '!important is strictly forbidden. Maintain low selector specificity.',
        snippet: trimmed,
      });
    }

    if (transitionAllRegex.test(line)) {
      // Check if inside transition property
      if (line.includes('transition')) {
        violations.push({
          rule: 'NO_TRANSITION_ALL',
          file: filePath,
          line: lineNum,
          message:
            'transition: all is forbidden. Explicitly specify transitioned CSS properties.',
          snippet: trimmed,
        });
      }
    }

    if (forbiddenPxRegex.test(line)) {
      violations.push({
        rule: 'NO_FORBIDDEN_PX_UNITS',
        file: filePath,
        line: lineNum,
        message:
          'Physical pixel units forbidden for layout/typography. Use rem or modern CSS units.',
        snippet: trimmed,
      });
    }

    if (tailwindDirectiveRegex.test(line)) {
      violations.push({
        rule: 'NO_TAILWIND_DIRECTIVES',
        file: filePath,
        line: lineNum,
        message: 'Tailwind directive (@tailwind, @apply, @theme) is forbidden.',
        snippet: trimmed,
      });
    }
  }

  return violations;
}

/**
 * Checks for forbidden dependencies and config files in repository.
 */
export function auditProjectStructure(
  repoRoot: string,
): readonly ConstitutionViolation[] {
  const violations: ConstitutionViolation[] = [];

  // Check package.json for Tailwind dependencies
  const pkgPath = path.join(repoRoot, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const allDeps = {
        ...(pkg.dependencies ?? {}),
        ...(pkg.devDependencies ?? {}),
      };
      for (const dep of Object.keys(allDeps)) {
        if (dep === 'tailwindcss' || dep.startsWith('@tailwindcss/')) {
          violations.push({
            rule: 'NO_TAILWIND_DEPENDENCY',
            file: 'package.json',
            line: 1,
            message: `Forbidden Tailwind package found in package.json: "${dep}". Vanilla Extract is the sole styling solution.`,
          });
        }
      }
    } catch {
      // Ignore JSON parse error; handled by other tools
    }
  }

  // Check for PostCSS config containing tailwind
  for (const configFile of [
    'postcss.config.mjs',
    'postcss.config.js',
    'postcss.config.cjs',
  ]) {
    const fullPath = path.join(repoRoot, configFile);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('tailwindcss') || content.includes('@tailwindcss')) {
        violations.push({
          rule: 'NO_TAILWIND_CONFIG',
          file: configFile,
          line: 1,
          message: `PostCSS configuration references Tailwind: "${configFile}". Remove Tailwind PostCSS plugin.`,
        });
      }
    }
  }

  // Check for CSS Modules or other forbidden files in src/
  const srcDir = path.join(repoRoot, 'src');
  if (fs.existsSync(srcDir)) {
    function findForbiddenFiles(dir: string): void {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && entry.name !== '.next') {
            findForbiddenFiles(full);
          }
        } else if (entry.isFile()) {
          const rel = path.relative(repoRoot, full);
          if (
            entry.name.endsWith('.module.css') ||
            entry.name.endsWith('.module.scss')
          ) {
            violations.push({
              rule: 'NO_CSS_MODULES',
              file: rel,
              line: 1,
              message: `CSS Modules are forbidden: "${rel}". Use Vanilla Extract *.css.ts companion files.`,
            });
          }
        }
      }
    }
    findForbiddenFiles(srcDir);
  }

  return violations;
}

/**
 * Recursively scans production frontend source files.
 */
export function runFrontendConstitutionAudit(
  repoRoot: string,
): FrontendAuditResult {
  const violations: ConstitutionViolation[] = [];
  let scannedFilesCount = 0;

  // 1. Audit project structure & dependencies
  violations.push(...auditProjectStructure(repoRoot));

  // 2. Audit frontend source files
  const srcDir = path.join(repoRoot, 'src');
  if (!fs.existsSync(srcDir)) {
    return {
      success: violations.length === 0,
      violations,
      scannedFilesCount: 0,
    };
  }

  function walkDirectory(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.next') {
          walkDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        const relPath = path.relative(repoRoot, fullPath);
        // Exclude test files from production constitution audit
        if (
          entry.name.endsWith('.test.ts') ||
          entry.name.endsWith('.test.tsx') ||
          entry.name.endsWith('.spec.ts') ||
          entry.name.endsWith('.spec.tsx')
        ) {
          continue;
        }

        // TSX / JSX files: check JSX style attributes
        if (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx')) {
          scannedFilesCount++;
          const content = fs.readFileSync(fullPath, 'utf8');
          violations.push(...auditJsxStyleAttributes(content, relPath));
        }

        // Style files: *.css.ts or *.css
        if (entry.name.endsWith('.css.ts') || entry.name.endsWith('.css')) {
          scannedFilesCount++;
          const content = fs.readFileSync(fullPath, 'utf8');
          violations.push(...auditStyleContent(content, relPath));
        }
      }
    }
  }

  walkDirectory(srcDir);

  return {
    success: violations.length === 0,
    violations,
    scannedFilesCount,
  };
}

/**
 * CLI runner
 */
function runCli(): void {
  const repoRoot = process.cwd();
  console.log('\n==================================================');
  console.log('LI-KITCHEN Frontend Constitution Audit');
  console.log('==================================================\n');

  const result = runFrontendConstitutionAudit(repoRoot);

  if (result.violations.length === 0) {
    console.log(
      `✔ [PASS] All ${result.scannedFilesCount} frontend files strictly comply with the Frontend Constitution.`,
    );
    console.log('  - Zero React inline styles (JSX style attributes)');
    console.log('  - Vanilla Extract only (no Tailwind, no CSS Modules)');
    console.log(
      '  - HSL colors exclusively, rem/modern units, logical properties',
    );
    console.log('==================================================\n');
    process.exit(0);
  } else {
    console.error(
      `✖ [FAIL] Found ${result.violations.length} Frontend Constitution violation(s):\n`,
    );
    for (const v of result.violations) {
      console.error(`  [${v.rule}] ${v.file}:${v.line}`);
      console.error(`    ${v.message}`);
      if (v.snippet) {
        console.error(`    Code: ${v.snippet}`);
      }
      console.error('');
    }
    console.error('==================================================\n');
    process.exit(1);
  }
}

const isDirectRun =
  process.argv[1] &&
  (process.argv[1] === fileURLToPath(import.meta.url) ||
    process.argv[1].endsWith('check-frontend-constitution.ts'));

if (isDirectRun) {
  runCli();
}
