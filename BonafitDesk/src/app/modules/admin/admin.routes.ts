import { Routes } from '@angular/router';
import { adminAccountingLeaveGuard } from '../accounting/accounting.leave-guard';
import { adminSettingsLeaveGuard } from '../settings/admin-settings.leave-guard';

export const ADMIN_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'calendar' },
  {
    path: 'calendar',
    loadComponent: () =>
      import('../calendar/calendar.component').then((m) => m.CalendarComponent),
  },
  {
    path: 'horarios',
    loadComponent: () =>
      import('../schedules/schedules.component').then((m) => m.SchedulesComponent),
  },
  {
    path: 'clients',
    loadComponent: () =>
      import('../clients/clients.component').then((m) => m.ClientsComponent),
  },
  {
    path: 'clients/:id',
    loadComponent: () =>
      import('../clients/client-ficha.component').then((m) => m.ClientFichaComponent),
  },
  {
    path: 'services',
    loadComponent: () =>
      import('../services/services.component').then((m) => m.ServicesComponent),
  },
  {
    path: 'forms',
    loadComponent: () =>
      import('../forms/forms.component').then((m) => m.FormsComponent),
  },
  {
    path: 'forms/:id',
    loadComponent: () =>
      import('../forms/form-ficha.component').then((m) => m.FormFichaComponent),
  },
  {
    path: 'stats',
    loadComponent: () => import('../stats/stats.component').then((m) => m.StatsComponent),
  },
  {
    path: 'contabilidad',
    loadComponent: () =>
      import('../accounting/accounting.component').then((m) => m.AccountingComponent),
    canDeactivate: [adminAccountingLeaveGuard],
  },
  {
    path: 'ajustes',
    loadComponent: () =>
      import('../settings/admin-settings.component').then((m) => m.AdminSettingsComponent),
    canDeactivate: [adminSettingsLeaveGuard],
  },
];
