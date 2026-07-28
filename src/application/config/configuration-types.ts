export interface AiConfiguration {
  readonly defaultProvider: string;
  readonly defaultModel: string;
  readonly requestTimeoutMs: number;
}

export interface TelemetryConfiguration {
  readonly traceSampleRate: number;
  readonly promptTracingEnabled: boolean;
}

export interface MessagingConfiguration {
  readonly defaultChannel: 'whatsapp' | 'sms' | 'email';
  readonly webhookPath: string;
}

export interface SecurityConfiguration {
  readonly jwtExpirySeconds: number;
  readonly piiMaskingEnabled: boolean;
}
