import { PreviewContext } from './preview-context';
import { PromptValidatorService } from '../prompt/prompt-validator';
import { PromptLinter } from './prompt-linter';
import { TokenCostEstimator } from './token-cost-estimator';
import type { PromptRendererEnginePort } from '../prompt/ports/prompt-renderer-engine-port';

export interface PipelineBehavior {
  execute(context: Readonly<PreviewContext>): Promise<PreviewContext>;
}

export class ValidateBehavior implements PipelineBehavior {
  constructor(private readonly validator: PromptValidatorService) {}

  async execute(context: Readonly<PreviewContext>): Promise<PreviewContext> {
    const result = await this.validator.validate(context.document);
    return context.withValidation(result.isValid, result.errors);
  }
}

export class TemplateLintBehavior implements PipelineBehavior {
  constructor(private readonly linter: PromptLinter) {}

  async execute(context: Readonly<PreviewContext>): Promise<PreviewContext> {
    const diag = this.linter.lintTemplate(context.document);
    return context.withDiagnostics(diag);
  }
}

export class RenderBehavior implements PipelineBehavior {
  constructor(private readonly engine: PromptRendererEnginePort) {}

  async execute(context: Readonly<PreviewContext>): Promise<PreviewContext> {
    const renderedSys = this.engine.renderTemplate(
      context.document.systemTemplate,
      context.sampleVariableValues,
    );
    const renderedUsr = this.engine.renderTemplate(
      context.document.userTemplate,
      context.sampleVariableValues,
    );
    return context.withRendered(renderedSys, renderedUsr);
  }
}

export class MaskSecretsBehavior implements PipelineBehavior {
  async execute(context: Readonly<PreviewContext>): Promise<PreviewContext> {
    const secretKeys = new Set(
      context.variables.filter((v) => v.secret).map((v) => v.name),
    );

    const maskedValues: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(context.sampleVariableValues)) {
      if (secretKeys.has(key)) {
        maskedValues[key] = '***MASKED_SECRET***';
      } else {
        maskedValues[key] = val;
      }
    }

    return context.withMaskedSecrets(maskedValues);
  }
}

export class RenderedLintBehavior implements PipelineBehavior {
  constructor(private readonly linter: PromptLinter) {}

  async execute(context: Readonly<PreviewContext>): Promise<PreviewContext> {
    if (!context.renderedSystemPrompt || !context.renderedUserMessage) {
      return context;
    }
    const diag = this.linter.lintRendered(
      context.renderedSystemPrompt,
      context.renderedUserMessage,
    );
    return context.withDiagnostics(diag);
  }
}

export class EstimateBehavior implements PipelineBehavior {
  constructor(private readonly estimator: TokenCostEstimator) {}

  async execute(context: Readonly<PreviewContext>): Promise<PreviewContext> {
    const sys = context.renderedSystemPrompt ?? context.document.systemTemplate;
    const usr = context.renderedUserMessage ?? context.document.userTemplate;

    const est = this.estimator.estimate(sys, usr, context.modelAlias);
    return context.withEstimate(est);
  }
}

/**
 * Two-Phase PreviewPipeline: Validate -> TemplateLint -> Render -> MaskSecrets -> RenderedLint -> Estimate
 */
export class PreviewPipeline {
  private readonly behaviors: PipelineBehavior[];

  constructor(behaviors: ReadonlyArray<PipelineBehavior>) {
    this.behaviors = [...behaviors];
  }

  static createDefault(
    validator: PromptValidatorService,
    linter: PromptLinter,
    engine: PromptRendererEnginePort,
    estimator: TokenCostEstimator,
  ): PreviewPipeline {
    return new PreviewPipeline([
      new ValidateBehavior(validator),
      new TemplateLintBehavior(linter),
      new RenderBehavior(engine),
      new MaskSecretsBehavior(),
      new RenderedLintBehavior(linter),
      new EstimateBehavior(estimator),
    ]);
  }

  async execute(
    initialContext: Readonly<PreviewContext>,
  ): Promise<PreviewContext> {
    let current = initialContext;
    for (const behavior of this.behaviors) {
      current = await behavior.execute(current);
    }
    return current;
  }
}
