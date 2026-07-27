import type { TelemetryPort } from '../telemetry-port';
import type { ExecutionContext } from '../../context/execution-context';
export interface DomainEventPayload {
  readonly eventType: string;
  readonly conversationId?: string;
  readonly payload?: Readonly<Record<string, unknown>>;
}

export class ExecutionTelemetryListener {
  constructor(private readonly telemetryPort: TelemetryPort) {}

  onEvent(
    context: Readonly<ExecutionContext>,
    event: Readonly<DomainEventPayload>,
  ): void {
    this.telemetryPort.counter(context, {
      name: `event.${event.eventType}`,
      value: 1,
      attributes: {
        eventType: event.eventType,
        ...(event.conversationId
          ? { conversationId: event.conversationId }
          : {}),
      },
    });
  }

  onApplicationAction(
    context: Readonly<ExecutionContext>,
    actionName: string,
  ): void {
    this.telemetryPort.counter(context, {
      name: `action.${actionName}`,
      value: 1,
      attributes: {
        action: actionName,
      },
    });
  }
}
