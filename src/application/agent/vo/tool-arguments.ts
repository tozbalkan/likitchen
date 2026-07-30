export interface ToolArgumentsProps {
  readonly rawJson: Readonly<Record<string, unknown>>;
}

export class ToolArguments {
  readonly rawJson: Readonly<Record<string, unknown>>;

  private constructor(props: Readonly<ToolArgumentsProps>) {
    if (!props.rawJson || typeof props.rawJson !== 'object') {
      throw new Error('[ToolArguments] rawJson must be a non-null object.');
    }
    this.rawJson = Object.freeze({ ...props.rawJson });
    Object.freeze(this);
  }

  static create(props: Readonly<ToolArgumentsProps>): ToolArguments {
    return new ToolArguments(props);
  }

  static empty(): ToolArguments {
    return new ToolArguments({ rawJson: {} });
  }

  get<T = unknown>(key: string): T | undefined {
    return this.rawJson[key] as T | undefined;
  }

  toJson(): string {
    return JSON.stringify(this.rawJson);
  }
}
