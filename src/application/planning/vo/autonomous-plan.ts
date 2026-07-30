import type { SubGoalNode } from './sub-goal-node';

export interface AutonomousPlanProps {
  readonly planId: string;
  readonly planVersion?: number | undefined;
  readonly parentPlanVersion?: number | undefined;
  readonly goalPrompt: string;
  readonly nodes: readonly SubGoalNode[];
}

export class AutonomousPlan {
  readonly planId: string;
  readonly planVersion: number;
  readonly parentPlanVersion: number | undefined;
  readonly goalPrompt: string;
  readonly nodes: readonly SubGoalNode[];

  private constructor(props: Readonly<AutonomousPlanProps>) {
    if (!props.planId || props.planId.trim() === '') {
      throw new Error('[AutonomousPlan] planId is required.');
    }
    if (!props.goalPrompt || props.goalPrompt.trim() === '') {
      throw new Error('[AutonomousPlan] goalPrompt is required.');
    }
    if (!props.nodes || props.nodes.length === 0) {
      throw new Error('[AutonomousPlan] At least one SubGoalNode is required.');
    }

    this.planId = props.planId;
    this.planVersion = props.planVersion ?? 1;
    this.parentPlanVersion = props.parentPlanVersion;
    this.goalPrompt = props.goalPrompt;
    this.nodes = Object.freeze([...props.nodes]);

    this.validateDagInvariants();
    Object.freeze(this);
  }

  static create(props: Readonly<AutonomousPlanProps>): AutonomousPlan {
    return new AutonomousPlan(props);
  }

  private validateDagInvariants(): void {
    const nodeIds = new Set(this.nodes.map((n) => n.subGoalId));
    if (nodeIds.size !== this.nodes.length) {
      throw new Error(
        '[AutonomousPlan] Duplicate subGoalId detected in plan nodes.',
      );
    }

    // Check for missing dependencies and cycles
    for (const node of this.nodes) {
      for (const depId of node.dependencies) {
        if (!nodeIds.has(depId)) {
          throw new Error(
            `[AutonomousPlan] SubGoalNode '${node.subGoalId}' references missing dependency '${depId}'.`,
          );
        }
      }
    }

    // Simple cycle detection via topological sorting
    const visited = new Set<string>();
    const inStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      inStack.add(nodeId);

      const targetNode = this.nodes.find((n) => n.subGoalId === nodeId);
      if (targetNode) {
        for (const depId of targetNode.dependencies) {
          if (!visited.has(depId)) {
            if (hasCycle(depId)) return true;
          } else if (inStack.has(depId)) {
            return true;
          }
        }
      }

      inStack.delete(nodeId);
      return false;
    };

    for (const node of this.nodes) {
      if (!visited.has(node.subGoalId)) {
        if (hasCycle(node.subGoalId)) {
          throw new Error(
            '[AutonomousPlan] Dependency graph contains a cycle (DAG violation).',
          );
        }
      }
    }
  }
}
