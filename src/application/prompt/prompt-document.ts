import { createHash } from 'node:crypto';

export interface PromptDocumentProps {
  readonly id: string;
  readonly systemTemplate: string;
  readonly userTemplate: string;
  readonly assistantExamples?: readonly string[] | undefined;
  readonly toolInstructions?: string | undefined;
  readonly responseFormat?: Readonly<Record<string, unknown>> | undefined;
  readonly inputSchema?: Readonly<Record<string, unknown>> | undefined;
  readonly outputSchema?: Readonly<Record<string, unknown>> | undefined;
  readonly variables: readonly string[];
}

export class PromptDocument {
  readonly id: string;
  readonly systemTemplate: string;
  readonly userTemplate: string;
  readonly assistantExamples?: readonly string[] | undefined;
  readonly toolInstructions?: string | undefined;
  readonly responseFormat?: Readonly<Record<string, unknown>> | undefined;
  readonly inputSchema?: Readonly<Record<string, unknown>> | undefined;
  readonly outputSchema?: Readonly<Record<string, unknown>> | undefined;
  readonly variables: readonly string[];
  readonly documentChecksum: string;

  constructor(props: Readonly<PromptDocumentProps>) {
    this.id = props.id;
    this.systemTemplate = props.systemTemplate;
    this.userTemplate = props.userTemplate;
    this.assistantExamples = props.assistantExamples
      ? Object.freeze([...props.assistantExamples])
      : undefined;
    this.toolInstructions = props.toolInstructions;
    this.responseFormat = props.responseFormat
      ? Object.freeze({ ...props.responseFormat })
      : undefined;
    this.inputSchema = props.inputSchema
      ? Object.freeze({ ...props.inputSchema })
      : undefined;
    this.outputSchema = props.outputSchema
      ? Object.freeze({ ...props.outputSchema })
      : undefined;
    this.variables = Object.freeze([...props.variables]);

    // Explicit documentChecksum formula: SHA256(systemTemplate + userTemplate + assistantExamples + toolInstructions + responseFormat)
    const rawContent = [
      props.systemTemplate,
      props.userTemplate,
      props.assistantExamples?.join('\n') ?? '',
      props.toolInstructions ?? '',
      props.responseFormat ? JSON.stringify(props.responseFormat) : '',
    ].join('::');

    this.documentChecksum = createHash('sha256')
      .update(rawContent)
      .digest('hex');

    Object.freeze(this);
  }

  static create(props: Readonly<PromptDocumentProps>): PromptDocument {
    return new PromptDocument(props);
  }
}
