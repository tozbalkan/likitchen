export type LifecycleEvent =
  'starting' | 'started' | 'ready' | 'stopping' | 'stopped' | 'disposed';

export type LifecycleListener = (event: LifecycleEvent) => void;
