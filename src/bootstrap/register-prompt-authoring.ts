import type { ApplicationRegistry } from './application-registry';
import { InMemoryWorkspaceRepositoryAdapter } from '../infrastructure/prompt-authoring/workspace-repository';
import { MemoryOutboxAdapter } from '../infrastructure/prompt-authoring/memory-outbox-adapter';
import { AuthoringAnalyticsReaderAdapter } from '../infrastructure/prompt-authoring/authoring-analytics-reader-adapter';
import { ThreeWayMergeStrategy } from '../application/prompt-authoring/three-way-merge-service';
import { MergeStrategyResolver } from '../application/prompt-authoring/merge-strategy-resolver';
import { PromptDiffService } from '../application/prompt-authoring/prompt-diff-service';
import { PromptLinter } from '../application/prompt-authoring/prompt-linter';
import { TokenizerRegistry } from '../application/prompt-authoring/tokenizer-registry';
import { TokenCostEstimator } from '../application/prompt-authoring/token-cost-estimator';
import { PreviewPipeline } from '../application/prompt-authoring/preview-pipeline';
import { ReviewPipelineDefinition } from '../application/prompt-authoring/review-pipeline-definition';
import { ReviewStateMachine } from '../application/prompt-authoring/review-state-machine';
import { PromptValidatorService } from '../application/prompt/prompt-validator';
import { MustachePromptRendererEngineAdapter } from '../infrastructure/prompt/mustache-prompt-renderer-engine';

export function registerPromptAuthoring(registry: ApplicationRegistry): void {
  // Repositories & Adapters
  const workspaceRepository = new InMemoryWorkspaceRepositoryAdapter();
  const outboxAdapter = new MemoryOutboxAdapter();
  const analyticsReader = new AuthoringAnalyticsReaderAdapter();

  registry.register('WorkspaceRepositoryPort', workspaceRepository);
  registry.register('OutboxPort', outboxAdapter);
  registry.register('AuthoringAnalyticsReaderPort', analyticsReader);

  // Merge & Diff Services
  const mergeStrategy = new ThreeWayMergeStrategy();
  const mergeResolver = new MergeStrategyResolver([mergeStrategy]);
  const diffService = new PromptDiffService();

  registry.register('ThreeWayMergeStrategy', mergeStrategy);
  registry.register('MergeStrategyResolver', mergeResolver);
  registry.register('PromptDiffService', diffService);

  // Linting & Tokenizer Services
  const linter = new PromptLinter();
  const tokenizerRegistry = new TokenizerRegistry();
  const tokenEstimator = new TokenCostEstimator(tokenizerRegistry);

  registry.register('PromptLinter', linter);
  registry.register('TokenizerRegistry', tokenizerRegistry);
  registry.register('TokenCostEstimator', tokenEstimator);

  // Preview Pipeline
  const validator = new PromptValidatorService();
  const mustacheEngine = new MustachePromptRendererEngineAdapter();
  const previewPipeline = PreviewPipeline.createDefault(
    validator,
    linter,
    mustacheEngine,
    tokenEstimator,
  );

  registry.register('PreviewPipeline', previewPipeline);

  // Review Pipeline & State Machine
  const reviewDef = ReviewPipelineDefinition.createDefault();
  const reviewStateMachine = new ReviewStateMachine(reviewDef);

  registry.register('ReviewPipelineDefinition', reviewDef);
  registry.register('ReviewStateMachine', reviewStateMachine);
}
