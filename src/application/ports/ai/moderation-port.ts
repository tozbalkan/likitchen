import type { ProviderResult } from '../common/provider-result';

export interface ModerationRequest {
  readonly text: string;
}

export interface ModerationResult {
  readonly flagged: boolean;
  readonly categories: Readonly<Record<string, boolean>>;
}

export interface ModerationPort {
  moderate(
    request: Readonly<ModerationRequest>,
  ): Promise<ProviderResult<ModerationResult>>;
}
