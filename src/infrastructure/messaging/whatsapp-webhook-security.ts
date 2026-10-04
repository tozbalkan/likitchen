import crypto from 'node:crypto';

/**
 * Validates Meta WhatsApp Cloud API Webhook HMAC SHA-256 signature (X-Hub-Signature-256).
 * Uses constant-time string comparison (timingSafeEqual) to prevent timing side-channel attacks.
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  appSecret: string,
): boolean {
  if (!signatureHeader || !appSecret || !rawBody) {
    return false;
  }

  // Header format: 'sha256=HEX_STRING'
  const parts = signatureHeader.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') {
    return false;
  }

  const expectedSignatureHex = parts[1];
  if (!expectedSignatureHex || expectedSignatureHex.length !== 64) {
    return false;
  }

  const computedHmacHex = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody, 'utf8')
    .digest('hex');

  try {
    const expectedBuffer = Buffer.from(expectedSignatureHex, 'hex');
    const computedBuffer = Buffer.from(computedHmacHex, 'hex');

    if (expectedBuffer.length !== computedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, computedBuffer);
  } catch {
    return false;
  }
}

/**
 * Constant-time comparison for shared secrets such as the Meta webhook verify token.
 * Inputs are hashed first so differing lengths do not short-circuit.
 */
export function safeEqualSecret(
  provided: string | null | undefined,
  expected: string,
): boolean {
  if (!provided || !expected) return false;
  const a = crypto.createHash('sha256').update(provided, 'utf8').digest();
  const b = crypto.createHash('sha256').update(expected, 'utf8').digest();
  return crypto.timingSafeEqual(a, b);
}
