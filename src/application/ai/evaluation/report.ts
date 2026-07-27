export interface EvaluationReport {
  readonly engineVersion: number;
  readonly promptVersion: number;
  readonly schemaVersion: number;
  readonly datasetVersion: string;
  readonly totalCases: number;
  readonly passedCases: number;
  readonly failedCases: number;
  readonly accuracy: number; // percentage 0-100
  readonly recommendationAccuracy: number; // percentage 0-100
  readonly ruleCoverage: Readonly<Record<string, number>>; // rule name -> hit count
  readonly decisionDrift: number; // count/percentage of decision drift vs baseline
  readonly averageTokens: number;
  readonly averageCost: number;
}
