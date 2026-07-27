import type { ConversationPolicy } from './conversation-policy';
import type { PolicyContext } from './policy-context';
import type { Result } from '../../../shared/result';
import type { PolicyError } from './policy-error';

export class PolicyEngine {
  evaluate<R>(
    policy: ConversationPolicy<PolicyContext, R>,
    context: Readonly<PolicyContext>,
  ): Result<R, PolicyError> {
    return policy.evaluate(context);
  }
}
