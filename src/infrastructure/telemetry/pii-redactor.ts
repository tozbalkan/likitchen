export type PiiClassification =
  'PHONE' | 'EMAIL' | 'ADDRESS' | 'TOKEN' | 'SECRET' | 'JWT';

export class PiiRedactor {
  private static readonly EMAIL_REGEX =
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  private static readonly PHONE_REGEX =
    /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  private static readonly JWT_REGEX =
    /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g;

  redactString(text: string, classification?: PiiClassification): string {
    if (!text) return text;

    if (classification === 'EMAIL') {
      return text.replace(PiiRedactor.EMAIL_REGEX, (email) => {
        const parts = email.split('@');
        const local = parts[0] ?? '';
        const domain = parts[1] ?? '';
        return `${local.substring(0, 1)}***@${domain}`;
      });
    }

    if (classification === 'PHONE') {
      return text.replace(PiiRedactor.PHONE_REGEX, '***-***-****');
    }

    if (
      classification === 'JWT' ||
      classification === 'TOKEN' ||
      classification === 'SECRET'
    ) {
      return '[REDACTED_SECRET]';
    }

    // Default multi-pattern redaction for unclassified attributes
    let redacted = text.replace(PiiRedactor.EMAIL_REGEX, '***@***.com');
    redacted = redacted.replace(PiiRedactor.PHONE_REGEX, '***-***-****');
    redacted = redacted.replace(PiiRedactor.JWT_REGEX, '[REDACTED_JWT]');

    return redacted;
  }

  redactAttributes(
    attributes?: Readonly<Record<string, string | number | boolean>>,
  ): Record<string, string | number | boolean> {
    if (!attributes) return {};

    const result: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(attributes)) {
      const lowerKey = key.toLowerCase();
      if (typeof value === 'string') {
        if (lowerKey.includes('email')) {
          result[key] = this.redactString(value, 'EMAIL');
        } else if (lowerKey.includes('phone') || lowerKey.includes('mobile')) {
          result[key] = this.redactString(value, 'PHONE');
        } else if (
          lowerKey.includes('token') ||
          lowerKey.includes('secret') ||
          lowerKey.includes('auth') ||
          lowerKey.includes('key')
        ) {
          result[key] = this.redactString(value, 'SECRET');
        } else {
          result[key] = this.redactString(value);
        }
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}
