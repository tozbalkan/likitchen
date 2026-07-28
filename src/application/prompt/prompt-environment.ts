import type { PromotionEvent } from './promotion-event';

export interface PromptEnvironmentPointerProps {
  readonly promptId: string;
  readonly environment: string;
  readonly activeVersionId: string;
  readonly activeVersionNumber: string;
  readonly promotionHistory: readonly PromotionEvent[];
  readonly lastUpdated: Date;
}

export class PromptEnvironmentPointer {
  readonly promptId: string;
  readonly environment: string;
  readonly activeVersionId: string;
  readonly activeVersionNumber: string;
  readonly promotionHistory: readonly PromotionEvent[];
  readonly lastUpdated: Date;

  constructor(props: Readonly<PromptEnvironmentPointerProps>) {
    this.promptId = props.promptId;
    this.environment = props.environment;
    this.activeVersionId = props.activeVersionId;
    this.activeVersionNumber = props.activeVersionNumber;
    this.promotionHistory = Object.freeze([...props.promotionHistory]);
    this.lastUpdated = props.lastUpdated;

    Object.freeze(this);
  }

  promote(
    newVersionId: string,
    newVersionNumber: string,
    event: PromotionEvent,
  ): PromptEnvironmentPointer {
    return new PromptEnvironmentPointer({
      promptId: this.promptId,
      environment: this.environment,
      activeVersionId: newVersionId,
      activeVersionNumber: newVersionNumber,
      promotionHistory: [...this.promotionHistory, event],
      lastUpdated: new Date(),
    });
  }
}
