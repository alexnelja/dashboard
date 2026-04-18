import { describe, it, expect } from 'vitest';
import { signLabUploadToken, verifyLabUploadToken } from '../lab-upload-token';

const SECRET = 'test-secret-do-not-use-in-prod';

describe('signLabUploadToken / verifyLabUploadToken', () => {
  it('round-trips a verification_request id', () => {
    const token = signLabUploadToken('vr-abc-123', SECRET);
    expect(verifyLabUploadToken(token, SECRET)).toBe('vr-abc-123');
  });

  it('returns null for tampered payload', () => {
    const token = signLabUploadToken('vr-abc-123', SECRET);
    const [payload, sig] = token.split('.');
    // Flip one char in the payload so the signature no longer matches.
    const tamperedPayload = payload.slice(0, -1) + (payload.slice(-1) === 'A' ? 'B' : 'A');
    expect(verifyLabUploadToken(`${tamperedPayload}.${sig}`, SECRET)).toBeNull();
  });

  it('returns null for tampered signature', () => {
    const token = signLabUploadToken('vr-abc-123', SECRET);
    const [payload, sig] = token.split('.');
    const tamperedSig = sig.slice(0, -1) + (sig.slice(-1) === 'A' ? 'B' : 'A');
    expect(verifyLabUploadToken(`${payload}.${tamperedSig}`, SECRET)).toBeNull();
  });

  it('returns null for token signed with a different secret', () => {
    const token = signLabUploadToken('vr-abc-123', SECRET);
    expect(verifyLabUploadToken(token, 'wrong-secret')).toBeNull();
  });

  it('returns null for malformed tokens', () => {
    expect(verifyLabUploadToken('', SECRET)).toBeNull();
    expect(verifyLabUploadToken('no-dot', SECRET)).toBeNull();
    expect(verifyLabUploadToken('too.many.dots', SECRET)).toBeNull();
    expect(verifyLabUploadToken('.sig-only', SECRET)).toBeNull();
    expect(verifyLabUploadToken('payload.', SECRET)).toBeNull();
  });

  it('produces URL-safe base64 (no +, /, or =)', () => {
    // Run across many IDs to catch any trailing-padding leak.
    for (let i = 0; i < 50; i++) {
      const token = signLabUploadToken(`vr-${i}-${'x'.repeat(i)}`, SECRET);
      expect(token).not.toMatch(/[+/=]/);
    }
  });

  it('produces a deterministic token for the same input', () => {
    const a = signLabUploadToken('vr-abc-123', SECRET);
    const b = signLabUploadToken('vr-abc-123', SECRET);
    expect(a).toBe(b);
  });

  it('produces different tokens for different ids', () => {
    const a = signLabUploadToken('vr-abc-123', SECRET);
    const b = signLabUploadToken('vr-abc-124', SECRET);
    expect(a).not.toBe(b);
  });

  it('rejects empty or whitespace-only ids when signing', () => {
    expect(() => signLabUploadToken('', SECRET)).toThrow();
    expect(() => signLabUploadToken('   ', SECRET)).toThrow();
  });

  it('rejects empty secret when signing', () => {
    expect(() => signLabUploadToken('vr-abc-123', '')).toThrow();
  });
});
