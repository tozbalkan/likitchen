import type {
  MessageDeliveryPort,
  SendMessageRequest,
  DeliveryResult,
} from '../../../application/ports/messaging/message-delivery-port';
import type {
  IncomingWebhookPort,
  ParsedWebhookPayload,
} from '../../../application/ports/messaging/incoming-webhook-port';
import type { ProviderResult } from '../common/provider-result';

export class MetaWhatsAppAdapter
  implements MessageDeliveryPort, IncomingWebhookPort
{
  readonly providerId = 'meta-whatsapp';

  async sendMessage(
    request: Readonly<SendMessageRequest>,
  ): Promise<ProviderResult<DeliveryResult>> {
    return {
      value: {
        messageId: `wa-msg-${Date.now()}`,
        delivered: true,
      },
      metadata: {
        providerId: this.providerId,
        model: 'whatsapp-cloud-api-v1',
        promptFingerprint: 'none',
      },
    };
  }

  parseWebhook(
    payload: Readonly<Record<string, unknown>>,
  ): ParsedWebhookPayload | null {
    if (payload.entry && Array.isArray(payload.entry)) {
      return {
        providerId: this.providerId,
        messageId: (payload.messageId as string) ?? 'wa-webhook-1',
        sender: (payload.from as string) ?? 'unknown-sender',
        text: (payload.text as string) ?? '',
        rawPayload: payload as Record<string, unknown>,
      };
    }
    return null;
  }
}
