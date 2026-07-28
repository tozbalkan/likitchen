import { WorkspaceLifecycle } from '../prompt-workspace';
import { WorkspaceLeaseState } from '../workspace-lease';

export interface WorkspaceReadModelProps {
  readonly workspaceId: string;
  readonly promptId: string;
  readonly tenantId: string;
  readonly baseVersionId: string;
  readonly baseVersionChecksum: string;
  readonly lifecycle: WorkspaceLifecycle;
  readonly leaseState: WorkspaceLeaseState;
  readonly leaseOwnerId?: string | undefined;
  readonly revisionCount: number;
  readonly systemTemplateSnippet: string;
  readonly userTemplateSnippet: string;
  readonly variableNames: ReadonlyArray<string>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class WorkspaceReadModel {
  readonly workspaceId: string;
  readonly promptId: string;
  readonly tenantId: string;
  readonly baseVersionId: string;
  readonly baseVersionChecksum: string;
  readonly lifecycle: WorkspaceLifecycle;
  readonly leaseState: WorkspaceLeaseState;
  readonly leaseOwnerId?: string | undefined;
  readonly revisionCount: number;
  readonly systemTemplateSnippet: string;
  readonly userTemplateSnippet: string;
  readonly variableNames: ReadonlyArray<string>;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: WorkspaceReadModelProps) {
    this.workspaceId = props.workspaceId;
    this.promptId = props.promptId;
    this.tenantId = props.tenantId;
    this.baseVersionId = props.baseVersionId;
    this.baseVersionChecksum = props.baseVersionChecksum;
    this.lifecycle = props.lifecycle;
    this.leaseState = props.leaseState;
    this.leaseOwnerId = props.leaseOwnerId;
    this.revisionCount = props.revisionCount;
    this.systemTemplateSnippet = props.systemTemplateSnippet;
    this.userTemplateSnippet = props.userTemplateSnippet;
    this.variableNames = Object.freeze([...props.variableNames]);
    this.createdAt = new Date(props.createdAt);
    this.updatedAt = new Date(props.updatedAt);
    Object.freeze(this);
  }
}
