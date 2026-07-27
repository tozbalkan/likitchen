import type { ProviderResult } from '../common/provider-result';
import type { ZodSchema } from 'zod';

export interface StructuredExtractionRequest<T> {
  readonly systemPrompt: string;
  readonly userMessage: string;
  readonly promptFingerprint: string;
  readonly schema: ZodSchema<T>;
}

export interface StructuredExtractionPort {
  extract<T>(
    request: Readonly<StructuredExtractionRequest<T>>,
  ): Promise<ProviderResult<T>>;
}
