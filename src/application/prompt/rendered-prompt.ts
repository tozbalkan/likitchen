import { createHash } from 'node:crypto';

export interface RenderedPromptProps {
  readonly systemPrompt: string;
  readonly userMessage: string;
  readonly promptId: string;
  readonly version: string;
  readonly versionChecksum: string;
  readonly variablesUsed: Readonly<Record<string, unknown>>;
  readonly environment: string;
  readonly experimentId?: string | undefined;
  readonly resolvedReference: string;
  readonly resolvedAlias?: string | undefined;
  readonly rendererEngineVersion?: string | undefined;
}

export class RenderedPrompt {
  readonly systemPrompt: string;
  readonly userMessage: string;
  readonly promptId: string;
  readonly version: string;
  readonly versionChecksum: string;
  readonly renderHash: string;
  readonly variablesUsed: Readonly<Record<string, unknown>>;
  readonly environment: string;
  readonly experimentId?: string | undefined;
  readonly resolvedReference: string;
  readonly resolvedAlias?: string | undefined;

  constructor(props: Readonly<RenderedPromptProps>) {
    this.systemPrompt = props.systemPrompt;
    this.userMessage = props.userMessage;
    this.promptId = props.promptId;
    this.version = props.version;
    this.versionChecksum = props.versionChecksum;
    this.variablesUsed = Object.freeze({ ...props.variablesUsed });
    this.environment = props.environment;
    this.experimentId = props.experimentId;
    this.resolvedReference = props.resolvedReference;
    this.resolvedAlias = props.resolvedAlias;

    // Explicit renderHash formula: SHA256(versionChecksum + variablesHash + rendererEngineVersion)
    const variablesHash = createHash('sha256')
      .update(JSON.stringify(this.variablesUsed))
      .digest('hex');

    const engineVer = props.rendererEngineVersion ?? 'v1';
    const rawRenderContent = [
      props.versionChecksum,
      variablesHash,
      engineVer,
    ].join('::');

    this.renderHash = createHash('sha256')
      .update(rawRenderContent)
      .digest('hex');

    Object.freeze(this);
  }
}
