export type PlanState =
  | 'DRAFT'
  | 'PLANNED'
  | 'OPTIMIZED'
  | 'RUNNING'
  | 'PAUSED'
  | 'CHECKPOINT_WAIT'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';
