import type { ToolResult } from '../vo/tool-result';
import { Observation } from '../vo/observation';
import { createTextObservationPayload } from '../vo/observation-payload';

export class ObservationMapper {
  static fromToolResult(
    toolResult: Readonly<ToolResult>,
    stepIndex: number,
  ): Observation {
    if (!toolResult) {
      throw new Error('[ObservationMapper] ToolResult is required.');
    }

    const payload = createTextObservationPayload(toolResult.output);

    return Observation.create({
      observationId: `obs-${toolResult.invocationId}-${stepIndex}`,
      toolId: toolResult.toolId,
      invocationId: toolResult.invocationId,
      status: toolResult.status,
      payload,
      executionTimeMs: toolResult.executionTimeMs,
      timestamp: toolResult.createdAt,
    });
  }
}
