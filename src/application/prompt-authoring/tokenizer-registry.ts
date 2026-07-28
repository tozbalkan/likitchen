import { ModelProfile } from './token-cost-estimate';

export interface Tokenizer {
  countTokens(text: string): number;
}

export class SimpleCharTokenizer implements Tokenizer {
  // Simple deterministic approximation: 1 token ~= 4 chars
  countTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }
}

/**
 * Three-Tier Tokenizer Architecture: ModelAlias -> ModelProfile -> Tokenizer
 */
export class TokenizerRegistry {
  private readonly profiles = new Map<string, ModelProfile>();
  private readonly tokenizers = new Map<string, Tokenizer>();
  private readonly defaultTokenizer = new SimpleCharTokenizer();

  constructor() {
    // Default model profiles
    this.registerModelProfile(
      new ModelProfile({
        modelAlias: 'gpt-4o',
        providerName: 'openai',
        contextWindowTokens: 128000,
        promptCostPer1kUSD: 0.005,
        completionCostPer1kUSD: 0.015,
      }),
      this.defaultTokenizer,
    );

    this.registerModelProfile(
      new ModelProfile({
        modelAlias: 'claude-3-5-sonnet',
        providerName: 'anthropic',
        contextWindowTokens: 200000,
        promptCostPer1kUSD: 0.003,
        completionCostPer1kUSD: 0.015,
      }),
      this.defaultTokenizer,
    );

    this.registerModelProfile(
      new ModelProfile({
        modelAlias: 'gemini-1.5-pro',
        providerName: 'google',
        contextWindowTokens: 1000000,
        promptCostPer1kUSD: 0.00125,
        completionCostPer1kUSD: 0.005,
      }),
      this.defaultTokenizer,
    );
  }

  registerModelProfile(profile: ModelProfile, tokenizer: Tokenizer): void {
    this.profiles.set(profile.modelAlias, profile);
    this.tokenizers.set(profile.modelAlias, tokenizer);
  }

  getModelProfile(modelAlias: string): ModelProfile {
    return (
      this.profiles.get(modelAlias) ??
      new ModelProfile({
        modelAlias,
        providerName: 'generic',
        contextWindowTokens: 128000,
        promptCostPer1kUSD: 0.002,
        completionCostPer1kUSD: 0.006,
      })
    );
  }

  getTokenizer(modelAlias: string): Tokenizer {
    return this.tokenizers.get(modelAlias) ?? this.defaultTokenizer;
  }
}
