export const TelemetryAttributes = {
  AI_PROVIDER: 'ai.provider',
  AI_MODEL: 'ai.model',
  PROMPT_VERSION: 'prompt.version',
  PROMPT_FINGERPRINT: 'prompt.fingerprint',
  CONVERSATION_ID: 'conversation.id',
  ORGANIZATION_ID: 'organization.id',
  USER_ID: 'user.id',
  CORRELATION_ID: 'trace.correlation_id',
  TRACE_ID: 'trace.trace_id',
  REQUEST_ID: 'trace.request_id',
  ERROR: 'error',
  ERROR_TYPE: 'error.type',
} as const;

export const TelemetryEvents = {
  PROVIDER_TIMEOUT: 'provider.timeout',
  PROVIDER_RATE_LIMIT: 'provider.rate_limit',
  PROVIDER_AUTHENTICATION_ERROR: 'provider.authentication_error',
  PROVIDER_INVALID_REQUEST: 'provider.invalid_request',
  PROVIDER_INVALID_OUTPUT: 'provider.invalid_output',
  PROVIDER_FALLBACK_ACTIVATED: 'provider.fallback_activated',
  RETRY_STARTED: 'retry.started',
  HUMAN_HANDOFF_REQUESTED: 'human_handoff.requested',
} as const;
