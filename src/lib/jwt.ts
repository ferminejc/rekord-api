import { type JWTPayload, jwtVerify, SignJWT } from 'jose';
import { env } from '../config/env.js';
import type { AuthUser } from '../types/hono.js';
import { AppError } from './app-error.js';

const ACCESS_TOKEN_TTL = '15m';
const VALID_ROLES: readonly AuthUser['role'][] = ['runner', 'organizer', 'admin'];

const secretKey = new TextEncoder().encode(env.JWT_SECRET);

function isValidRole(value: string): value is AuthUser['role'] {
  return (VALID_ROLES as readonly string[]).includes(value);
}

export interface AccessTokenPayload {
  sub: string;
  role: AuthUser['role'];
  runnerId: string | null;
  organizerId: string | null;
}

export function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({
    role: payload.role,
    runnerId: payload.runnerId,
    organizerId: payload.organizerId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(secretKey);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(token, secretKey));
  } catch {
    throw new AppError('UNAUTHORIZED', 'Invalid or expired access token');
  }

  if (
    typeof payload.sub !== 'string' ||
    typeof payload.role !== 'string' ||
    !isValidRole(payload.role)
  ) {
    throw new AppError('UNAUTHORIZED', 'Invalid access token');
  }

  return {
    sub: payload.sub,
    role: payload.role,
    runnerId: typeof payload.runnerId === 'string' ? payload.runnerId : null,
    organizerId: typeof payload.organizerId === 'string' ? payload.organizerId : null,
  };
}
