import { Subtask } from './task-decomposer';
import { PlanNode } from '../graph/plan-node';
import { PlanEdge } from '../graph/plan-edge';
import { ExecutionGraph } from '../graph/execution-graph';

export class PlanBuilder {
  buildGraph(
    graphId: string,
    subtasks: ReadonlyArray<Subtask>,
  ): ExecutionGraph {
    const nodes: PlanNode[] = [];
    const edges: PlanEdge[] = [];

    for (let i = 0; i < subtasks.length; i++) {
      const task = subtasks[i]!;
      nodes.push(
        new PlanNode({
          nodeId: task.subtaskId,
          name: task.name,
          behaviorType: task.type,
        }),
      );

      if (i > 0) {
        const prev = subtasks[i - 1]!;
        edges.push(
          new PlanEdge({
            edgeId: `edge-${prev.subtaskId}-${task.subtaskId}`,
            sourceNodeId: prev.subtaskId,
            targetNodeId: task.subtaskId,
          }),
        );
      }
    }

    return ExecutionGraph.create(graphId, nodes, edges);
  }
}
