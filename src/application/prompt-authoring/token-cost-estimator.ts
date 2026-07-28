import { TokenizerRegistry } from './tokenizer-registry';
import { TokenCostEstimate } from './token-cost-estimate';

export class TokenCostEstimator {
  constructor(private readonly registry: TokenizerRegistry) {}

  estimate(
    renderedSystemPrompt: string,
    renderedUserMessage: string,
    modelAlias: string = 'gpt-4o',
    assumedCompletionTokens: number = 500,
    monthlyExecutions: number = 10000,
  ): TokenCostEstimate {
    const profile = this.registry.getModelProfile(modelAlias);
    const tokenizer = this.registry.getTokenizer(modelAlias);

    const sysTokens = tokenizer.countTokens(renderedSystemPrompt);
    const usrTokens = tokenizer.countTokens(renderedUserMessage);
    const promptTokens = sysTokens + usrTokens;

    const totalTokens = promptTokens + assumedCompletionTokens;
    const remaining = Math.max(0, profile.contextWindowTokens - totalTokens);
    const utilization = Number(
      ((totalTokens / profile.contextWindowTokens) * 100).toFixed(2),
    );

    const promptCost = (promptTokens / 1000) * profile.promptCostPer1kUSD;
    const completionCost =
      (assumedCompletionTokens / 1000) * profile.completionCostPer1kUSD;
    const costUSD = Number((promptCost + completionCost).toFixed(6));
    const monthlyCostUSD = Number((costUSD * monthlyExecutions).toFixed(2));

    const latencyClass =
      totalTokens > 10000 ? 'SLOW' : totalTokens > 2000 ? 'MEDIUM' : 'FAST';

    return new TokenCostEstimate({
      estimatedPromptTokens: promptTokens,
      estimatedCompletionTokens: assumedCompletionTokens,
      estimatedTotalTokens: totalTokens,
      remainingContextTokens: remaining,
      contextUtilizationPercent: utilization,
      estimatedCostUSD: costUSD,
      estimatedMonthlyCostUSD: monthlyCostUSD,
      estimatedLatencyClass: latencyClass,
    });
  }
}
