import { Routes } from '@angular/router';
import { adminGuard, authenticatedGuard, clientGuard, homeRedirectGuard } from './core/auth/auth.guards';
import { ADMIN_ROUTES } from './modules/admin/admin.routes';

const loadLogin = () =>
  import('./modules/login/login.component').then((m) => m.LoginComponent);

const loadChangePassword = () =>
  import('./modules/login/change-password.component').then((m) => m.ChangePasswordComponent);

const loadPortalShell = () =>
  import('./modules/portal/portal-shell.component').then((m) => m.PortalShellComponent);

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

const loadAdminShell = () =>
  import('./modules/admin/admin-shell.component').then((m) => m.AdminShellComponent);

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
    children: ADMIN_ROUTES,
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
