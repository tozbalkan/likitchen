import type { ResolutionContext } from '../resolution-context';
import type { PromptRepositoryPort } from '../ports/prompt-repository-port';

export class ExperimentResolver {
  constructor(private readonly repository: PromptRepositoryPort) {}

  async resolveExperiment(
    context: Readonly<ResolutionContext>,
  ): Promise<ResolutionContext> {
    if (!context.resolvedVersion) {
      return context;
    }

    const experiment = await this.repository.findExperiment(
      context.tenantContext,
      context.resolvedVersion.promptId,
    );

    if (!experiment) {
      return context;
    }

    const selectedVersionId = experiment.evaluate(context);
    if (!selectedVersionId) {
      return context;
    }

    const experimentVersion = await this.repository.findVersion(
      context.tenantContext,
      selectedVersionId,
    );

    if (experimentVersion) {
      return context
        .withVersion(experimentVersion)
        .withExperiment(experiment.name);
    }

    return context;
  }
}
