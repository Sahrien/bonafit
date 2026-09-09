import { UserRole } from '../../models/auth-session.dto';

export const AUTH_PATHS = {
  login: '/login',
  changePassword: '/cambiar-clave',
  admin: '/admin',
  adminHome: '/admin/calendar',
  adminSettings: '/admin/ajustes',
  client: '/app',
  clientHome: '/app/agenda',
  clientProfile: '/app/profile',
  clientSettings: '/app/ajustes',
} as const;

export function homeForRole(role: UserRole): string {
  return role === 'admin' ? AUTH_PATHS.adminHome : AUTH_PATHS.clientHome;
}
