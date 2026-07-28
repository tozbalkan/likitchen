import { createHash } from 'node:crypto';
import type { PromptDocument } from './prompt-document';

export type PromptStatus =
  'DRAFT' | 'VALIDATED' | 'PUBLISHED' | 'DEPRECATED' | 'ARCHIVED';

export interface PromptVersionProps {
  readonly id: string;
  readonly promptId: string;
  readonly version: string;
  readonly document: PromptDocument;
  readonly status?: PromptStatus | undefined;
  readonly modelHints?: Readonly<Record<string, unknown>> | undefined;
  readonly createdAt: Date;
}

export class PromptVersion {
  readonly id: string;
  readonly promptId: string;
  readonly version: string;
  readonly document: PromptDocument;
  readonly status: PromptStatus;
  readonly modelHints?: Readonly<Record<string, unknown>> | undefined;
  readonly versionChecksum: string;
  readonly createdAt: Date;

  constructor(props: Readonly<PromptVersionProps>) {
    this.id = props.id;
    this.promptId = props.promptId;
    this.version = props.version;
    this.document = props.document;
    this.status = props.status ?? 'DRAFT';
    this.modelHints = props.modelHints
      ? Object.freeze({ ...props.modelHints })
      : undefined;
    this.createdAt = props.createdAt;

    // Explicit versionChecksum formula: SHA256(documentChecksum + inputSchema + outputSchema + modelHints)
    const rawVersionContent = [
      props.document.documentChecksum,
      props.document.inputSchema
        ? JSON.stringify(props.document.inputSchema)
        : '',
      props.document.outputSchema
        ? JSON.stringify(props.document.outputSchema)
        : '',
      props.modelHints ? JSON.stringify(props.modelHints) : '',
    ].join('::');

    this.versionChecksum = createHash('sha256')
      .update(rawVersionContent)
      .digest('hex');

    Object.freeze(this);
  }

  static create(props: Readonly<PromptVersionProps>): PromptVersion {
    return new PromptVersion(props);
  }

  withStatus(newStatus: PromptStatus): PromptVersion {
    return new PromptVersion({
      id: this.id,
      promptId: this.promptId,
      version: this.version,
      document: this.document,
      status: newStatus,
      modelHints: this.modelHints,
      createdAt: this.createdAt,
    });
  }
}
