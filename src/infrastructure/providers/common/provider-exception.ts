export abstract class ProviderException extends Error {
  abstract readonly isTransient: boolean;

  constructor(
    message: string,
    public readonly providerId: string,
  ) {
    super(`[${providerId}] ${message}`);
    this.name = this.constructor.name;
  }
}

export class RateLimitException extends ProviderException {
  readonly isTransient = true;
}

export class TimeoutException extends ProviderException {
  readonly isTransient = true;
}

export class AuthenticationException extends ProviderException {
  readonly isTransient = false;
}

export class InvalidRequestException extends ProviderException {
  readonly isTransient = false;
}

export class InvalidStructuredOutputException extends ProviderException {
  readonly isTransient = false;
}
