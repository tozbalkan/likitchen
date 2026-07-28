import { PromptDocument } from '../../prompt/prompt-document';
import { MergeContext, PromptMergeResult } from '../prompt-merge-result';

export interface MergeStrategyPort {
  readonly name: string;
  merge(
    base: Readonly<PromptDocument>,
    current: Readonly<PromptDocument>,
    incoming: Readonly<PromptDocument>,
    context: Readonly<MergeContext>,
  ): Promise<PromptMergeResult>;
}
