import { TenantContext } from '../../identity/tenant-context';
import { ToolExecutionPolicy } from './tool-execution-policy';
import { ExecutionBudget } from './execution-budget';
import { ToolExecutionState } from './tool-execution-state';

export interface ToolExecutionContextProps {
  readonly executionId: string;
  readonly toolId: string;
  readonly instanceId: string;
  readonly version: string;
  readonly tenantContext: TenantContext;
  readonly input: Readonly<Record<string, unknown>>;
  readonly provider: string;
  readonly executionPolicy: ToolExecutionPolicy;
  readonly budget: ExecutionBudget;
  readonly state: ToolExecutionState;
  readonly correlationId: string;
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string | undefined;
  readonly startedAt: Date;
  readonly deadlineUtc: Date;
  readonly isStreaming: boolean;
}

export class ToolExecutionContext {
  readonly executionId: string;
  readonly toolId: string;
  readonly instanceId: string;
  readonly version: string;
  readonly tenantContext: TenantContext;
  readonly input: Readonly<Record<string, unknown>>;
  readonly provider: string;
  readonly executionPolicy: ToolExecutionPolicy;
  readonly budget: ExecutionBudget;
  readonly state: ToolExecutionState;
  readonly correlationId: string;
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string | undefined;
  readonly startedAt: Date;
  readonly deadlineUtc: Date;
  readonly isStreaming: boolean;

  constructor(props: ToolExecutionContextProps) {
    this.executionId = props.executionId;
    this.toolId = props.toolId;
    this.instanceId = props.instanceId;
    this.version = props.version;
    this.tenantContext = props.tenantContext;
    this.input = Object.freeze({ ...props.input });
    this.provider = props.provider;
    this.executionPolicy = props.executionPolicy;
    this.budget = props.budget;
    this.state = props.state;
    this.correlationId = props.correlationId;
    this.traceId = props.traceId;
    this.spanId = props.spanId;
    this.parentSpanId = props.parentSpanId;
    this.startedAt = new Date(props.startedAt);
    this.deadlineUtc = new Date(props.deadlineUtc);
    this.isStreaming = props.isStreaming;
    Object.freeze(this);
  }

  static create(
    props: Omit<
      ToolExecutionContextProps,
      | 'executionId'
      | 'state'
      | 'correlationId'
      | 'traceId'
      | 'spanId'
      | 'startedAt'
      | 'deadlineUtc'
    >,
  ): ToolExecutionContext {
    const now = new Date();
    const deadline = new Date(now.getTime() + props.executionPolicy.timeoutMs);
    const id = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    return new ToolExecutionContext({
      ...props,
      executionId: id,
      state: 'QUEUED',
      correlationId: `corr-${id}`,
      traceId: `trace-${id}`,
      spanId: `span-${id}`,
      startedAt: now,
      deadlineUtc: deadline,
    });
  }

  remainingMs(now: Date = new Date()): number {
    return Math.max(0, this.deadlineUtc.getTime() - now.getTime());
  }

  withState(newState: ToolExecutionState): ToolExecutionContext {
    return new ToolExecutionContext({
      ...this,
      state: newState,
    });
  }
}
