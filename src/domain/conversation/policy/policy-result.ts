export interface PolicyExplanation<R extends string = string> {
  readonly code: R;
  readonly message?: string;
}

export interface PolicyResult<T, R extends string = string> {
  readonly decision: T;
  readonly explanations: readonly PolicyExplanation<R>[];
  readonly policyVersion: string;
}
