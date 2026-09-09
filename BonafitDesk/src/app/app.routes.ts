import { Routes } from '@angular/router';
import { adminGuard, authenticatedGuard, clientGuard, homeRedirectGuard } from './core/auth/auth.guards';

const loadLogin = () =>
  import('./modules/login/login.component').then((m) => m.LoginComponent);

const loadChangePassword = () =>
  import('./modules/login/change-password.component').then((m) => m.ChangePasswordComponent);

const loadAdminShell = () =>
  import('./modules/admin/admin-shell.component').then((m) => m.AdminShellComponent);

const loadPortalShell = () =>
  import('./modules/portal/portal-shell.component').then((m) => m.PortalShellComponent);

const loadCalendar = () =>
  import('./modules/calendar/calendar.component').then((m) => m.CalendarComponent);

const loadClients = () =>
  import('./modules/clients/clients.component').then((m) => m.ClientsComponent);

const loadClientFicha = () =>
  import('./modules/clients/client-ficha.component').then((m) => m.ClientFichaComponent);

const loadServices = () =>
  import('./modules/services/services.component').then((m) => m.ServicesComponent);

const loadForms = () =>
  import('./modules/forms/forms.component').then((m) => m.FormsComponent);

const loadFormFicha = () =>
  import('./modules/forms/form-ficha.component').then((m) => m.FormFichaComponent);

const loadAdminSettings = () =>
  import('./modules/settings/admin-settings.component').then((m) => m.AdminSettingsComponent);

const loadPortalProfile = () =>
  import('./modules/portal/profile/profile.component').then((m) => m.ProfileComponent);

const loadPortalBonos = () =>
  import('./modules/portal/bonos/bonos.component').then((m) => m.BonosComponent);

const loadPortalAgenda = () =>
  import('./modules/portal/agenda/portal-agenda.component').then(
    (m) => m.PortalAgendaComponent,
  );

const loadPortalCatalogo = () =>
  import('./modules/portal/catalogo/catalogo.component').then((m) => m.CatalogoComponent);

const loadPortalForms = () =>
  import('./modules/portal/forms/portal-forms.component').then((m) => m.PortalFormsComponent);

const loadPortalFormFill = () =>
  import('./modules/portal/forms/portal-form-fill.component').then(
    (m) => m.PortalFormFillComponent,
  );

const loadClientSettings = () =>
  import('./modules/settings/client-settings.component').then((m) => m.ClientSettingsComponent);

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: loadLogin,
  },
  {
    path: 'cambiar-clave',
    canActivate: [authenticatedGuard],
    loadComponent: loadChangePassword,
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: loadAdminShell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'calendar' },
      { path: 'calendar', loadComponent: loadCalendar },
      { path: 'clients', loadComponent: loadClients },
      { path: 'clients/:id', loadComponent: loadClientFicha },
      { path: 'services', loadComponent: loadServices },
      { path: 'forms', loadComponent: loadForms },
      { path: 'forms/:id', loadComponent: loadFormFicha },
      { path: 'ajustes', loadComponent: loadAdminSettings },
    ],
  },
  {
    path: 'app',
    canActivate: [clientGuard],
    loadComponent: loadPortalShell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'agenda' },
      { path: 'profile', loadComponent: loadPortalProfile },
      { path: 'bonos', loadComponent: loadPortalBonos },
      { path: 'agenda', loadComponent: loadPortalAgenda },
      { path: 'catalogo', loadComponent: loadPortalCatalogo },
      { path: 'formularios', loadComponent: loadPortalForms },
      { path: 'formularios/:id', loadComponent: loadPortalFormFill },
      { path: 'ajustes', loadComponent: loadClientSettings },
    ],
  },
  {
    path: '',
    pathMatch: 'full',
    canActivate: [homeRedirectGuard],
    loadComponent: loadLogin,
  },
  {
    path: '**',
    canActivate: [homeRedirectGuard],
    loadComponent: loadLogin,
  },
];
