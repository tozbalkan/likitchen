import {
  ReplaySession,
  type ReplaySnapshot,
} from '../../application/intelligence/replay/replay-session';

export class FileReplaySessionStoreAdapter {
  private readonly sessions = new Map<string, ReplaySnapshot[]>();

  async recordSnapshot(snapshot: Readonly<ReplaySnapshot>): Promise<void> {
    const existing = this.sessions.get(snapshot.sessionId) ?? [];
    existing.push(snapshot);
    this.sessions.set(snapshot.sessionId, existing);
  }

  async getSession(sessionId: string): Promise<ReplaySession | null> {
    const snapshots = this.sessions.get(sessionId);
    if (!snapshots) return null;
    return new ReplaySession(sessionId, snapshots);
  }
}
