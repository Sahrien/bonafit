import { UserRole } from '../../models/auth-session.dto';

export const AUTH_PATHS = {
  login: '/login',
  changePassword: '/cambiar-clave',
  admin: '/admin',
  client: '/app',
} as const;

export function homeForRole(role: UserRole): string {
  return role === 'admin' ? AUTH_PATHS.admin : AUTH_PATHS.client;
}
