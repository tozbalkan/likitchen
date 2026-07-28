import { ToolDomainEvent } from '../vo/tool-domain-events';

export interface OutboxPort {
  recordEvent(event: Readonly<ToolDomainEvent>): Promise<void>;
  getPendingEvents(): Promise<ReadonlyArray<ToolDomainEvent>>;
}
