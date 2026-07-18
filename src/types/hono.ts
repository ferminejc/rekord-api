import type { UserRole } from '../db/schema/enums.js';

export interface AuthUser {
  id: string;
  role: UserRole;
  runnerId: string | null;
  organizerId: string | null;
}

export interface AppVariables {
  requestId: string;
  user?: AuthUser;
}
