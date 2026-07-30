import type { ContextEntry } from '../../vo/context-entry';
import type { ContextAssemblyRequest } from '../../vo/context-assembly-request';
import type { ContextSourceType } from '../../vo/context-source-type';
import type { SourceUtilization } from '../../vo/context-assembly-trace';

export interface BudgetEnforcementResult {
  readonly includedEntries: ReadonlyArray<ContextEntry>;
  readonly totalTokensUsed: number;
  readonly totalItemsDiscarded: number;
  readonly utilizationBySource: ReadonlyMap<
    ContextSourceType,
    SourceUtilization
  >;
  readonly sourceCounts: ReadonlyMap<ContextSourceType, number>;
}

/**
 * Single-responsibility service for deterministic sorting and greedy budget allocation.
 */
export class ContextPrioritizerAndBudgetReducer {
  process(
    entries: ReadonlyArray<ContextEntry>,
    request: Readonly<ContextAssemblyRequest>,
  ): BudgetEnforcementResult {
    // 1. Deterministic sort: (priority DESC, relevanceScore DESC, entryId ASC)
    const sorted = [...entries].sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      if (Math.abs(b.relevanceScore - a.relevanceScore) > 0.0001) {
        return b.relevanceScore - a.relevanceScore;
      }
      return a.entryId.localeCompare(b.entryId);
    });

    // 2. Greedy budget allocation
    let tokenBudgetRemaining = request.tokenBudget;
    let itemBudgetRemaining = request.maxItems;
    const included: ContextEntry[] = [];
    let totalTokensUsed = 0;
    let totalDiscarded = 0;

    const sourceCounts = new Map<ContextSourceType, number>();
    const utilMap = new Map<
      ContextSourceType,
      { tokensUsed: number; itemsIncluded: number; itemsDiscarded: number }
    >();

    for (const entry of sorted) {
      if (
        entry.tokenEstimate <= tokenBudgetRemaining &&
        itemBudgetRemaining > 0
      ) {
        included.push(entry);
        tokenBudgetRemaining -= entry.tokenEstimate;
        itemBudgetRemaining--;
        totalTokensUsed += entry.tokenEstimate;

        const util = utilMap.get(entry.sourceType) ?? {
          tokensUsed: 0,
          itemsIncluded: 0,
          itemsDiscarded: 0,
        };
        util.tokensUsed += entry.tokenEstimate;
        util.itemsIncluded++;
        utilMap.set(entry.sourceType, util);
        sourceCounts.set(
          entry.sourceType,
          (sourceCounts.get(entry.sourceType) ?? 0) + 1,
        );
      } else {
        totalDiscarded++;
        const util = utilMap.get(entry.sourceType) ?? {
          tokensUsed: 0,
          itemsIncluded: 0,
          itemsDiscarded: 0,
        };
        util.itemsDiscarded++;
        utilMap.set(entry.sourceType, util);
      }
    }

    const frozenUtilization = new Map<ContextSourceType, SourceUtilization>();
    for (const [k, v] of utilMap.entries()) {
      frozenUtilization.set(k, Object.freeze({ ...v }));
    }

    return Object.freeze({
      includedEntries: Object.freeze(included),
      totalTokensUsed,
      totalItemsDiscarded: totalDiscarded,
      utilizationBySource: Object.freeze(frozenUtilization),
      sourceCounts: Object.freeze(sourceCounts),
    });
  }
}
