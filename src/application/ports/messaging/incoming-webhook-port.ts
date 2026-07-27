export interface ParsedWebhookPayload {
  readonly providerId: string;
  readonly messageId: string;
  readonly sender: string;
  readonly text: string;
  readonly rawPayload: Record<string, unknown>;
}

export interface IncomingWebhookPort {
  parseWebhook(
    payload: Readonly<Record<string, unknown>>,
  ): ParsedWebhookPayload | null;
}
