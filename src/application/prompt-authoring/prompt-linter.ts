import { PromptDocument } from '../prompt/prompt-document';
import {
  LintRule,
  LintDiagnostic,
  PromptLintReport,
} from './prompt-lint-report';

export class PromptLinter {
  private readonly rules: LintRule[] = [];

  constructor(rules?: ReadonlyArray<LintRule>) {
    if (rules) {
      this.rules.push(...rules);
    } else {
      // Default built-in rules
      this.rules.push(new DuplicateInstructionRule());
      this.rules.push(new GiantSystemPromptRule());
    }
  }

  lintTemplate(document: Readonly<PromptDocument>): LintDiagnostic[] {
    const diagnostics: LintDiagnostic[] = [];
    for (const rule of this.rules) {
      if (rule.executeTemplateLint) {
        diagnostics.push(...rule.executeTemplateLint(document));
      }
    }
    return diagnostics;
  }

  lintRendered(renderedSystem: string, renderedUser: string): LintDiagnostic[] {
    const diagnostics: LintDiagnostic[] = [];
    for (const rule of this.rules) {
      if (rule.executeRenderedLint) {
        diagnostics.push(
          ...rule.executeRenderedLint(renderedSystem, renderedUser),
        );
      }
    }
    return diagnostics;
  }

  buildReport(diagnostics: ReadonlyArray<LintDiagnostic>): PromptLintReport {
    const hasBlocking = diagnostics.some((d) => d.severity === 'BLOCKING');
    return new PromptLintReport({
      hasBlockingErrors: hasBlocking,
      diagnostics,
    });
  }
}

class DuplicateInstructionRule implements LintRule {
  readonly ruleId = 'LINT-001';
  readonly category = 'Quality';
  readonly defaultSeverity = 'WARNING';
  readonly documentationUrl = 'https://docs.platform/lint/LINT-001';

  executeRenderedLint(renderedSystem: string): LintDiagnostic[] {
    const lines = renderedSystem
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const seen = new Set<string>();
    const diagnostics: LintDiagnostic[] = [];

    for (const line of lines) {
      if (line.length > 20 && seen.has(line)) {
        diagnostics.push({
          ruleId: this.ruleId,
          category: this.category,
          severity: this.defaultSeverity,
          message: `Duplicate instruction line detected: "${line}"`,
          documentationUrl: this.documentationUrl,
        });
      }
      seen.add(line);
    }

    return diagnostics;
  }
}

class GiantSystemPromptRule implements LintRule {
  readonly ruleId = 'LINT-002';
  readonly category = 'Budget';
  readonly defaultSeverity = 'BLOCKING';
  readonly documentationUrl = 'https://docs.platform/lint/LINT-002';

  executeTemplateLint(document: Readonly<PromptDocument>): LintDiagnostic[] {
    const diagnostics: LintDiagnostic[] = [];
    if (document.systemTemplate.length > 50000) {
      diagnostics.push({
        ruleId: this.ruleId,
        category: this.category,
        severity: this.defaultSeverity,
        message:
          'System prompt template exceeds maximum character budget (50,000 chars).',
        documentationUrl: this.documentationUrl,
      });
    }
    return diagnostics;
  }
}
