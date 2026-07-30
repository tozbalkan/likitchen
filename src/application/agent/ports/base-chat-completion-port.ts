import type { TenantContext } from '../../identity/tenant-context';
import type { LLMRequest } from '../vo/llm-request';
import { ToolValidationError } from '../errors/tool-execution-error';

export abstract class BaseChatCompletionPort {
  protected validateRequest(
    tenantContext: Readonly<TenantContext>,
    request: Readonly<LLMRequest>,
  ): void {
    if (!tenantContext || !tenantContext.tenantId) {
      throw new ToolValidationError(
        'LLM_PROVIDER' as import('../vo/tool-definition').ToolId,
        'CHAT_COMPLETION' as import('../vo/tool-invocation').InvocationId,
        ['TenantContext with valid tenantId is required.'],
      );
    }
    if (!request) {
      throw new ToolValidationError(
        'LLM_PROVIDER' as import('../vo/tool-definition').ToolId,
        'CHAT_COMPLETION' as import('../vo/tool-invocation').InvocationId,
        ['LLMRequest is required.'],
      );
    }
  }
}
