export interface EvaluationReport {
  readonly scenarioId: string;
  readonly passed: boolean;
  readonly similarityScore: number;
  readonly driftScore: number;
  readonly evaluatedAt: Date;
  readonly actualOutput: string;
}
