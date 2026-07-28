import { describe, it, expect } from 'vitest';
import { PromptDocument } from '../../application/prompt/prompt-document';
import { PromptValidatorService } from '../../application/prompt/prompt-validator';
import { PromptLinter } from '../../application/prompt-authoring/prompt-linter';
import { TokenizerRegistry } from '../../application/prompt-authoring/tokenizer-registry';
import { TokenCostEstimator } from '../../application/prompt-authoring/token-cost-estimator';
import { MustachePromptRendererEngineAdapter } from '../prompt/mustache-prompt-renderer-engine';
import { PreviewContext } from '../../application/prompt-authoring/preview-context';
import { PreviewPipeline } from '../../application/prompt-authoring/preview-pipeline';
import { PromptVariableDefinition } from '../../application/prompt-authoring/prompt-variable-definition';

describe('Phase 1C — Two-Phase PreviewPipeline, TokenizerRegistry, PromptLinter & Secret Masking', () => {
  const validator = new PromptValidatorService();
  const linter = new PromptLinter();
  const engine = new MustachePromptRendererEngineAdapter();
  const tokenizerRegistry = new TokenizerRegistry();
  const estimator = new TokenCostEstimator(tokenizerRegistry);

  const pipeline = PreviewPipeline.createDefault(
    validator,
    linter,
    engine,
    estimator,
  );

  it('executes preview pipeline cleanly, masking secrets and estimating token costs', async () => {
    const doc = PromptDocument.create({
      id: 'doc-1c',
      systemTemplate:
        'You are {{role}} serving {{customer}}.\nKeep replies short.',
      userTemplate: 'Help with {{apiKey}}.',
      variables: ['role', 'customer', 'apiKey'],
    });

    const vars = [
      PromptVariableDefinition.create({
        name: 'role',
        type: 'string',
        required: true,
        secret: false,
        source: 'STATIC',
      }),
      PromptVariableDefinition.create({
        name: 'customer',
        type: 'string',
        required: true,
        secret: false,
        source: 'USER',
      }),
      PromptVariableDefinition.create({
        name: 'apiKey',
        type: 'string',
        required: true,
        secret: true,
        source: 'SECRET',
      }),
    ];

    const initial = PreviewContext.create({
      document: doc,
      variables: vars,
      sampleVariableValues: {
        role: 'Assistant',
        customer: 'Acme',
        apiKey: 'secret_key_12345',
      },
      modelAlias: 'gpt-4o',
    });

    const result = await pipeline.execute(initial);

    expect(result.isValid).toBe(true);
    expect(result.renderedSystemPrompt).toBe(
      'You are Assistant serving Acme.\nKeep replies short.',
    );
    expect(result.renderedUserMessage).toBe('Help with secret_key_12345.');
    expect(result.maskedSampleValues?.['apiKey']).toBe('***MASKED_SECRET***');
    expect(result.maskedSampleValues?.['customer']).toBe('Acme');

    expect(result.tokenCostEstimate?.estimatedPromptTokens).toBeGreaterThan(0);
    expect(result.tokenCostEstimate?.contextUtilizationPercent).toBeGreaterThan(
      0,
    );
  });
});
