import type { DomainEvent } from '../../domain/events';

import type { ProcessContext } from '../../shared/types';

export interface EventDispatcher {
  dispatch(
    events: readonly DomainEvent<string, unknown>[],
    processContext: Readonly<ProcessContext>,
  ): Promise<void>;
}
