import type { ProviderResult } from '../common/provider-result';

export interface SendMessageRequest {
  readonly recipient: string;
  readonly content: string;
  readonly channel: 'whatsapp' | 'sms' | 'email';
}

export interface DeliveryResult {
  readonly messageId: string;
  readonly delivered: boolean;
}

export interface MessageDeliveryPort {
  sendMessage(
    request: Readonly<SendMessageRequest>,
  ): Promise<ProviderResult<DeliveryResult>>;
}
