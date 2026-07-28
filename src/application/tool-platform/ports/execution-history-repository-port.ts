import { TenantContext } from '../../identity/tenant-context';
import { ToolExecutionResult } from '../vo/tool-execution-result';

export interface ExecutionHistoryRecord {
  readonly executionId: string;
  readonly toolId: string;
  readonly instanceId: string;
  readonly tenantId: string;
  readonly result: ToolExecutionResult;
  readonly createdAt: Date;
}

export interface ExecutionHistoryRepositoryPort {
  saveRecord(
    tenant: Readonly<TenantContext>,
    record: Readonly<ExecutionHistoryRecord>,
  ): Promise<void>;
  findRecordById(
    tenant: Readonly<TenantContext>,
    executionId: string,
  ): Promise<ExecutionHistoryRecord | undefined>;
  listRecordsByToolId(
    tenant: Readonly<TenantContext>,
    toolId: string,
  ): Promise<ReadonlyArray<ExecutionHistoryRecord>>;
}
