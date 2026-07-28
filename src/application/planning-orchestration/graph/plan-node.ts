import { NodeContract } from '../vo/node-contract';
import { NodeExecutionPolicy } from '../vo/node-execution-policy';

export type BehaviorType =
  | 'PROMPT'
  | 'TOOL'
  | 'APPROVAL'
  | 'DECISION'
  | 'CONDITION'
  | 'DELAY'
  | 'PARALLEL'
  | 'MERGE';

export interface PlanNodeProps {
  readonly nodeId: string;
  readonly name: string;
  readonly behaviorType: BehaviorType;
  readonly contract?: NodeContract | undefined;
  readonly policy?: NodeExecutionPolicy | undefined;
  readonly payload?: Readonly<Record<string, unknown>> | undefined;
  readonly compensationNodeId?: string | undefined;
}

export class PlanNode {
  readonly nodeId: string;
  readonly name: string;
  readonly behaviorType: BehaviorType;
  readonly contract: NodeContract;
  readonly policy: NodeExecutionPolicy;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly compensationNodeId?: string | undefined;

  constructor(props: PlanNodeProps) {
    this.nodeId = props.nodeId;
    this.name = props.name;
    this.behaviorType = props.behaviorType;
    this.contract = props.contract ?? NodeContract.createDefault();
    this.policy = props.policy ?? new NodeExecutionPolicy('ABORT_PLAN');
    this.payload = Object.freeze(props.payload ? { ...props.payload } : {});
    this.compensationNodeId = props.compensationNodeId;
    Object.freeze(this);
  }
}
