import { environment } from '../../environments/environment';

export const API_PATHS = {
  trainers: 'trainers',
  clients: 'clients',
  services: 'services',
  bonos: 'bonos',
  clientBonos: 'client-bonos',
  appointments: 'appointments',
  authAccounts: 'auth/accounts',
  authLogin: 'auth/login',
  authLogout: 'auth/logout',
  authMe: 'auth/me',
} as const;

export function apiUrl(...segments: string[]): string {
  const base = environment.apiUrl.replace(/\/+$/, '');
  const path = segments
    .flatMap((segment) => segment.split('/'))
    .filter((segment) => segment.length > 0)
    .join('/');
  return `${base}/${path}`;
}
