import type { ProviderResult } from '../common/provider-result';

export interface ChatCompletionRequest {
  readonly systemPrompt: string;
  readonly userMessage: string;
  readonly promptFingerprint: string;
  readonly temperature?: number;
}

export interface ChatCompletionPort {
  complete(
    request: Readonly<ChatCompletionRequest>,
  ): Promise<ProviderResult<string>>;
}
