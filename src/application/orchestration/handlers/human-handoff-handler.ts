import type { ActionHandler, ActionResult } from './action-handler';
import type { HumanHandoffAction } from '../types';
import type { ProcessContext } from '../../../shared/types';

export class HumanHandoffHandler implements ActionHandler<HumanHandoffAction> {
  readonly actionType = 'HumanHandoff';

  async execute(
    _action: HumanHandoffAction,
    _processContext: Readonly<ProcessContext>,
  ): Promise<ActionResult> {
    return {
      events: [],
    };
  }
}
