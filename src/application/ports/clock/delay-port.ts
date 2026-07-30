export interface DelayPort {
  sleep(ms: number): Promise<void>;
}
