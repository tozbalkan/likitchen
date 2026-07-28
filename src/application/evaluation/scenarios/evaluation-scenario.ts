export interface EvaluationScenario {
  readonly id: string;
  readonly name: string;
  readonly inputPrompt: string;
  readonly expectedOutput: string;
  readonly tags?: readonly string[] | undefined;
}

export interface GoldenDataset {
  readonly id: string;
  readonly version: string;
  readonly scenarios: readonly EvaluationScenario[];
}
