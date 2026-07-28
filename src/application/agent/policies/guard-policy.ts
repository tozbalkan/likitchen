export class GuardPolicy {
  readonly enableInputGuards: boolean;
  readonly enableOutputGuards: boolean;
  readonly maxInputLength: number;

  constructor(
    enableInputGuards = true,
    enableOutputGuards = true,
    maxInputLength = 10000,
  ) {
    this.enableInputGuards = enableInputGuards;
    this.enableOutputGuards = enableOutputGuards;
    this.maxInputLength = maxInputLength;
    Object.freeze(this);
  }

  static default(): GuardPolicy {
    return new GuardPolicy();
  }
}
