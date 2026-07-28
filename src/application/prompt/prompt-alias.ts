export enum PromptAlias {
  LATEST = 'latest',
  STABLE = 'stable',
  PRODUCTION = 'production',
  CANARY = 'canary',
}

export class CustomAlias {
  readonly alias: string;

  constructor(alias: string) {
    if (!alias || alias.trim() === '') {
      throw new Error('[CustomAlias] Alias cannot be empty.');
    }
    this.alias = alias.toLowerCase().trim();
    Object.freeze(this);
  }

  static of(alias: string): CustomAlias {
    return new CustomAlias(alias);
  }
}

export type PromptTargetAlias = PromptAlias | CustomAlias | string;
