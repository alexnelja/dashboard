import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Signed tokens let inspectors upload lab reports without a login. Each token
 * carries a verification_request id as its payload; the server verifies the
 * HMAC before trusting the upload. If the signing secret is rotated, all
 * outstanding invitations become invalid.
 */

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(s: string): Buffer {
  const padded = s + '='.repeat((4 - (s.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

export function signLabUploadToken(verificationRequestId: string, secret: string): string {
  if (!verificationRequestId || verificationRequestId.trim() === '') {
    throw new Error('verificationRequestId must be a non-empty string');
  }
  if (!secret) {
    throw new Error('secret must be a non-empty string');
  }
  const payload = base64UrlEncode(Buffer.from(verificationRequestId, 'utf8'));
  const sig = base64UrlEncode(createHmac('sha256', secret).update(payload).digest());
  return `${payload}.${sig}`;
}

export function verifyLabUploadToken(token: string, secret: string): string | null {
  if (!token || !secret) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  if (!payload || !sig) return null;

  const expectedSig = base64UrlEncode(createHmac('sha256', secret).update(payload).digest());
  // Compare as bytes to avoid timing leaks.
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;

  try {
    return base64UrlDecode(payload).toString('utf8');
  } catch {
    return null;
  }
}
