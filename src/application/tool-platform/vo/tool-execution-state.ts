export type ToolExecutionState =
  | 'QUEUED'
  | 'RESOLVING_PROVIDER'
  | 'WAITING_FOR_SLOT'
  | 'RUNNING'
  | 'STREAMING'
  | 'COMPLETED'
  | 'FAILED'
  | 'TIMED_OUT'
  | 'CANCELLED';
