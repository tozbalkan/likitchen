export type DiffCategory =
  'BREAKING' | 'POTENTIALLY_BREAKING' | 'NON_BREAKING' | 'COSMETIC';

export interface DiffClassificationProps {
  readonly category: DiffCategory;
  readonly confidence: number; // 0.0 to 1.0
  readonly requiresHumanReview: boolean;
  readonly reason: string;
}

export class DiffClassification {
  readonly category: DiffCategory;
  readonly confidence: number;
  readonly requiresHumanReview: boolean;
  readonly reason: string;

  constructor(props: DiffClassificationProps) {
    this.category = props.category;
    this.confidence = props.confidence;
    this.requiresHumanReview = props.requiresHumanReview;
    this.reason = props.reason;
    Object.freeze(this);
  }
}

export interface LineDiffItem {
  readonly type: 'added' | 'removed' | 'unchanged';
  readonly content: string;
}

export interface PromptDiffResultProps {
  readonly systemPromptDiff: ReadonlyArray<LineDiffItem>;
  readonly userMessageDiff: ReadonlyArray<LineDiffItem>;
  readonly addedVariables: ReadonlyArray<string>;
  readonly removedVariables: ReadonlyArray<string>;
  readonly classification: DiffClassification;
}

export class PromptDiffResult {
  readonly systemPromptDiff: ReadonlyArray<LineDiffItem>;
  readonly userMessageDiff: ReadonlyArray<LineDiffItem>;
  readonly addedVariables: ReadonlyArray<string>;
  readonly removedVariables: ReadonlyArray<string>;
  readonly classification: DiffClassification;

  constructor(props: PromptDiffResultProps) {
    this.systemPromptDiff = Object.freeze([...props.systemPromptDiff]);
    this.userMessageDiff = Object.freeze([...props.userMessageDiff]);
    this.addedVariables = Object.freeze([...props.addedVariables]);
    this.removedVariables = Object.freeze([...props.removedVariables]);
    this.classification = props.classification;
    Object.freeze(this);
  }
}
