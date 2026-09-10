import crypto from 'node:crypto';

/**
 * Retrieves mandatory JWT_SIGNING_KEY secret from environment.
 * Fails closed (returns null) if missing or empty.
 */
export function getJwtSigningKey(): string | null {
  const key = process.env.JWT_SIGNING_KEY;
  if (!key || key.trim() === '') {
    return null;
  }
  return key.trim();
}

/**
 * Creates a cryptographically signed HMAC SHA-256 token for testing/dashboard auth.
 * Throws if mandatory signing secret is missing.
 */
export function createSignedDashboardToken(
  tenantId: string,
  secret?: string,
  expirySeconds: number = 3600,
): string {
  const signingSecret = secret ?? getJwtSigningKey();
  if (!signingSecret) {
    throw new Error(
      '[createSignedDashboardToken] Missing mandatory JWT_SIGNING_KEY secret.',
    );
  }

  const payload = JSON.stringify({
    tenantId,
    exp: Date.now() + expirySeconds * 1000,
  });
  const encodedPayload = Buffer.from(payload).toString('base64url');
  const signature = crypto
    .createHmac('sha256', signingSecret)
    .update(encodedPayload)
    .digest('hex');
  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies token HMAC signature and expiration using timingSafeEqual.
 * Returns null (fail closed) if signing secret is missing or signature is invalid.
 */
export function verifySignedDashboardToken(
  token: string,
  secret?: string,
): { tenantId: string } | null {
  const signingSecret = secret ?? getJwtSigningKey();
  if (!signingSecret) {
    return null; // Fail closed if mandatory secret key is missing
  }

  if (!token || !token.includes('.')) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = crypto
    .createHmac('sha256', signingSecret)
    .update(encodedPayload)
    .digest('hex');

  const sigBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return null; // Invalid / tampered signature!
  }

  try {
    const payloadText = Buffer.from(encodedPayload, 'base64url').toString(
      'utf8',
    );
    const payload = JSON.parse(payloadText) as {
      tenantId?: string;
      exp?: number;
    };

    if (!payload.tenantId || typeof payload.exp !== 'number') {
      return null;
    }

    if (Date.now() > payload.exp) {
      return null; // Expired token!
    }

    return { tenantId: payload.tenantId };
  } catch {
    return null;
  }
}
