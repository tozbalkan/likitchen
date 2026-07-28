import type {
  ExecutionStage,
  StageContext,
  StageResult,
} from '../execution-stage';

export class ContextStage implements ExecutionStage {
  readonly name = 'ContextStage';

  async execute(context: Readonly<StageContext>): Promise<StageResult> {
    context.cancellationToken.throwIfCancelled();

    if (!context.executionContext || !context.tenantContext) {
      return {
        status: 'FAIL',
        context,
        reason: 'Missing executionContext or tenantContext.',
      };
    }

    return {
      status: 'CONTINUE',
      context,
      metadata: { resolvedTenantId: context.tenantContext.tenantId },
    };
  }
}
