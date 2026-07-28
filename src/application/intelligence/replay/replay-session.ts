import type { ProviderResult } from '../../ports/common/provider-result';

export interface ReplaySnapshot {
  readonly sessionId: string;
  readonly turnId: string;
  readonly promptFingerprint: string;
  readonly providerResult: ProviderResult<string>;
  readonly recordedAt: Date;
}

export class ReplaySession {
  constructor(
    public readonly sessionId: string,
    public readonly snapshots: readonly ReplaySnapshot[] = [],
  ) {}
}
