export interface PlanEdgeProps {
  readonly edgeId: string;
  readonly sourceNodeId: string;
  readonly targetNodeId: string;
  readonly condition?: string | undefined;
}

export class PlanEdge {
  readonly edgeId: string;
  readonly sourceNodeId: string;
  readonly targetNodeId: string;
  readonly condition?: string | undefined;

  constructor(props: PlanEdgeProps) {
    this.edgeId = props.edgeId;
    this.sourceNodeId = props.sourceNodeId;
    this.targetNodeId = props.targetNodeId;
    this.condition = props.condition;
    Object.freeze(this);
  }
}
