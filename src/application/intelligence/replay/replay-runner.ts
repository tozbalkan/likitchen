import type { ProviderResult } from '../../ports/common/provider-result';
import type { ReplaySession } from './replay-session';

export class ReplayRunner {
  async runReplay(
    session: Readonly<ReplaySession>,
  ): Promise<readonly ProviderResult<string>[]> {
    return session.snapshots.map((s) => s.providerResult);
  }
}
