import type { z } from 'zod';
import type { Db } from '../../db/types.js';
import { AppError } from '../../lib/app-error.js';
import { generateRefreshToken, hashPassword, hashToken, verifyPassword } from '../../lib/crypto.js';
import { signAccessToken } from '../../lib/jwt.js';
import * as authRepo from './auth.repo.js';
import type { AuthTokensSchema, LoginSchema, RegisterSchema } from './auth.schemas.js';

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * A pre-computed argon2id hash of an arbitrary fixed password, verified against on every
 * login attempt for an email that doesn't exist. This keeps a "no such user" response taking
 * roughly as long as a real password check, closing the timing side-channel that would
 * otherwise let an attacker enumerate registered emails by measuring response latency.
 */
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$jGoH/q+f+Erx+fH6xqeEHw$JHrbZGI7QQ4DiMEuvgb8NmOcclebfniN+nFMNRVD1gU';

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type AuthTokens = z.infer<typeof AuthTokensSchema>;

function isUniqueViolation(error: unknown): boolean {
  const cause = (error as { cause?: unknown } | null)?.cause as { code?: string } | undefined;
  return cause?.code === '23505';
}

async function issueTokens(db: Db, user: AuthTokens['user']): Promise<AuthTokens> {
  const accessToken = await signAccessToken({
    sub: user.id,
    role: user.role,
    runnerId: user.runnerId,
    organizerId: user.organizerId,
  });
  const refreshToken = generateRefreshToken();

  await authRepo.insertRefreshToken(db, {
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      runnerId: user.runnerId,
      organizerId: user.organizerId,
    },
  };
}

export async function register(db: Db, input: RegisterInput): Promise<AuthTokens> {
  const existing = await authRepo.findUserByEmail(db, input.email);
  if (existing) {
    throw new AppError('CONFLICT', 'An account with this email already exists');
  }

  const passwordHash = await hashPassword(input.password);

  let user: Awaited<ReturnType<typeof authRepo.insertUser>>;
  try {
    user = await authRepo.insertUser(db, {
      email: input.email,
      passwordHash,
      displayName: input.displayName,
      role: 'runner',
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      // Two concurrent registrations for the same email both passed the check above;
      // the database's unique constraint is the real source of truth.
      throw new AppError('CONFLICT', 'An account with this email already exists');
    }
    throw error;
  }

  return issueTokens(db, user);
}

export async function login(db: Db, input: LoginInput): Promise<AuthTokens> {
  const user = await authRepo.findUserByEmail(db, input.email);

  if (!user?.passwordHash) {
    await verifyPassword(DUMMY_PASSWORD_HASH, input.password);
    throw new AppError('UNAUTHORIZED', 'Invalid email or password');
  }

  const passwordValid = await verifyPassword(user.passwordHash, input.password);
  if (!passwordValid) {
    throw new AppError('UNAUTHORIZED', 'Invalid email or password');
  }

  return issueTokens(db, user);
}
