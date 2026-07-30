export type SchemaFormat = 'json_schema';

export interface ToolSchemaProps {
  readonly format?: SchemaFormat | undefined;
  readonly rawSchema: Readonly<Record<string, unknown>>;
}

export class ToolSchema {
  readonly format: SchemaFormat;
  readonly rawSchema: Readonly<Record<string, unknown>>;

  private constructor(props: Readonly<ToolSchemaProps>) {
    if (!props.rawSchema || typeof props.rawSchema !== 'object') {
      throw new Error('[ToolSchema] rawSchema must be a non-null object.');
    }
    this.format = props.format ?? 'json_schema';
    this.rawSchema = Object.freeze({ ...props.rawSchema });
    Object.freeze(this);
  }

  static create(props: Readonly<ToolSchemaProps>): ToolSchema {
    return new ToolSchema(props);
  }

  static empty(): ToolSchema {
    return new ToolSchema({
      format: 'json_schema',
      rawSchema: { type: 'object', properties: {} },
    });
  }
}
