import { DiffClassification } from './prompt-diff-result';

export class DiffClassifier {
  static classify(
    removedVariables: ReadonlyArray<string>,
    addedVariables: ReadonlyArray<string>,
    systemChanged: boolean,
    userChanged: boolean,
  ): DiffClassification {
    // 1. Removing a variable is BREAKING
    if (removedVariables.length > 0) {
      return new DiffClassification({
        category: 'BREAKING',
        confidence: 0.95,
        requiresHumanReview: true,
        reason: `Variables removed: [${removedVariables.join(', ')}]`,
      });
    }

    // 2. Modifying system prompt or adding variables is POTENTIALLY_BREAKING
    if (systemChanged || addedVariables.length > 0) {
      return new DiffClassification({
        category: 'POTENTIALLY_BREAKING',
        confidence: 0.85,
        requiresHumanReview: true,
        reason: systemChanged
          ? 'System prompt instruction modified.'
          : `New variables added: [${addedVariables.join(', ')}]`,
      });
    }

    // 3. User message text changes are NON_BREAKING
    if (userChanged) {
      return new DiffClassification({
        category: 'NON_BREAKING',
        confidence: 0.9,
        requiresHumanReview: false,
        reason: 'User template wording updated.',
      });
    }

    // 4. Otherwise COSMETIC
    return new DiffClassification({
      category: 'COSMETIC',
      confidence: 1.0,
      requiresHumanReview: false,
      reason: 'No structural or variable changes detected.',
    });
  }
}
