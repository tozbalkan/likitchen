export interface ModelProfileProps {
  readonly modelAlias: string;
  readonly providerName: string;
  readonly contextWindowTokens: number;
  readonly promptCostPer1kUSD: number;
  readonly completionCostPer1kUSD: number;
}

export class ModelProfile {
  readonly modelAlias: string;
  readonly providerName: string;
  readonly contextWindowTokens: number;
  readonly promptCostPer1kUSD: number;
  readonly completionCostPer1kUSD: number;

  constructor(props: ModelProfileProps) {
    this.modelAlias = props.modelAlias;
    this.providerName = props.providerName;
    this.contextWindowTokens = props.contextWindowTokens;
    this.promptCostPer1kUSD = props.promptCostPer1kUSD;
    this.completionCostPer1kUSD = props.completionCostPer1kUSD;
    Object.freeze(this);
  }
}

export interface TokenCostEstimateProps {
  readonly estimatedPromptTokens: number;
  readonly estimatedCompletionTokens: number;
  readonly estimatedTotalTokens: number;
  readonly remainingContextTokens: number;
  readonly contextUtilizationPercent: number;
  readonly estimatedCostUSD: number;
  readonly estimatedMonthlyCostUSD: number;
  readonly estimatedLatencyClass: 'FAST' | 'MEDIUM' | 'SLOW';
}

export class TokenCostEstimate {
  readonly estimatedPromptTokens: number;
  readonly estimatedCompletionTokens: number;
  readonly estimatedTotalTokens: number;
  readonly remainingContextTokens: number;
  readonly contextUtilizationPercent: number;
  readonly estimatedCostUSD: number;
  readonly estimatedMonthlyCostUSD: number;
  readonly estimatedLatencyClass: 'FAST' | 'MEDIUM' | 'SLOW';

  constructor(props: TokenCostEstimateProps) {
    this.estimatedPromptTokens = props.estimatedPromptTokens;
    this.estimatedCompletionTokens = props.estimatedCompletionTokens;
    this.estimatedTotalTokens = props.estimatedTotalTokens;
    this.remainingContextTokens = props.remainingContextTokens;
    this.contextUtilizationPercent = props.contextUtilizationPercent;
    this.estimatedCostUSD = props.estimatedCostUSD;
    this.estimatedMonthlyCostUSD = props.estimatedMonthlyCostUSD;
    this.estimatedLatencyClass = props.estimatedLatencyClass;
    Object.freeze(this);
  }
}
