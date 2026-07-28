import { ExecutionEnvelope } from '../vo/execution-envelope';

export interface PreExecutionHook {
  beforeExecute(
    envelope: Readonly<ExecutionEnvelope>,
  ): Promise<ExecutionEnvelope>;
}
