export interface AiExecutionMetadata {
  readonly providerId: string;
  readonly model: string;
  readonly promptVersion?: string;
  readonly promptFingerprint?: string;
}

export class ExecutionContext {
  constructor(
    public readonly correlationId: string,
    public readonly traceId: string,
    public readonly requestId?: string,
    public readonly conversationId?: string,
    public readonly organizationId?: string,
    public readonly userId?: string,
    public readonly aiMetadata?: Readonly<AiExecutionMetadata>,
  ) {
    Object.freeze(this);
  }

  static create(params: {
    readonly correlationId: string;
    readonly traceId: string;
    readonly requestId?: string;
    readonly conversationId?: string;
    readonly organizationId?: string;
    readonly userId?: string;
    readonly aiMetadata?: Readonly<AiExecutionMetadata>;
  }): ExecutionContext {
    return new ExecutionContext(
      params.correlationId,
      params.traceId,
      params.requestId,
      params.conversationId,
      params.organizationId,
      params.userId,
      params.aiMetadata,
    );
  }

  withAiMetadata(aiMetadata: Readonly<AiExecutionMetadata>): ExecutionContext {
    return new ExecutionContext(
      this.correlationId,
      this.traceId,
      this.requestId,
      this.conversationId,
      this.organizationId,
      this.userId,
      aiMetadata,
    );
  }

  withConversationId(conversationId: string): ExecutionContext {
    return new ExecutionContext(
      this.correlationId,
      this.traceId,
      this.requestId,
      conversationId,
      this.organizationId,
      this.userId,
      this.aiMetadata,
    );
  }

  withTraceId(traceId: string): ExecutionContext {
    return new ExecutionContext(
      this.correlationId,
      traceId,
      this.requestId,
      this.conversationId,
      this.organizationId,
      this.userId,
      this.aiMetadata,
    );
  }

  withOrganizationId(organizationId: string): ExecutionContext {
    return new ExecutionContext(
      this.correlationId,
      this.traceId,
      this.requestId,
      this.conversationId,
      organizationId,
      this.userId,
      this.aiMetadata,
    );
  }

  withUserId(userId: string): ExecutionContext {
    return new ExecutionContext(
      this.correlationId,
      this.traceId,
      this.requestId,
      this.conversationId,
      this.organizationId,
      userId,
      this.aiMetadata,
    );
  }
}
