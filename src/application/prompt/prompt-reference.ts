import { PromptAlias, type PromptTargetAlias } from './prompt-alias';

export interface PromptReferenceProps {
  readonly namespace?: string | undefined;
  readonly name: string;
  readonly targetAlias?: PromptTargetAlias | undefined;
  readonly explicitVersion?: string | undefined;
}

export class PromptReference {
  readonly namespace: string;
  readonly name: string;
  readonly targetAlias?: PromptTargetAlias | undefined;
  readonly explicitVersion?: string | undefined;
  readonly fullReference: string;

  constructor(props: Readonly<PromptReferenceProps>) {
    if (!props.name || props.name.trim() === '') {
      throw new Error('[PromptReference] name cannot be empty.');
    }

    this.namespace = props.namespace ? props.namespace.trim() : 'core';
    this.name = props.name.trim();
    this.targetAlias = props.targetAlias ?? PromptAlias.PRODUCTION;
    this.explicitVersion = props.explicitVersion;

    const target = this.explicitVersion
      ? `v${this.explicitVersion}`
      : typeof this.targetAlias === 'string'
        ? this.targetAlias
        : String(this.targetAlias);

    this.fullReference = `${this.namespace}/${this.name}:${target}`;

    Object.freeze(this);
  }

  static parse(referenceString: string): PromptReference {
    if (!referenceString || referenceString.trim() === '') {
      throw new Error('[PromptReference] Reference string cannot be empty.');
    }

    // Format: "namespace/name:target" or "namespace/name" or "name:target" or "name"
    let namespace = 'core';
    let remaining = referenceString.trim();

    if (remaining.includes('/')) {
      const parts = remaining.split('/');
      namespace = parts[0]!;
      remaining = parts.slice(1).join('/');
    }

    let name = remaining;
    let targetAlias: PromptTargetAlias = PromptAlias.PRODUCTION;
    let explicitVersion: string | undefined;

    if (remaining.includes(':')) {
      const parts = remaining.split(':');
      name = parts[0]!;
      const targetStr = parts[1]!.trim();

      if (
        targetStr.startsWith('v') &&
        /^\d+\.\d+\.\d+$/.test(targetStr.slice(1))
      ) {
        explicitVersion = targetStr.slice(1);
      } else {
        targetAlias = targetStr as PromptTargetAlias;
      }
    }

    return new PromptReference({
      namespace,
      name,
      targetAlias,
      explicitVersion,
    });
  }
}
