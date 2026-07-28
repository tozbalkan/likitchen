import type { ExecutionContext } from '../context/execution-context';
import type { TenantContext } from '../identity/tenant-context';
import type { CancellationToken } from './cancellation-token';
import type { ExecutionPlan } from './runtime/execution-plan';
import type { ProviderResult } from '../ports/common/provider-result';

export type StageStatus = 'CONTINUE' | 'STOP' | 'FAIL';

export interface StageResult {
  readonly status: StageStatus;
  readonly context: Readonly<StageContext>;
  readonly reason?: string | undefined;
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}

export interface StageContextProps {
  readonly executionContext: ExecutionContext;
  readonly tenantContext: TenantContext;
  readonly cancellationToken: CancellationToken;
  readonly plan?: ExecutionPlan | undefined;
  readonly prompt?: string | undefined;
  readonly systemPrompt?: string | undefined;
  readonly userMessage?: string | undefined;
  readonly resolvedTools?: readonly string[] | undefined;
  readonly memoryData?: Readonly<Record<string, unknown>> | undefined;
  readonly providerId?: string | undefined;
  readonly rawProviderResult?: ProviderResult<string> | undefined;
  readonly validatedOutput?: unknown | undefined;
  readonly isOutputValid?: boolean | undefined;
  readonly validationErrors?: readonly string[] | undefined;
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}

export class StageContext {
  readonly executionContext: ExecutionContext;
  readonly tenantContext: TenantContext;
  readonly cancellationToken: CancellationToken;
  readonly plan?: ExecutionPlan | undefined;
  readonly prompt?: string | undefined;
  readonly systemPrompt?: string | undefined;
  readonly userMessage?: string | undefined;
  readonly resolvedTools?: readonly string[] | undefined;
  readonly memoryData?: Readonly<Record<string, unknown>> | undefined;
  readonly providerId?: string | undefined;
  readonly rawProviderResult?: ProviderResult<string> | undefined;
  readonly validatedOutput?: unknown | undefined;
  readonly isOutputValid?: boolean | undefined;
  readonly validationErrors?: readonly string[] | undefined;
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;

  constructor(props: Readonly<StageContextProps>) {
    this.executionContext = props.executionContext;
    this.tenantContext = props.tenantContext;
    this.cancellationToken = props.cancellationToken;
    this.plan = props.plan;
    this.prompt = props.prompt;
    this.systemPrompt = props.systemPrompt;
    this.userMessage = props.userMessage;
    this.resolvedTools = props.resolvedTools
      ? [...props.resolvedTools]
      : undefined;
    this.memoryData = props.memoryData ? { ...props.memoryData } : undefined;
    this.providerId = props.providerId;
    this.rawProviderResult = props.rawProviderResult;
    this.validatedOutput = props.validatedOutput;
    this.isOutputValid = props.isOutputValid;
    this.validationErrors = props.validationErrors
      ? [...props.validationErrors]
      : undefined;
    this.metadata = props.metadata ? { ...props.metadata } : undefined;

    Object.freeze(this);
  }

  static create(props: Readonly<StageContextProps>): StageContext {
    return new StageContext(props);
  }

  copy(updates: Partial<StageContextProps>): StageContext {
    return new StageContext({
      executionContext: updates.executionContext ?? this.executionContext,
      tenantContext: updates.tenantContext ?? this.tenantContext,
      cancellationToken: updates.cancellationToken ?? this.cancellationToken,
      plan: updates.plan !== undefined ? updates.plan : this.plan,
      prompt: updates.prompt !== undefined ? updates.prompt : this.prompt,
      systemPrompt:
        updates.systemPrompt !== undefined
          ? updates.systemPrompt
          : this.systemPrompt,
      userMessage:
        updates.userMessage !== undefined
          ? updates.userMessage
          : this.userMessage,
      resolvedTools:
        updates.resolvedTools !== undefined
          ? updates.resolvedTools
          : this.resolvedTools,
      memoryData:
        updates.memoryData !== undefined ? updates.memoryData : this.memoryData,
      providerId:
        updates.providerId !== undefined ? updates.providerId : this.providerId,
      rawProviderResult:
        updates.rawProviderResult !== undefined
          ? updates.rawProviderResult
          : this.rawProviderResult,
      validatedOutput:
        updates.validatedOutput !== undefined
          ? updates.validatedOutput
          : this.validatedOutput,
      isOutputValid:
        updates.isOutputValid !== undefined
          ? updates.isOutputValid
          : this.isOutputValid,
      validationErrors:
        updates.validationErrors !== undefined
          ? updates.validationErrors
          : this.validationErrors,
      metadata:
        updates.metadata !== undefined ? updates.metadata : this.metadata,
    });
  }
}

export interface ExecutionStage {
  readonly name: string;
  execute(context: Readonly<StageContext>): Promise<StageResult>;
}
