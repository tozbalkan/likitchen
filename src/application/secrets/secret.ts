export class Secret {
  private readonly rawValue: string;

  constructor(value: string) {
    if (!value) {
      throw new Error('Secret value cannot be empty.');
    }
    this.rawValue = value;
    Object.freeze(this);
  }

  value(): string {
    return this.rawValue;
  }

  redact(): string {
    if (this.rawValue.length <= 8) {
      return '****';
    }
    return `${this.rawValue.substring(0, 4)}...${this.rawValue.substring(this.rawValue.length - 4)}`;
  }

  toString(): string {
    return '[REDACTED_SECRET]';
  }

  toJSON(): string {
    return '[REDACTED_SECRET]';
  }

  equals(other: Secret | null | undefined): boolean {
    if (!other) return false;
    return this.rawValue === other.value();
  }
}
