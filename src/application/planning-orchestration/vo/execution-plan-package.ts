import { ExecutionPlanInstance } from '../domain/execution-plan-instance';
import { ExecutionGraph } from '../graph/execution-graph';
import { VariableReference } from './variable-reference';
import { ArtifactReference } from './artifact-reference';

export interface ExecutionPlanPackageProps {
  readonly instance: ExecutionPlanInstance;
  readonly graph: ExecutionGraph;
  readonly variables: ReadonlyArray<VariableReference>;
  readonly artifacts: ReadonlyArray<ArtifactReference>;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly traceId: string;
}

export class ExecutionPlanPackage {
  readonly instance: ExecutionPlanInstance;
  readonly graph: ExecutionGraph;
  readonly variables: ReadonlyArray<VariableReference>;
  readonly artifacts: ReadonlyArray<ArtifactReference>;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly traceId: string;

  constructor(props: ExecutionPlanPackageProps) {
    this.instance = props.instance;
    this.graph = props.graph;
    this.variables = Object.freeze([...props.variables]);
    this.artifacts = Object.freeze([...props.artifacts]);
    this.metadata = Object.freeze({ ...props.metadata });
    this.traceId = props.traceId;
    Object.freeze(this);
  }
}
