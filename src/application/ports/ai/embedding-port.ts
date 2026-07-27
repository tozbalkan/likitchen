import type { ProviderResult } from '../common/provider-result';

export interface EmbeddingRequest {
  readonly text: string;
}

export interface EmbeddingPort {
  embed(
    request: Readonly<EmbeddingRequest>,
  ): Promise<ProviderResult<readonly number[]>>;
}
