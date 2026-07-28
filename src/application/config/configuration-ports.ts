import type {
  AiConfiguration,
  TelemetryConfiguration,
  MessagingConfiguration,
  SecurityConfiguration,
} from './configuration-types';

export interface AiConfigurationProviderPort {
  getAiConfiguration(): Readonly<AiConfiguration>;
}

export interface TelemetryConfigurationProviderPort {
  getTelemetryConfiguration(): Readonly<TelemetryConfiguration>;
}

export interface MessagingConfigurationProviderPort {
  getMessagingConfiguration(): Readonly<MessagingConfiguration>;
}

export interface SecurityConfigurationProviderPort {
  getSecurityConfiguration(): Readonly<SecurityConfiguration>;
}
