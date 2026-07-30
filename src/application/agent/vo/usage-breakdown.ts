export interface UsageBreakdownProps {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly cachedTokens?: number | undefined;
  readonly reasoningTokens?: number | undefined;
}

export class UsageBreakdown {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly cachedTokens?: number | undefined;
  readonly reasoningTokens?: number | undefined;

  private constructor(props: Readonly<UsageBreakdownProps>) {
    if (
      props.promptTokens < 0 ||
      props.completionTokens < 0 ||
      props.totalTokens < 0
    ) {
      throw new Error('[UsageBreakdown] Token counts cannot be negative.');
    }
    this.promptTokens = props.promptTokens;
    this.completionTokens = props.completionTokens;
    this.totalTokens = props.totalTokens;
    this.cachedTokens = props.cachedTokens;
    this.reasoningTokens = props.reasoningTokens;
    Object.freeze(this);
  }

  static create(props: Readonly<UsageBreakdownProps>): UsageBreakdown {
    return new UsageBreakdown(props);
  }

  static zero(): UsageBreakdown {
    return new UsageBreakdown({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    });
  }
}
