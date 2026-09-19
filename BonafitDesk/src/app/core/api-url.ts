import { environment } from '../../environments/environment';

export const API_PATHS = {
  trainers: 'trainers',
  clients: 'clients',
  services: 'services',
  bonos: 'bonos',
  clientBonos: 'client-bonos',
  appointments: 'appointments',
  availability: 'appointments/availability',
  bookingSettings: 'booking-settings',
  branding: 'branding',
  brandingLogo: 'branding/logo',
  brandingFavicon: 'branding/favicon',
  trainerSchedules: 'trainer-schedules',
  forms: 'forms',
  stats: 'stats',
  accounting: 'accounting',
  accountingEntries: 'accounting/entries',
  accountingSettings: 'accounting/settings',
  accountingCategories: 'accounting/categories',
  accountingSyncSales: 'accounting/entries/sync-sales',
  accountingRecurring: 'accounting/entries/generate-recurring',
  accountingLock: 'accounting/periods/lock',
  accountingUnlock: 'accounting/periods/unlock',
  accountingReports: 'accounting/reports',
  formAssignments: 'form-assignments',
  clientCoupons: 'coupons',
  authLogin: 'auth/login',
  authLogout: 'auth/logout',
  authMe: 'auth/me',
  authChangePassword: 'auth/change-password',
} as const;

export function apiUrl(...segments: string[]): string {
  const base = environment.apiUrl.replace(/\/+$/, '');
  const path = segments
    .flatMap((segment) => segment.split('/'))
    .filter((segment) => segment.length > 0)
    .join('/');
  return `${base}/${path}`;
}
