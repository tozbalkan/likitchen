import type { ActionHandler, ActionResult } from './action-handler';
import type { SendQuestionAction } from '../types';
import type { ProcessContext } from '../../../shared/types';
import type { QuestionGenerator } from '../question-generation/question-generator';

export class SendQuestionHandler implements ActionHandler<SendQuestionAction> {
  readonly actionType = 'SendQuestion';

  constructor(private readonly questionGenerator: QuestionGenerator) {}

  async execute(
    action: SendQuestionAction,
    _processContext: Readonly<ProcessContext>,
  ): Promise<ActionResult> {
    await this.questionGenerator.generate({ factKey: action.fact });
    return {
      events: [],
    };
  }
}
