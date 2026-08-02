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

export interface MetaWhatsAppAdapterProps {
  readonly phoneNumberId?: string | undefined;
  readonly accessToken?: string | undefined;
  readonly graphApiVersion?: string | undefined;
}

export class MetaWhatsAppAdapter
  implements MessageDeliveryPort, IncomingWebhookPort
{
  readonly providerId = 'meta-whatsapp';
  private readonly phoneNumberId: string | undefined;
  private readonly accessToken: string | undefined;
  private readonly graphApiVersion: string;

  constructor(props?: Readonly<MetaWhatsAppAdapterProps>) {
    this.phoneNumberId =
      props?.phoneNumberId ?? process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.accessToken = props?.accessToken ?? process.env.WHATSAPP_ACCESS_TOKEN;
    this.graphApiVersion =
      props?.graphApiVersion ??
      process.env.WHATSAPP_GRAPH_API_VERSION ??
      'v20.0';
  }

  async sendMessage(
    request: Readonly<SendMessageRequest>,
  ): Promise<ProviderResult<DeliveryResult>> {
    const phoneNumberId = this.phoneNumberId;
    const accessToken = this.accessToken;

    if (!phoneNumberId || !accessToken) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          '[MetaWhatsAppAdapter] Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN configuration in production environment.',
        );
      }
      // In non-production test environment without credentials, return safe simulated response
      return {
        value: {
          messageId: `sim-wa-${Date.now()}`,
          delivered: true,
        },
        metadata: {
          providerId: this.providerId,
          model: `whatsapp-cloud-api-${this.graphApiVersion}`,
          promptFingerprint: 'none',
        },
      };
    }

    const url = `https://graph.facebook.com/${this.graphApiVersion}/${phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: request.recipient,
        type: 'text',
        text: {
          body: request.content,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `[MetaWhatsAppAdapter] Graph API HTTP ${response.status}: ${errorText}`,
      );
    }

    const data = (await response.json()) as {
      messages?: Array<{ id?: string }>;
    };
    const messageId = data.messages?.[0]?.id ?? `wa-msg-${Date.now()}`;

    return {
      value: {
        messageId,
        delivered: true,
      },
      metadata: {
        providerId: this.providerId,
        model: `whatsapp-cloud-api-${this.graphApiVersion}`,
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
