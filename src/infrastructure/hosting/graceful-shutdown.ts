import type { ApplicationHost } from './application-host';

export class GracefulShutdown {
  private shutdownInitiated = false;

  constructor(
    private readonly host: ApplicationHost,
    private readonly shutdownTimeoutMs: number = 10000,
  ) {}

  install(): void {
    const handler = () => {
      void this.shutdown();
    };
    process.on('SIGINT', handler);
    process.on('SIGTERM', handler);
  }

  async shutdown(): Promise<void> {
    if (this.shutdownInitiated) return;
    this.shutdownInitiated = true;

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error('[GracefulShutdown] Timeout exceeded.')),
        this.shutdownTimeoutMs,
      );
    });

    try {
      await Promise.race([this.host.dispose(), timeout]);
    } catch {
      // Force exit on timeout
    }
  }

  isShuttingDown(): boolean {
    return this.shutdownInitiated;
  }
}
