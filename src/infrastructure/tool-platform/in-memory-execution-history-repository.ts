import type {
  ExecutionHistoryRepositoryPort,
  ExecutionHistoryRecord,
} from '../../application/tool-platform/ports/execution-history-repository-port';
import { TenantContext } from '../../application/identity/tenant-context';

export class InMemoryExecutionHistoryRepositoryAdapter implements ExecutionHistoryRepositoryPort {
  private readonly records = new Map<
    string,
    Map<string, ExecutionHistoryRecord>
  >();

  private getTenantMap(tenantId: string): Map<string, ExecutionHistoryRecord> {
    let map = this.records.get(tenantId);
    if (!map) {
      map = new Map<string, ExecutionHistoryRecord>();
      this.records.set(tenantId, map);
    }
    return map;
  }

  async saveRecord(
    tenant: Readonly<TenantContext>,
    record: Readonly<ExecutionHistoryRecord>,
  ): Promise<void> {
    this.getTenantMap(tenant.tenantId).set(
      record.executionId,
      record as ExecutionHistoryRecord,
    );
  }

  async findRecordById(
    tenant: Readonly<TenantContext>,
    executionId: string,
  ): Promise<ExecutionHistoryRecord | undefined> {
    return this.getTenantMap(tenant.tenantId).get(executionId);
  }

  async listRecordsByToolId(
    tenant: Readonly<TenantContext>,
    toolId: string,
  ): Promise<ReadonlyArray<ExecutionHistoryRecord>> {
    const all = Array.from(this.getTenantMap(tenant.tenantId).values());
    return Object.freeze(all.filter((r) => r.toolId === toolId));
  }
}
