import type { ExtractedFacts, ConversationFacts } from '../conversation-facts';
import type { FactChange, MergeResult, FactChangeType } from './fact-change';

export interface ConversationMergerStrategy {
  merge(existing: ConversationFacts, incoming: ExtractedFacts): MergeResult;
}

export class DefaultConversationMerger implements ConversationMergerStrategy {
  merge(existing: ConversationFacts, incoming: ExtractedFacts): MergeResult {
    const facts: ConversationFacts = { ...existing };
    const changes: FactChange[] = [];
    const changedFields: (keyof ExtractedFacts)[] = [];

    // Fields that should not be merged/overwritten simply by presence
    const nonMergeable: (keyof ExtractedFacts)[] = ['attachments'];

    for (const key of Object.keys(incoming) as (keyof ExtractedFacts)[]) {
      if (nonMergeable.includes(key)) {
        continue; // handled separately or not updated by LLM
      }

      const incomingValue = incoming[key];
      const existingValue = existing[key];

      if (incomingValue !== undefined && incomingValue !== null) {
        if (existingValue !== incomingValue) {
          // It's a change
          let type: FactChangeType = 'added';
          if (existingValue !== undefined && existingValue !== null) {
            type = 'updated';
          }

          changes.push({
            field: key,
            type,
            oldValue: existingValue,
            newValue: incomingValue,
          });
          changedFields.push(key);

          // @ts-expect-error - dynamic assignment
          facts[key] = incomingValue;
        }
      }
    }

    return {
      facts,
      changes,
      changedFields,
      hasChanges: changes.length > 0,
    };
  }
}
