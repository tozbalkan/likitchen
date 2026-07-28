export interface DiagnosticsInfo {
  readonly version: string;
  readonly buildTimestamp: string;
  readonly deploymentProfile: string;
  readonly uptimeMs: number;
  readonly componentSummary: readonly string[];
  readonly gitCommit?: string | undefined;
}

export interface DiagnosticsPort {
  getDiagnostics(): Promise<DiagnosticsInfo>;
}
