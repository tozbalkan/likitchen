import { MemoryRecord } from '../domain/memory-record';

export interface MemoryConflictPair {
  readonly key: string;
  readonly recordA: MemoryRecord;
  readonly recordB: MemoryRecord;
  readonly conflictReason: string;
}

export type ConflictResolutionPolicy =
  'MOST_RECENT_WINS' | 'HIGHEST_CONFIDENCE_WINS';

export class MemoryConflictResolver {
  detectConflicts(
    memories: ReadonlyArray<MemoryRecord>,
  ): ReadonlyArray<MemoryConflictPair> {
    const activeMemories = memories.filter((m) => m.state === 'ACTIVE');
    const conflicts: MemoryConflictPair[] = [];

    // Group active memories by key
    const groups = new Map<string, MemoryRecord[]>();
    for (const m of activeMemories) {
      const groupKey = `${m.scopeContext.scope}:${m.scopeContext.scopeId}:${m.memoryType}:${m.key}`;
      const group = groups.get(groupKey) ?? [];
      group.push(m);
      groups.set(groupKey, group);
    }

    // Identify multiple active records for identical key (contradictory un-superseded records)
    for (const [key, group] of groups.entries()) {
      if (group.length > 1) {
        for (let i = 0; i < group.length - 1; i++) {
          for (let j = i + 1; j < group.length; j++) {
            const recordA = group[i]!;
            const recordB = group[j]!;
            if (recordA.content !== recordB.content) {
              conflicts.push({
                key,
                recordA,
                recordB,
                conflictReason: `Multiple active memory records found for key '${recordA.key}' with conflicting content.`,
              });
            }
          }
        }
      }
    }

    return Object.freeze(conflicts);
  }

  resolveConflict(
    pair: Readonly<MemoryConflictPair>,
    policy: ConflictResolutionPolicy = 'MOST_RECENT_WINS',
  ): {
    readonly winner: MemoryRecord;
    readonly loserToSupersede: MemoryRecord;
  } {
    if (policy === 'HIGHEST_CONFIDENCE_WINS') {
      if (pair.recordA.confidenceScore >= pair.recordB.confidenceScore) {
        return {
          winner: pair.recordA,
          loserToSupersede: pair.recordB.supersede(pair.recordA.memoryId),
        };
      }
      return {
        winner: pair.recordB,
        loserToSupersede: pair.recordA.supersede(pair.recordB.memoryId),
      };
    }

    // Default: MOST_RECENT_WINS
    if (pair.recordA.createdAt.getTime() >= pair.recordB.createdAt.getTime()) {
      return {
        winner: pair.recordA,
        loserToSupersede: pair.recordB.supersede(pair.recordA.memoryId),
      };
    }
    return {
      winner: pair.recordB,
      loserToSupersede: pair.recordA.supersede(pair.recordB.memoryId),
    };
  }
}
