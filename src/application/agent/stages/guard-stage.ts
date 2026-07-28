import type {
  ExecutionStage,
  StageContext,
  StageResult,
} from '../execution-stage';
import type { GuardPolicy } from '../policies/guard-policy';

export class GuardStage implements ExecutionStage {
  readonly name = 'GuardStage';

  constructor(private readonly guardPolicy?: GuardPolicy) {}

  async execute(context: Readonly<StageContext>): Promise<StageResult> {
    context.cancellationToken.throwIfCancelled();

    if (this.guardPolicy?.enableInputGuards && context.userMessage) {
      if (context.userMessage.length > this.guardPolicy.maxInputLength) {
        return {
          status: 'STOP',
          context,
          reason: `Input length ${context.userMessage.length} exceeds max allowed length of ${this.guardPolicy.maxInputLength}`,
          metadata: { guardType: 'input_length' },
        };
      }
    }

    return {
      status: 'CONTINUE',
      context,
    };
  }
}
