import type { ActionHandler } from './action-handler';
import type { ApplicationAction } from '../types';

export class ActionHandlerRegistry {
  private readonly handlers = new Map<
    ApplicationAction['type'],
    ActionHandler<ApplicationAction>
  >();

  register<TAction extends ApplicationAction>(
    handler: ActionHandler<TAction>,
  ): void {
    this.handlers.set(handler.actionType, handler);
  }

  get<TAction extends ApplicationAction>(
    type: TAction['type'],
  ): ActionHandler<TAction> | undefined {
    return this.handlers.get(type) as ActionHandler<TAction> | undefined;
  }
}
