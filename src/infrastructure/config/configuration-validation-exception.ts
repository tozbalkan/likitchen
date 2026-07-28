export class ConfigurationValidationException extends Error {
  constructor(message: string) {
    super(
      `[ConfigurationValidationException] Startup configuration error: ${message}`,
    );
    this.name = 'ConfigurationValidationException';
  }
}
