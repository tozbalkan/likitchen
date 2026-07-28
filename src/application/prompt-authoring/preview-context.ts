import { PromptDocument } from '../prompt/prompt-document';
import { PromptVariableDefinition } from './prompt-variable-definition';
import { LintDiagnostic } from './prompt-lint-report';
import { TokenCostEstimate } from './token-cost-estimate';

export interface PreviewContextProps {
  readonly document: PromptDocument;
  readonly variables: ReadonlyArray<PromptVariableDefinition>;
  readonly sampleVariableValues: Readonly<Record<string, unknown>>;
  readonly modelAlias?: string | undefined;
  readonly isValid?: boolean | undefined;
  readonly validationErrors?: ReadonlyArray<string> | undefined;
  readonly renderedSystemPrompt?: string | undefined;
  readonly renderedUserMessage?: string | undefined;
  readonly maskedSampleValues?: Readonly<Record<string, unknown>> | undefined;
  readonly diagnostics?: ReadonlyArray<LintDiagnostic> | undefined;
  readonly tokenCostEstimate?: TokenCostEstimate | undefined;
}

/**
 * Immutable PreviewContext VO passed across PreviewPipeline behaviors
 */
export class PreviewContext {
  readonly document: PromptDocument;
  readonly variables: ReadonlyArray<PromptVariableDefinition>;
  readonly sampleVariableValues: Readonly<Record<string, unknown>>;
  readonly modelAlias: string;
  readonly isValid: boolean;
  readonly validationErrors: ReadonlyArray<string>;
  readonly renderedSystemPrompt?: string | undefined;
  readonly renderedUserMessage?: string | undefined;
  readonly maskedSampleValues?: Readonly<Record<string, unknown>> | undefined;
  readonly diagnostics: ReadonlyArray<LintDiagnostic>;
  readonly tokenCostEstimate?: TokenCostEstimate | undefined;

  constructor(props: PreviewContextProps) {
    this.document = props.document;
    this.variables = Object.freeze([...props.variables]);
    this.sampleVariableValues = Object.freeze({
      ...props.sampleVariableValues,
    });
    this.modelAlias = props.modelAlias ?? 'gpt-4o';
    this.isValid = props.isValid ?? true;
    this.validationErrors = Object.freeze([...(props.validationErrors ?? [])]);
    this.renderedSystemPrompt = props.renderedSystemPrompt;
    this.renderedUserMessage = props.renderedUserMessage;
    this.maskedSampleValues = props.maskedSampleValues
      ? Object.freeze({ ...props.maskedSampleValues })
      : undefined;
    this.diagnostics = Object.freeze([...(props.diagnostics ?? [])]);
    this.tokenCostEstimate = props.tokenCostEstimate;

    Object.freeze(this);
  }

  static create(props: {
    document: PromptDocument;
    variables: ReadonlyArray<PromptVariableDefinition>;
    sampleVariableValues: Readonly<Record<string, unknown>>;
    modelAlias?: string;
  }): PreviewContext {
    return new PreviewContext(props);
  }

  withValidation(
    isValid: boolean,
    validationErrors: ReadonlyArray<string>,
  ): PreviewContext {
    return new PreviewContext({
      ...this,
      isValid,
      validationErrors,
    });
  }

  withRendered(system: string, user: string): PreviewContext {
    return new PreviewContext({
      ...this,
      renderedSystemPrompt: system,
      renderedUserMessage: user,
    });
  }

  withMaskedSecrets(
    maskedSampleValues: Record<string, unknown>,
  ): PreviewContext {
    return new PreviewContext({
      ...this,
      maskedSampleValues,
    });
  }

  withDiagnostics(diagnostics: LintDiagnostic[]): PreviewContext {
    return new PreviewContext({
      ...this,
      diagnostics: [...this.diagnostics, ...diagnostics],
    });
  }

  withEstimate(tokenCostEstimate: TokenCostEstimate): PreviewContext {
    return new PreviewContext({
      ...this,
      tokenCostEstimate,
    });
  }
}
