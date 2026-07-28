export interface ConditionEvaluatorPort {
  evaluate(
    condition: string,
    variables: Readonly<Record<string, unknown>>,
  ): Promise<boolean>;
}
