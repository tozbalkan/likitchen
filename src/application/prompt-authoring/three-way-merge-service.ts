import type { MergeStrategyPort } from './ports/merge-strategy-port';
import { PromptDocument } from '../prompt/prompt-document';
import {
  MergeContext,
  PromptMergeResult,
  ConflictBlock,
} from './prompt-merge-result';

export class ThreeWayMergeStrategy implements MergeStrategyPort {
  readonly name = 'ThreeWayMergeStrategy';

  async merge(
    base: Readonly<PromptDocument>,
    current: Readonly<PromptDocument>,
    incoming: Readonly<PromptDocument>,
    _context: Readonly<MergeContext>,
  ): Promise<PromptMergeResult> {
    const conflicts: ConflictBlock[] = [];

    const mergedSystem = this.mergeField(
      'systemTemplate',
      base.systemTemplate,
      current.systemTemplate,
      incoming.systemTemplate,
      conflicts,
    );

    const mergedUser = this.mergeField(
      'userTemplate',
      base.userTemplate,
      current.userTemplate,
      incoming.userTemplate,
      conflicts,
    );

    const mergedVariables = Array.from(
      new Set([...base.variables, ...current.variables, ...incoming.variables]),
    );

    if (conflicts.length > 0) {
      return new PromptMergeResult({
        isSuccessful: false,
        hasConflicts: true,
        conflicts,
        strategyName: this.name,
      });
    }

    const mergedDoc = PromptDocument.create({
      id: current.id,
      systemTemplate: mergedSystem,
      userTemplate: mergedUser,
      variables: mergedVariables,
    });

    return new PromptMergeResult({
      isSuccessful: true,
      hasConflicts: false,
      mergedDocument: mergedDoc,
      conflicts: [],
      strategyName: this.name,
    });
  }

  private mergeField(
    field: string,
    baseVal: string,
    curVal: string,
    incVal: string,
    conflicts: ConflictBlock[],
  ): string {
    if (curVal === incVal) {
      return curVal;
    }
    if (curVal === baseVal) {
      return incVal;
    }
    if (incVal === baseVal) {
      return curVal;
    }

    // Both curVal and incVal changed from baseVal to different values -> conflict
    conflicts.push({
      field,
      baseValue: baseVal,
      currentValue: curVal,
      incomingValue: incVal,
    });
    return curVal;
  }
}
