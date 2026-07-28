import type { TenantContext } from '../identity/tenant-context';
import type { PromptReference } from './prompt-reference';
import type { PromptVersion } from './prompt-version';
import type { RenderedPrompt } from './rendered-prompt';

export interface ResolutionContextProps {
  readonly reference: PromptReference;
  readonly tenantContext: TenantContext;
  readonly environment: string;
  readonly variables: Readonly<Record<string, unknown>>;
  readonly resolvedVersion?: PromptVersion | undefined;
  readonly experimentId?: string | undefined;
  readonly renderedPrompt?: RenderedPrompt | undefined;
}

export class ResolutionContext {
  readonly reference: PromptReference;
  readonly tenantContext: TenantContext;
  readonly environment: string;
  readonly variables: Readonly<Record<string, unknown>>;
  readonly resolvedVersion?: PromptVersion | undefined;
  readonly experimentId?: string | undefined;
  readonly renderedPrompt?: RenderedPrompt | undefined;

  constructor(props: Readonly<ResolutionContextProps>) {
    this.reference = props.reference;
    this.tenantContext = props.tenantContext;
    this.environment = props.environment;
    this.variables = Object.freeze({ ...props.variables });
    this.resolvedVersion = props.resolvedVersion;
    this.experimentId = props.experimentId;
    this.renderedPrompt = props.renderedPrompt;

    Object.freeze(this);
  }

  static create(props: Readonly<ResolutionContextProps>): ResolutionContext {
    return new ResolutionContext(props);
  }

  withEnvironment(environment: string): ResolutionContext {
    return new ResolutionContext({
      reference: this.reference,
      tenantContext: this.tenantContext,
      environment,
      variables: this.variables,
      resolvedVersion: this.resolvedVersion,
      experimentId: this.experimentId,
      renderedPrompt: this.renderedPrompt,
    });
  }

  withExperiment(experimentId: string): ResolutionContext {
    return new ResolutionContext({
      reference: this.reference,
      tenantContext: this.tenantContext,
      environment: this.environment,
      variables: this.variables,
      resolvedVersion: this.resolvedVersion,
      experimentId,
      renderedPrompt: this.renderedPrompt,
    });
  }

  withVersion(resolvedVersion: PromptVersion): ResolutionContext {
    return new ResolutionContext({
      reference: this.reference,
      tenantContext: this.tenantContext,
      environment: this.environment,
      variables: this.variables,
      resolvedVersion,
      experimentId: this.experimentId,
      renderedPrompt: this.renderedPrompt,
    });
  }

  withRenderedPrompt(renderedPrompt: RenderedPrompt): ResolutionContext {
    return new ResolutionContext({
      reference: this.reference,
      tenantContext: this.tenantContext,
      environment: this.environment,
      variables: this.variables,
      resolvedVersion: this.resolvedVersion,
      experimentId: this.experimentId,
      renderedPrompt,
    });
  }
}
