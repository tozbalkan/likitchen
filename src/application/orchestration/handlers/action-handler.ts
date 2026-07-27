import type { ApplicationAction } from '../types';
import type { ProcessContext } from '../../../shared/types';
import type { DomainEvent } from '../../../domain/events/domain-event';

export interface ActionResult {
  readonly events?: readonly DomainEvent<string, unknown>[];
}

export interface ActionHandler<
  TAction extends ApplicationAction = ApplicationAction,
> {
  readonly actionType: TAction['type'];
  execute(
    action: TAction,
    processContext: Readonly<ProcessContext>,
  ): Promise<ActionResult>;
}
