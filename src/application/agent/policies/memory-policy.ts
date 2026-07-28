export class MemoryPolicy {
  readonly historyLimit: number;
  readonly injectSemanticMemory: boolean;
  readonly semanticLimit: number;

  constructor(
    historyLimit = 10,
    injectSemanticMemory = false,
    semanticLimit = 3,
  ) {
    this.historyLimit = historyLimit;
    this.injectSemanticMemory = injectSemanticMemory;
    this.semanticLimit = semanticLimit;
    Object.freeze(this);
  }

  static default(): MemoryPolicy {
    return new MemoryPolicy();
  }
}
