import type { ExecutionBudgetPolicy } from '../../policy/platform-policy';
import type { ClockPort } from '../../ports/clock/clock-port';
import type { ReasoningFinishReason } from '../vo/react-cycle-result';

export interface GuardEvaluationResult {
  readonly canContinue: boolean;
  readonly finishReason?: ReasoningFinishReason | undefined;
}

export class ReasoningLoopGuard {
  constructor(
    private readonly budgetPolicy: Readonly<ExecutionBudgetPolicy>,
    private readonly clock: Readonly<ClockPort>,
  ) {
    if (!budgetPolicy)
      throw new Error(
        '[ReasoningLoopGuard] ExecutionBudgetPolicy is required.',
      );
    if (!clock) throw new Error('[ReasoningLoopGuard] ClockPort is required.');
  }

  evaluate(
    stepIndex: number,
    startTimeMs: number,
    signal?: AbortSignal | undefined,
  ): GuardEvaluationResult {
    // 1. Check AbortSignal cancellation
    if (signal?.aborted) {
      return { canContinue: false, finishReason: 'CANCELLED' };
    }

    // 2. Check max step budget
    if (stepIndex >= this.budgetPolicy.maxSteps) {
      return { canContinue: false, finishReason: 'MAX_STEPS' };
    }

    // 3. Check time budget
    const elapsedMs = this.clock.now().getTime() - startTimeMs;
    if (elapsedMs >= this.budgetPolicy.maxDurationMs) {
      return { canContinue: false, finishReason: 'TIMEOUT' };
    }

    return { canContinue: true };
  }
}
