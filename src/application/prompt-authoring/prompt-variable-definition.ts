export type PromptVariableSource =
  'STATIC' | 'USER' | 'SYSTEM' | 'SECRET' | 'RUNTIME';

export interface PromptVariableDefinitionProps {
  readonly name: string;
  readonly type: 'string' | 'number' | 'boolean' | 'json';
  readonly required: boolean;
  readonly secret: boolean;
  readonly source: PromptVariableSource;
  readonly defaultValue?: unknown | undefined;
  readonly description?: string | undefined;
  readonly examples?: ReadonlyArray<unknown> | undefined;
  readonly validationRule?: string | undefined;
}

export class PromptVariableDefinition {
  readonly name: string;
  readonly type: 'string' | 'number' | 'boolean' | 'json';
  readonly required: boolean;
  readonly secret: boolean;
  readonly source: PromptVariableSource;
  readonly defaultValue?: unknown | undefined;
  readonly description?: string | undefined;
  readonly examples?: ReadonlyArray<unknown> | undefined;
  readonly validationRule?: string | undefined;

  constructor(props: PromptVariableDefinitionProps) {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error(
        '[PromptVariableDefinition] Variable name must not be empty.',
      );
    }
    this.name = props.name;
    this.type = props.type;
    this.required = props.required;
    this.secret = props.secret;
    this.source = props.source;
    this.defaultValue = props.defaultValue;
    this.description = props.description;
    this.examples = props.examples
      ? Object.freeze([...props.examples])
      : undefined;
    this.validationRule = props.validationRule;

    Object.freeze(this);
  }

  static create(
    props: PromptVariableDefinitionProps,
  ): PromptVariableDefinition {
    return new PromptVariableDefinition(props);
  }
}
