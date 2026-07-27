import type { ConversationPolicy } from './conversation-policy';
import type { Result } from '../../../shared/result';
import { err, ok } from '../../../shared/result';
import { PolicyError } from './policy-error';

export class PolicyRegistry {
  private readonly policies = new Map<
    string,
    ConversationPolicy<unknown, unknown>
  >();

  register(policy: ConversationPolicy<unknown, unknown>): void {
    if (this.policies.has(policy.name)) {
      throw new Error(`Policy ${policy.name} is already registered.`);
    }
    this.policies.set(policy.name, policy);
  }

  getPolicy<C, R>(name: string): Result<ConversationPolicy<C, R>, PolicyError> {
    const policy = this.policies.get(name);
    if (!policy) {
      return err(new PolicyError(`Policy ${name} not found in registry.`));
    }
    // Using as any as ConversationPolicy<C, R> avoids the 'any' ESLint error and satisfies TS
    return ok(policy as never as ConversationPolicy<C, R>);
  }
}
