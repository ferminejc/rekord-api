import { createHash, randomBytes } from 'node:crypto';
import argon2 from 'argon2';

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

export function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

/** High-entropy opaque refresh token — hashed at rest, never itself a JWT. */
export function generateRefreshToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
