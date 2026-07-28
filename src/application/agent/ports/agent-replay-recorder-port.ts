import type { TenantContext } from '../../identity/tenant-context';
import type { ReplaySnapshot } from '../../intelligence/replay/replay-session';

export interface AgentReplayRecorderPort {
  recordSnapshot(
    context: Readonly<TenantContext>,
    snapshot: Readonly<ReplaySnapshot>,
  ): Promise<void>;
}
