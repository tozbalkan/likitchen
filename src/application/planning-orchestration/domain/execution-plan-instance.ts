import { PlanState } from '../vo/plan-state';
import { PlanBudget } from '../vo/plan-budget';
import { ExecutionCursor } from '../vo/execution-cursor';
import { ExecutionCheckpoint } from '../vo/execution-checkpoint';
import { VariableReference } from '../vo/variable-reference';
import { ArtifactReference } from '../vo/artifact-reference';
import { ExecutionTrace, ExecutionSpan } from '../vo/execution-trace';

export interface ExecutionPlanInstanceProps {
  readonly instanceId: string;
  readonly tenantId: string;
  readonly planId: string;
  readonly version: string;
  readonly graphId: string;
  readonly concurrencyVersion: number;
  readonly cursor: ExecutionCursor;
  readonly checkpoints: ReadonlyArray<ExecutionCheckpoint>;
  readonly variables: ReadonlyArray<VariableReference>;
  readonly artifacts: ReadonlyArray<ArtifactReference>;
  readonly trace: ExecutionTrace;
  readonly state: PlanState;
  readonly budget: PlanBudget;
  readonly consumedCostUSD: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class ExecutionPlanInstance {
  readonly instanceId: string;
  readonly tenantId: string;
  readonly planId: string;
  readonly version: string;
  readonly graphId: string;
  readonly concurrencyVersion: number;
  readonly cursor: ExecutionCursor;
  readonly checkpoints: ReadonlyArray<ExecutionCheckpoint>;
  readonly variables: ReadonlyArray<VariableReference>;
  readonly artifacts: ReadonlyArray<ArtifactReference>;
  readonly trace: ExecutionTrace;
  readonly state: PlanState;
  readonly budget: PlanBudget;
  readonly consumedCostUSD: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: ExecutionPlanInstanceProps) {
    this.instanceId = props.instanceId;
    this.tenantId = props.tenantId;
    this.planId = props.planId;
    this.version = props.version;
    this.graphId = props.graphId;
    this.concurrencyVersion = props.concurrencyVersion;
    this.cursor = props.cursor;
    this.checkpoints = Object.freeze([...props.checkpoints]);
    this.variables = Object.freeze([...props.variables]);
    this.artifacts = Object.freeze([...props.artifacts]);
    this.trace = props.trace;
    this.state = props.state;
    this.budget = props.budget;
    this.consumedCostUSD = props.consumedCostUSD;
    this.createdAt = new Date(props.createdAt);
    this.updatedAt = new Date(props.updatedAt);
    Object.freeze(this);
  }

  static create(
    props: Omit<
      ExecutionPlanInstanceProps,
      | 'concurrencyVersion'
      | 'checkpoints'
      | 'variables'
      | 'artifacts'
      | 'trace'
      | 'state'
      | 'consumedCostUSD'
      | 'createdAt'
      | 'updatedAt'
    >,
  ): ExecutionPlanInstance {
    const now = new Date();
    return new ExecutionPlanInstance({
      ...props,
      concurrencyVersion: 1,
      checkpoints: [],
      variables: [],
      artifacts: [],
      trace: ExecutionTrace.createInitial(props.instanceId),
      state: 'PLANNED',
      consumedCostUSD: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  withState(state: PlanState): ExecutionPlanInstance {
    return new ExecutionPlanInstance({
      ...this,
      state,
      concurrencyVersion: this.concurrencyVersion + 1,
      updatedAt: new Date(),
    });
  }

  withCursor(cursor: ExecutionCursor): ExecutionPlanInstance {
    return new ExecutionPlanInstance({
      ...this,
      cursor,
      concurrencyVersion: this.concurrencyVersion + 1,
      updatedAt: new Date(),
    });
  }

  addSpan(span: ExecutionSpan): ExecutionPlanInstance {
    const updatedTrace = this.trace.addSpan(span);
    const costIncrement = span.costUSD ?? 0;
    return new ExecutionPlanInstance({
      ...this,
      trace: updatedTrace,
      consumedCostUSD: this.consumedCostUSD + costIncrement,
      concurrencyVersion: this.concurrencyVersion + 1,
      updatedAt: new Date(),
    });
  }

  addCheckpoint(checkpoint: ExecutionCheckpoint): ExecutionPlanInstance {
    const filtered = this.checkpoints.filter(
      (c) => c.checkpointId !== checkpoint.checkpointId,
    );
    return new ExecutionPlanInstance({
      ...this,
      checkpoints: [...filtered, checkpoint],
      concurrencyVersion: this.concurrencyVersion + 1,
      updatedAt: new Date(),
    });
  }

  addVariable(variable: VariableReference): ExecutionPlanInstance {
    const filtered = this.variables.filter((v) => v.key !== variable.key);
    return new ExecutionPlanInstance({
      ...this,
      variables: [...filtered, variable],
      concurrencyVersion: this.concurrencyVersion + 1,
      updatedAt: new Date(),
    });
  }

  addArtifact(artifact: ArtifactReference): ExecutionPlanInstance {
    return new ExecutionPlanInstance({
      ...this,
      artifacts: [...this.artifacts, artifact],
      concurrencyVersion: this.concurrencyVersion + 1,
      updatedAt: new Date(),
    });
  }
}
