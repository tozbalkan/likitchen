import { ProviderCapabilities } from './provider-capabilities';

export interface ProviderCapabilitySnapshotProps {
  readonly capabilities: ProviderCapabilities;
  readonly lastNegotiatedAt: Date;
  readonly expiresAt: Date;
}

export class ProviderCapabilitySnapshot {
  readonly capabilities: ProviderCapabilities;
  readonly lastNegotiatedAt: Date;
  readonly expiresAt: Date;

  constructor(props: ProviderCapabilitySnapshotProps) {
    this.capabilities = props.capabilities;
    this.lastNegotiatedAt = new Date(props.lastNegotiatedAt);
    this.expiresAt = new Date(props.expiresAt);
    Object.freeze(this);
  }

  static create(
    capabilities: ProviderCapabilities,
    ttlMs: number = 300000,
  ): ProviderCapabilitySnapshot {
    const now = new Date();
    return new ProviderCapabilitySnapshot({
      capabilities,
      lastNegotiatedAt: now,
      expiresAt: new Date(now.getTime() + ttlMs),
    });
  }

  isExpired(now: Date = new Date()): boolean {
    return now.getTime() > this.expiresAt.getTime();
  }
}
