import type { TenantContext } from '../../application/identity/tenant-context';
import {
  ReplaySession,
  type ReplaySnapshot,
} from '../../application/intelligence/replay/replay-session';
import type { AgentReplayRecorderPort } from '../../application/agent/ports/agent-replay-recorder-port';

export class TenantPartitionedReplayStoreAdapter implements AgentReplayRecorderPort {
  private readonly tenantSessions = new Map<
    string,
    Map<string, ReplaySnapshot[]>
  >();

  async recordSnapshot(
    context: Readonly<TenantContext>,
    snapshot: Readonly<ReplaySnapshot>,
  ): Promise<void> {
    let tenantMap = this.tenantSessions.get(context.tenantId);
    if (!tenantMap) {
      tenantMap = new Map<string, ReplaySnapshot[]>();
      this.tenantSessions.set(context.tenantId, tenantMap);
    }

    const existing = tenantMap.get(snapshot.sessionId) ?? [];
    existing.push(snapshot);
    tenantMap.set(snapshot.sessionId, existing);
  }

  async getSession(
    context: Readonly<TenantContext>,
    sessionId: string,
  ): Promise<ReplaySession | null> {
    const tenantMap = this.tenantSessions.get(context.tenantId);
    if (!tenantMap) return null;

    const snapshots = tenantMap.get(sessionId);
    if (!snapshots) return null;

    return new ReplaySession(sessionId, snapshots);
  }
}
