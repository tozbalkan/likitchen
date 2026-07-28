import { TenantContext } from '../../identity/tenant-context';
import type {
  ExecutionHistoryRepositoryPort,
  ExecutionHistoryRecord,
} from '../ports/execution-history-repository-port';

export interface GetExecutionHistoryQuery {
  readonly toolId: string;
  readonly tenantContext: TenantContext;
}

export class GetExecutionHistoryQueryHandler {
  constructor(private readonly repository: ExecutionHistoryRepositoryPort) {}

  async execute(
    query: GetExecutionHistoryQuery,
  ): Promise<ReadonlyArray<ExecutionHistoryRecord>> {
    return this.repository.listRecordsByToolId(
      query.tenantContext,
      query.toolId,
    );
  }
}
