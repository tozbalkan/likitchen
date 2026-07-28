import { ExecutionEnvelope } from '../../vo/execution-envelope';
import type { OutboxPort } from '../../ports/outbox-port';
import { ToolDomainEvent } from '../../vo/tool-domain-events';
import type { PipelineBehavior } from './validate-request.behavior';

export class PublishExecutionEventBehavior implements PipelineBehavior {
  constructor(private readonly outbox?: OutboxPort) {}

  async execute(
    envelope: Readonly<ExecutionEnvelope>,
  ): Promise<ExecutionEnvelope> {
    if (this.outbox && envelope.result) {
      const eventType =
        envelope.result.status === 'SUCCESS'
          ? 'ToolExecuted'
          : 'ToolExecutionFailed';
      await this.outbox.recordEvent(
        ToolDomainEvent.create({
          eventType,
          toolId: envelope.context.toolId,
          instanceId: envelope.context.instanceId,
          tenantId: envelope.context.tenantContext.tenantId,
          actor: 'system',
          payload: {
            executionId: envelope.context.executionId,
            status: envelope.result.status,
            durationMs: envelope.result.durationMs,
            error: envelope.result.error,
          },
        }),
      );
    }
    return envelope;
  }
}
