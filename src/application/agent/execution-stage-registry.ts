import type { ExecutionStage } from './execution-stage';

export class ExecutionStageRegistry {
  private readonly stages = new Map<string, ExecutionStage>();

  register(stage: ExecutionStage): void {
    if (this.stages.has(stage.name)) {
      throw new Error(
        `[ExecutionStageRegistry] Stage with name '${stage.name}' is already registered.`,
      );
    }
    this.stages.set(stage.name, stage);
  }

  get(name: string): ExecutionStage | undefined {
    return this.stages.get(name);
  }

  list(): readonly ExecutionStage[] {
    return Array.from(this.stages.values());
  }

  has(name: string): boolean {
    return this.stages.has(name);
  }
}
