import type { RecommendationDecision } from '../../domain/conversation/recommendation/types';
import type { ActionPlan, ExecutedAction, ExecutionReport } from './types';
import type { ExecutionPlanner } from './execution-planner';
import type { ActionHandlerRegistry } from './handlers/action-handler-registry';
import type { ProcessContext } from '../../shared/types';
import type { DomainEvent } from '../../domain/events/domain-event';
import type { Clock } from '../ports/clock';

export class DecisionOrchestrator {
  constructor(
    private readonly planner: ExecutionPlanner,
    private readonly handlerRegistry: ActionHandlerRegistry,
    private readonly clock: Clock,
  ) {}

  async execute(
    decision: Readonly<RecommendationDecision>,
    processContext: Readonly<ProcessContext>,
  ): Promise<ExecutionReport> {
    const plan: ActionPlan = this.planner.createPlan(decision);
    const executedActions: ExecutedAction[] = [];
    const emittedEvents: DomainEvent<string, unknown>[] = [];

    for (const action of plan.actions) {
      const handler = this.handlerRegistry.get(action.type);
      if (!handler) {
        executedActions.push({
          action,
          executedAt: this.clock.now(),
          status: 'failure',
          error: `No handler registered for action type ${action.type}`,
        });
        continue;
      }

      try {
        const result = await handler.execute(action, processContext);
        executedActions.push({
          action,
          executedAt: this.clock.now(),
          status: 'success',
        });
        if (result.events) {
          emittedEvents.push(...result.events);
        }
      } catch (e: unknown) {
        executedActions.push({
          action,
          executedAt: this.clock.now(),
          status: 'failure',
          error: (e as Error).message,
        });
      }
    }

    return {
      plan,
      actions: executedActions,
      events: emittedEvents,
    };
  }
}
