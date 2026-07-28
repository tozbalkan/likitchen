export interface GoalAnalysisResult {
  readonly goal: string;
  readonly category: string;
  readonly isComplex: boolean;
}

export class GoalAnalyzer {
  analyze(goal: string): GoalAnalysisResult {
    const isComplex =
      goal.length > 50 || goal.includes('and') || goal.includes('then');
    return {
      goal,
      category: isComplex ? 'COMPLEX_WORKFLOW' : 'SINGLE_TASK',
      isComplex,
    };
  }
}
