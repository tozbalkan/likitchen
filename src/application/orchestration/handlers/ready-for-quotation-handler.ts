import type { ActionHandler, ActionResult } from './action-handler';
import type { ReadyForQuotationAction } from '../types';
import type { ProcessContext } from '../../../shared/types';

export class ReadyForQuotationHandler implements ActionHandler<ReadyForQuotationAction> {
  readonly actionType = 'ReadyForQuotation';

  async execute(
    _action: ReadyForQuotationAction,
    _processContext: Readonly<ProcessContext>,
  ): Promise<ActionResult> {
    return {
      events: [],
    };
  }
}
