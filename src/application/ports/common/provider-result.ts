export interface TokenUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}

export interface ProviderMetadata {
  readonly providerId: string;
  readonly model: string;
  readonly promptFingerprint: string;
  readonly usage?: TokenUsage;
}

export interface ProviderResult<T> {
  readonly value: T;
  readonly rawResponse?: string;
  readonly metadata: ProviderMetadata;
}
