import { eq } from 'drizzle-orm';
import { refreshTokens, users } from '../../db/schema/index.js';
import type { Db } from '../../db/types.js';

export async function findUserByEmail(
  db: Db,
  email: string,
): Promise<typeof users.$inferSelect | undefined> {
  const rows = await db.select().from(users).where(eq(users.email, email));
  return rows[0];
}

export async function insertUser(
  db: Db,
  values: typeof users.$inferInsert,
): Promise<typeof users.$inferSelect> {
  const [user] = await db.insert(users).values(values).returning();
  if (!user) throw new Error('auth.repo: user insert returned no row');
  return user;
}

export async function insertRefreshToken(
  db: Db,
  values: typeof refreshTokens.$inferInsert,
): Promise<typeof refreshTokens.$inferSelect> {
  const [token] = await db.insert(refreshTokens).values(values).returning();
  if (!token) throw new Error('auth.repo: refresh token insert returned no row');
  return token;
}
