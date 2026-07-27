import type { ActionHandler, ActionResult } from './action-handler';
import type { CompleteConversationAction } from '../types';
import type { ProcessContext } from '../../../shared/types';

export class CompleteConversationHandler implements ActionHandler<CompleteConversationAction> {
  readonly actionType = 'CompleteConversation';

  async execute(
    _action: CompleteConversationAction,
    _processContext: Readonly<ProcessContext>,
  ): Promise<ActionResult> {
    return {
      events: [],
    };
  }
}
