import { PromptDocument } from '../prompt/prompt-document';
import { PromptDiffResult, LineDiffItem } from './prompt-diff-result';
import { DiffClassifier } from './diff-classifier';

export class PromptDiffService {
  computeDiff(
    base: Readonly<PromptDocument>,
    current: Readonly<PromptDocument>,
  ): PromptDiffResult {
    const sysDiff = this.diffLines(base.systemTemplate, current.systemTemplate);
    const usrDiff = this.diffLines(base.userTemplate, current.userTemplate);

    const baseVars = new Set(base.variables);
    const curVars = new Set(current.variables);

    const addedVars = current.variables.filter((v) => !baseVars.has(v));
    const removedVars = base.variables.filter((v) => !curVars.has(v));

    const systemChanged = base.systemTemplate !== current.systemTemplate;
    const userChanged = base.userTemplate !== current.userTemplate;

    const classification = DiffClassifier.classify(
      removedVars,
      addedVars,
      systemChanged,
      userChanged,
    );

    return new PromptDiffResult({
      systemPromptDiff: sysDiff,
      userMessageDiff: usrDiff,
      addedVariables: addedVars,
      removedVariables: removedVars,
      classification,
    });
  }

  private diffLines(oldText: string, newText: string): LineDiffItem[] {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const items: LineDiffItem[] = [];

    const maxLen = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLen; i++) {
      const o = oldLines[i];
      const n = newLines[i];

      if (o === n) {
        if (o !== undefined) {
          items.push({ type: 'unchanged', content: o });
        }
      } else {
        if (o !== undefined) {
          items.push({ type: 'removed', content: o });
        }
        if (n !== undefined) {
          items.push({ type: 'added', content: n });
        }
      }
    }

    return items;
  }
}
