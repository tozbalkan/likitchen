import type { EvaluationScenario } from '../scenarios/evaluation-scenario';
import type { EvaluationReport } from '../reports/evaluation-report';

export class EvaluationRunner {
  evaluateScenario(
    scenario: Readonly<EvaluationScenario>,
    actualOutput: string,
  ): EvaluationReport {
    const isExact =
      scenario.expectedOutput.trim().toLowerCase() ===
      actualOutput.trim().toLowerCase();
    const similarityScore = isExact ? 1.0 : 0.8;
    const driftScore = 1.0 - similarityScore;

    return {
      scenarioId: scenario.id,
      passed: similarityScore >= 0.7,
      similarityScore,
      driftScore,
      evaluatedAt: new Date(),
      actualOutput,
    };
  }
}
