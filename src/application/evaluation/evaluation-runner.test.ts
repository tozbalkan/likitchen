import { describe, it, expect } from 'vitest';
import { EvaluationRunner } from './runner/evaluation-runner';
import type { EvaluationScenario } from './scenarios/evaluation-scenario';

describe('EvaluationRunner', () => {
  it('evaluates matching scenario output as pass with 1.0 similarity score', () => {
    const runner = new EvaluationRunner();
    const scenario: EvaluationScenario = {
      id: 'scen-1',
      name: 'Greeting Test',
      inputPrompt: 'Hello',
      expectedOutput: 'Hello there!',
    };

    const report = runner.evaluateScenario(scenario, 'Hello there!');

    expect(report.passed).toBe(true);
    expect(report.similarityScore).toBe(1.0);
    expect(report.driftScore).toBe(0);
  });

  it('evaluates non-matching scenario with reduced similarity score', () => {
    const runner = new EvaluationRunner();
    const scenario: EvaluationScenario = {
      id: 'scen-2',
      name: 'Strict Output Test',
      inputPrompt: 'Tell a joke',
      expectedOutput: 'Why did the chicken cross the road?',
    };

    const report = runner.evaluateScenario(
      scenario,
      'Something completely different',
    );

    expect(report.similarityScore).toBe(0.8);
    expect(report.driftScore).toBeCloseTo(0.2);
  });
});
