import { z } from 'zod';
import type {
  AiConfigurationProviderPort,
  TelemetryConfigurationProviderPort,
  MessagingConfigurationProviderPort,
  SecurityConfigurationProviderPort,
} from '../../application/config/configuration-ports';
import type {
  AiConfiguration,
  TelemetryConfiguration,
  MessagingConfiguration,
  SecurityConfiguration,
} from '../../application/config/configuration-types';
import { ConfigurationValidationException } from './configuration-validation-exception';

const AiConfigurationSchema = z.object({
  defaultProvider: z.string().min(1),
  defaultModel: z.string().min(1),
  requestTimeoutMs: z.number().int().positive(),
});

const TelemetryConfigurationSchema = z.object({
  traceSampleRate: z.number().min(0.0).max(1.0),
  promptTracingEnabled: z.boolean(),
});

const MessagingConfigurationSchema = z.object({
  defaultChannel: z.enum(['whatsapp', 'sms', 'email']),
  webhookPath: z.string().min(1),
});

const SecurityConfigurationSchema = z.object({
  jwtExpirySeconds: z.number().int().positive(),
  piiMaskingEnabled: z.boolean(),
});

export class EnvironmentConfigurationAdapter
  implements
    AiConfigurationProviderPort,
    TelemetryConfigurationProviderPort,
    MessagingConfigurationProviderPort,
    SecurityConfigurationProviderPort
{
  private readonly aiConfig: Readonly<AiConfiguration>;
  private readonly telemetryConfig: Readonly<TelemetryConfiguration>;
  private readonly messagingConfig: Readonly<MessagingConfiguration>;
  private readonly securityConfig: Readonly<SecurityConfiguration>;

  constructor(env: Record<string, string | undefined> = process.env) {
    this.aiConfig = Object.freeze(
      this.validateSchema(
        AiConfigurationSchema,
        {
          defaultProvider: env.AI_DEFAULT_PROVIDER ?? 'openai',
          defaultModel: env.AI_DEFAULT_MODEL ?? 'gpt-4o',
          requestTimeoutMs: env.AI_REQUEST_TIMEOUT_MS
            ? Number(env.AI_REQUEST_TIMEOUT_MS)
            : 5000,
        },
        'AiConfiguration',
      ),
    );

    this.telemetryConfig = Object.freeze(
      this.validateSchema(
        TelemetryConfigurationSchema,
        {
          traceSampleRate: env.TRACE_SAMPLE_RATE
            ? Number(env.TRACE_SAMPLE_RATE)
            : 1.0,
          promptTracingEnabled: env.PROMPT_TRACING_ENABLED === 'true',
        },
        'TelemetryConfiguration',
      ),
    );

    this.messagingConfig = Object.freeze(
      this.validateSchema(
        MessagingConfigurationSchema,
        {
          defaultChannel:
            (env.MESSAGING_DEFAULT_CHANNEL as 'whatsapp' | 'sms' | 'email') ??
            'whatsapp',
          webhookPath: env.MESSAGING_WEBHOOK_PATH ?? '/webhooks/messaging',
        },
        'MessagingConfiguration',
      ),
    );

    this.securityConfig = Object.freeze(
      this.validateSchema(
        SecurityConfigurationSchema,
        {
          jwtExpirySeconds: env.JWT_EXPIRY_SECONDS
            ? Number(env.JWT_EXPIRY_SECONDS)
            : 86400,
          piiMaskingEnabled: env.PII_MASKING_ENABLED !== 'false',
        },
        'SecurityConfiguration',
      ),
    );
  }

  getAiConfiguration(): Readonly<AiConfiguration> {
    return this.aiConfig;
  }

  getTelemetryConfiguration(): Readonly<TelemetryConfiguration> {
    return this.telemetryConfig;
  }

  getMessagingConfiguration(): Readonly<MessagingConfiguration> {
    return this.messagingConfig;
  }

  getSecurityConfiguration(): Readonly<SecurityConfiguration> {
    return this.securityConfig;
  }

  private validateSchema<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    contextName: string,
  ): T {
    const result = schema.safeParse(data);
    if (!result.success) {
      throw new ConfigurationValidationException(
        `Invalid ${contextName}: ${result.error.issues.map((i) => i.message).join(', ')}`,
      );
    }
    return result.data;
  }
}
