import { PromptDocument } from '../prompt/prompt-document';

export type LintSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'BLOCKING';

export interface LintDiagnostic {
  readonly ruleId: string;
  readonly category: string;
  readonly severity: LintSeverity;
  readonly message: string;
  readonly documentationUrl?: string | undefined;
}

export interface LintRule {
  readonly ruleId: string;
  readonly category: string;
  readonly defaultSeverity: LintSeverity;
  readonly documentationUrl?: string | undefined;
  executeTemplateLint?(document: Readonly<PromptDocument>): LintDiagnostic[];
  executeRenderedLint?(
    renderedSystem: string,
    renderedUser: string,
  ): LintDiagnostic[];
}

export interface PromptLintReportProps {
  readonly hasBlockingErrors: boolean;
  readonly diagnostics: ReadonlyArray<LintDiagnostic>;
}

export class PromptLintReport {
  readonly hasBlockingErrors: boolean;
  readonly diagnostics: ReadonlyArray<LintDiagnostic>;

  constructor(props: PromptLintReportProps) {
    this.hasBlockingErrors = props.hasBlockingErrors;
    this.diagnostics = Object.freeze([...props.diagnostics]);
    Object.freeze(this);
  }
}
