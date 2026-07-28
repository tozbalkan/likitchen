import { PromptAuthoringEvent } from '../prompt-authoring-events';

export interface OutboxPort {
  recordEvent(event: Readonly<PromptAuthoringEvent>): Promise<void>;
  getPendingEvents(): Promise<ReadonlyArray<PromptAuthoringEvent>>;
}
