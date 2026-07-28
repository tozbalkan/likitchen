import { ExecutionEnvelope } from '../vo/execution-envelope';

export interface PostExecutionHook {
  afterExecute(
    envelope: Readonly<ExecutionEnvelope>,
  ): Promise<ExecutionEnvelope>;
}
