import type { ActionHandler, ActionResult } from './action-handler';
import type { RejectConversationAction } from '../types';
import type { ProcessContext } from '../../../shared/types';

export class RejectConversationHandler implements ActionHandler<RejectConversationAction> {
  readonly actionType = 'RejectConversation';

  async execute(
    _action: RejectConversationAction,
    _processContext: Readonly<ProcessContext>,
  ): Promise<ActionResult> {
    return {
      events: [],
    };
  }
}
