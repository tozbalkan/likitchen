import { randomUUID } from 'node:crypto';
import type { ContextEntry } from '../../vo/context-entry';
import { ContextConflict } from '../../vo/context-conflict';

export interface ConflictDetectionResult {
  readonly taggedEntries: ReadonlyArray<ContextEntry>;
  readonly conflicts: ReadonlyArray<ContextConflict>;
}

/**
 * Single-responsibility service for detecting semantic conflicts
 * and creating ContextConflict descriptors with DEFERRED_TO_AGENT resolution state.
 */
export class ContextConflictDetector {
  detectConflicts(
    entries: ReadonlyArray<ContextEntry>,
  ): ConflictDetectionResult {
    const conflicts: ContextConflict[] = [];

    // 1. Group entries by semantic key (sourceId)
    const groups = new Map<string, ContextEntry[]>();
    for (const entry of entries) {
      const semanticKey = entry.sourceId;
      const group = groups.get(semanticKey) ?? [];
      group.push(entry);
      groups.set(semanticKey, group);
    }

    for (const [semanticKey, group] of groups.entries()) {
      if (group.length < 2) continue;

      const uniqueContents = new Set(group.map((e) => e.content));
      if (uniqueContents.size <= 1) continue; // Same content is not a conflict

      conflicts.push(
        new ContextConflict({
          conflictId: `conflict-${randomUUID()}`,
          semanticKey,
          competingEntryIds: group.map((e) => e.entryId),
          conflictType:
            group.some((e) => e.sourceType === 'MEMORY') &&
            group.some((e) => e.sourceType === 'KNOWLEDGE')
              ? 'MEMORY_VS_KNOWLEDGE'
              : 'CROSS_SCOPE_DISAGREEMENT',
          priorityMetadata: group.map((e) => ({
            entryId: e.entryId,
            priority: e.priority,
            sourceType: e.sourceType,
          })),
          resolutionState: 'DEFERRED_TO_AGENT',
          evidence: group.map((e) => e.evidence),
        }),
      );
    }

    // 2. Memory key contradictory fact conflicts
    const memoryEntries = entries.filter((e) => e.sourceType === 'MEMORY');
    if (memoryEntries.length > 1) {
      const memKeyGroups = new Map<string, ContextEntry[]>();
      for (const me of memoryEntries) {
        if (me.evidence.type === 'MEMORY') {
          const k = me.evidence.key;
          const grp = memKeyGroups.get(k) ?? [];
          grp.push(me);
          memKeyGroups.set(k, grp);
        }
      }

      for (const [key, grp] of memKeyGroups.entries()) {
        if (grp.length < 2) continue;
        const uniqueContents = new Set(grp.map((e) => e.content));
        if (uniqueContents.size <= 1) continue;

        const alreadyDetected = conflicts.some(
          (c) =>
            c.competingEntryIds.length === grp.length &&
            grp.every((e) => c.competingEntryIds.includes(e.entryId)),
        );
        if (alreadyDetected) continue;

        conflicts.push(
          new ContextConflict({
            conflictId: `conflict-${randomUUID()}`,
            semanticKey: `memory:${key}`,
            competingEntryIds: grp.map((e) => e.entryId),
            conflictType: 'CONTRADICTORY_MEMORY_FACTS',
            priorityMetadata: grp.map((e) => ({
              entryId: e.entryId,
              priority: e.priority,
              sourceType: e.sourceType,
            })),
            resolutionState: 'DEFERRED_TO_AGENT',
            evidence: grp.map((e) => e.evidence),
          }),
        );
      }
    }

    // 3. Tag competing entries
    const conflictEntryIds = new Set<string>();
    for (const c of conflicts) {
      for (const id of c.competingEntryIds) {
        conflictEntryIds.add(id);
      }
    }

    const taggedEntries = entries.map((e) =>
      conflictEntryIds.has(e.entryId) ? e.withConflictStatus('COMPETING') : e,
    );

    return Object.freeze({
      taggedEntries: Object.freeze(taggedEntries),
      conflicts: Object.freeze(conflicts),
    });
  }
}
