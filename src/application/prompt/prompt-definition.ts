export interface PromptDefinitionProps {
  readonly id: string;
  readonly namespace: string;
  readonly name: string;
  readonly description: string;
  readonly currentVersionId: string;
  readonly tags: readonly string[];
  readonly owner: string;
  readonly createdAt: Date;
}

export class PromptDefinition {
  readonly id: string;
  readonly namespace: string;
  readonly name: string;
  readonly description: string;
  readonly currentVersionId: string;
  readonly tags: readonly string[];
  readonly owner: string;
  readonly createdAt: Date;

  private constructor(props: Readonly<PromptDefinitionProps>) {
    if (!props.id || props.id.trim() === '') {
      throw new Error('[PromptDefinition] id cannot be empty.');
    }
    if (!props.name || props.name.trim() === '') {
      throw new Error('[PromptDefinition] name cannot be empty.');
    }
    this.id = props.id;
    this.namespace = props.namespace || 'core';
    this.name = props.name;
    this.description = props.description;
    this.currentVersionId = props.currentVersionId;
    this.tags = Object.freeze([...props.tags]);
    this.owner = props.owner;
    this.createdAt = props.createdAt;

    Object.freeze(this);
  }

  static create(props: Readonly<PromptDefinitionProps>): PromptDefinition {
    return new PromptDefinition(props);
  }
}
