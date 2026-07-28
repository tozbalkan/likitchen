import { PlanBudget } from '../vo/plan-budget';

export interface PlanVersionProps {
  readonly version: string;
  readonly graphId: string;
  readonly graphChecksum: string;
  readonly defaultBudget: PlanBudget;
  readonly minimumRuntimeVersion?: string | undefined;
  readonly minimumPlannerVersion?: string | undefined;
  readonly createdAt: Date;
}

export class PlanVersion {
  readonly version: string;
  readonly graphId: string;
  readonly graphChecksum: string;
  readonly defaultBudget: PlanBudget;
  readonly minimumRuntimeVersion?: string | undefined;
  readonly minimumPlannerVersion?: string | undefined;
  readonly createdAt: Date;

  constructor(props: PlanVersionProps) {
    this.version = props.version;
    this.graphId = props.graphId;
    this.graphChecksum = props.graphChecksum;
    this.defaultBudget = props.defaultBudget;
    this.minimumRuntimeVersion = props.minimumRuntimeVersion;
    this.minimumPlannerVersion = props.minimumPlannerVersion;
    this.createdAt = new Date(props.createdAt);
    Object.freeze(this);
  }
}
