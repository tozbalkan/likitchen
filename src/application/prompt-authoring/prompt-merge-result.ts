import { TenantContext } from '../identity/tenant-context';
import { PromptDocument } from '../prompt/prompt-document';

export type MergeReason =
  'AutoSave' | 'PublishConflict' | 'Import' | 'RestoreRevision';

export interface MergeContextProps {
  readonly baseVersionChecksum: string;
  readonly mergeReason: MergeReason;
  readonly tenantContext: TenantContext;
  readonly promptType?: string | undefined;
  readonly branchPolicy?: string | undefined;
  readonly workspacePolicy?: string | undefined;
}

export class MergeContext {
  readonly baseVersionChecksum: string;
  readonly mergeReason: MergeReason;
  readonly tenantContext: TenantContext;
  readonly promptType?: string | undefined;
  readonly branchPolicy?: string | undefined;
  readonly workspacePolicy?: string | undefined;

  constructor(props: MergeContextProps) {
    this.baseVersionChecksum = props.baseVersionChecksum;
    this.mergeReason = props.mergeReason;
    this.tenantContext = props.tenantContext;
    this.promptType = props.promptType;
    this.branchPolicy = props.branchPolicy;
    this.workspacePolicy = props.workspacePolicy;
    Object.freeze(this);
  }

  static create(props: MergeContextProps): MergeContext {
    return new MergeContext(props);
  }
}

export interface ConflictBlock {
  readonly field: string;
  readonly baseValue: string;
  readonly currentValue: string;
  readonly incomingValue: string;
}

export interface PromptMergeResultProps {
  readonly isSuccessful: boolean;
  readonly hasConflicts: boolean;
  readonly mergedDocument?: PromptDocument | undefined;
  readonly conflicts: ReadonlyArray<ConflictBlock>;
  readonly strategyName: string;
}

export class PromptMergeResult {
  readonly isSuccessful: boolean;
  readonly hasConflicts: boolean;
  readonly mergedDocument?: PromptDocument | undefined;
  readonly conflicts: ReadonlyArray<ConflictBlock>;
  readonly strategyName: string;

  constructor(props: PromptMergeResultProps) {
    this.isSuccessful = props.isSuccessful;
    this.hasConflicts = props.hasConflicts;
    this.mergedDocument = props.mergedDocument;
    this.conflicts = Object.freeze([...props.conflicts]);
    this.strategyName = props.strategyName;
    Object.freeze(this);
  }
}
