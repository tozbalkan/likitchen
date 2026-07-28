import { ExecutionEnvelope } from '../vo/execution-envelope';
import type { PipelineBehavior } from './behaviors/validate-request.behavior';
import type { PreExecutionHook } from './pre-execution-hooks';
import type { PostExecutionHook } from './post-execution-hooks';
import { ValidateRequestBehavior } from './behaviors/validate-request.behavior';
import { AuthorizationBehavior } from './behaviors/authorization.behavior';
import { RateLimitBehavior } from './behaviors/rate-limit.behavior';
import { TimeoutAndBudgetBehavior } from './behaviors/timeout-and-budget.behavior';
import { CircuitBreakerBehavior } from './behaviors/circuit-breaker.behavior';
import { RetryBehavior } from './behaviors/retry.behavior';
import { ExecuteBehavior } from './behaviors/execute.behavior';
import { NormalizeResultBehavior } from './behaviors/normalize-result.behavior';
import { PublishExecutionEventBehavior } from './behaviors/publish-execution-event.behavior';
import { MetricsBehavior } from './behaviors/metrics.behavior';
import type { ProviderSelectorService } from '../services/provider-selector-service';
import { CircuitBreakerService } from '../services/circuit-breaker-service';
import { ToolResultNormalizer } from '../services/tool-result-normalizer';
import type { OutboxPort } from '../ports/outbox-port';

export class ToolExecutionPipeline {
  constructor(
    private readonly behaviors: ReadonlyArray<PipelineBehavior>,
    private readonly preHooks: ReadonlyArray<PreExecutionHook> = [],
    private readonly postHooks: ReadonlyArray<PostExecutionHook> = [],
  ) {}

  static createDefault(
    providerSelector: ProviderSelectorService,
    circuitBreaker: CircuitBreakerService = new CircuitBreakerService(),
    normalizer: ToolResultNormalizer = new ToolResultNormalizer(),
    outbox?: OutboxPort,
    preHooks: ReadonlyArray<PreExecutionHook> = [],
    postHooks: ReadonlyArray<PostExecutionHook> = [],
  ): ToolExecutionPipeline {
    return new ToolExecutionPipeline(
      [
        new ValidateRequestBehavior(),
        new AuthorizationBehavior(),
        new RateLimitBehavior(),
        new TimeoutAndBudgetBehavior(),
        new CircuitBreakerBehavior(circuitBreaker),
        new RetryBehavior(),
        new ExecuteBehavior(providerSelector),
        new NormalizeResultBehavior(normalizer),
        new PublishExecutionEventBehavior(outbox),
        new MetricsBehavior(),
      ],
      preHooks,
      postHooks,
    );
  }

  async execute(
    initialEnvelope: Readonly<ExecutionEnvelope>,
  ): Promise<ExecutionEnvelope> {
    let current = initialEnvelope;

    // Run PreHooks
    for (const hook of this.preHooks) {
      current = await hook.beforeExecute(current);
    }

    // Run Middleware Behaviors
    for (const behavior of this.behaviors) {
      current = await behavior.execute(current);
    }

    // Run PostHooks
    for (const hook of this.postHooks) {
      current = await hook.afterExecute(current);
    }

    return current;
  }
}
