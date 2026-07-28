import { GoalAnalysisResult } from './goal-analyzer';

export interface Subtask {
  readonly subtaskId: string;
  readonly name: string;
  readonly type: 'PROMPT' | 'TOOL' | 'APPROVAL';
}

export class TaskDecomposer {
  decompose(analysis: GoalAnalysisResult): ReadonlyArray<Subtask> {
    if (!analysis.isComplex) {
      return [
        { subtaskId: 'sub-1', name: `Execute ${analysis.goal}`, type: 'TOOL' },
      ];
    }

    return [
      { subtaskId: 'sub-1', name: 'Analyze requirements', type: 'PROMPT' },
      { subtaskId: 'sub-2', name: 'Execute main action', type: 'TOOL' },
      { subtaskId: 'sub-3', name: 'Verify & approve result', type: 'APPROVAL' },
    ];
  }
}
