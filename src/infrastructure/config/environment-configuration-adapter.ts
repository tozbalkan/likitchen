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
          defaultProvider:
            env.AI_DEFAULT_PROVIDER ?? env.DEFAULT_PROVIDER ?? 'openai',
          defaultModel: env.AI_DEFAULT_MODEL ?? env.DEFAULT_MODEL ?? 'gpt-4o',
          requestTimeoutMs:
            (env.AI_REQUEST_TIMEOUT_MS ?? env.REQUEST_TIMEOUT_MS)
              ? Number(env.AI_REQUEST_TIMEOUT_MS ?? env.REQUEST_TIMEOUT_MS)
              : 5000,
        },
        'AiConfiguration',
      ),
    );

    const rawTraceRate =
      env.TELEMETRY_TRACE_SAMPLE_RATE ?? env.TRACE_SAMPLE_RATE;
    this.telemetryConfig = Object.freeze(
      this.validateSchema(
        TelemetryConfigurationSchema,
        {
          traceSampleRate: rawTraceRate ? Number(rawTraceRate) : 1.0,
          promptTracingEnabled:
            (env.TELEMETRY_PROMPT_TRACING_ENABLED ??
              env.PROMPT_TRACING_ENABLED) === 'true',
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
          webhookPath:
            env.MESSAGING_WEBHOOK_PATH ??
            env.WEBHOOK_PATH ??
            '/api/webhooks/whatsapp',
        },
        'MessagingConfiguration',
      ),
    );

    this.securityConfig = Object.freeze(
      this.validateSchema(
        SecurityConfigurationSchema,
        {
          jwtExpirySeconds:
            (env.SECURITY_JWT_EXPIRY_SECONDS ?? env.JWT_EXPIRY_SECONDS)
              ? Number(
                  env.SECURITY_JWT_EXPIRY_SECONDS ?? env.JWT_EXPIRY_SECONDS,
                )
              : 3600,
          piiMaskingEnabled:
            (env.SECURITY_PII_MASKING_ENABLED ?? env.PII_MASKING_ENABLED) ===
            'true',
        },
        'SecurityConfiguration',
      ),
    );
  }

  getAiConfiguration(): AiConfiguration {
    return this.aiConfig;
  }

  getTelemetryConfiguration(): TelemetryConfiguration {
    return this.telemetryConfig;
  }

  getMessagingConfiguration(): MessagingConfiguration {
    return this.messagingConfig;
  }

  getSecurityConfiguration(): SecurityConfiguration {
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
        `${contextName}: ${result.error.message}`,
      );
    }
    return result.data;
  }
}
