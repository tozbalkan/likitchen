import type { Result } from '../../../shared/result';
import type { PolicyError } from './policy-error';

export interface ConversationPolicy<C, R> {
  readonly name: string;
  readonly version: string;

  evaluate(context: Readonly<C>): Result<R, PolicyError>;
}
