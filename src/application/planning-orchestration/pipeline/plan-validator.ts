import { ExecutionGraph } from '../graph/execution-graph';

export class PlanValidator {
  validate(graph: ExecutionGraph): {
    isValid: boolean;
    errors: ReadonlyArray<string>;
  } {
    try {
      graph.topologicalSort();
      return { isValid: true, errors: [] };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { isValid: false, errors: [msg] };
    }
  }
}
