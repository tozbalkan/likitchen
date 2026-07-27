import type { ReadonlyDeep } from 'type-fest';
import type { Uuid, Instant } from '../../../shared/types';
import { DomainEvent } from '../../events/domain-event';
import type { TokenUsage } from '../../../shared/metrics/token-usage';

export type AiUsageTrackedPayload = ReadonlyDeep<{
  conversationId: Uuid;
  usage: TokenUsage;
  model: string;
  provider: string;
  promptVersion: number;
  schemaVersion: number;
}>;

export class AiUsageTrackedEvent implements DomainEvent<
  'AiUsageTracked',
  AiUsageTrackedPayload
> {
  public readonly type = 'AiUsageTracked';
  constructor(
    public readonly id: Uuid,
    public readonly occurredAt: Instant,
    public readonly payload: AiUsageTrackedPayload,
  ) {}
}
