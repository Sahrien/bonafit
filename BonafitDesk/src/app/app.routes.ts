import { Routes } from '@angular/router';
import { adminGuard, clientGuard, homeRedirectGuard } from './core/auth/auth.guards';

const loadLogin = () =>
  import('./modules/login/login.component').then((m) => m.LoginComponent);

const loadAdminHome = () =>
  import('./modules/admin/admin-home.component').then((m) => m.AdminHomeComponent);

const loadAdminBarShell = () =>
  import('./modules/admin/admin-bar-shell.component').then((m) => m.AdminBarShellComponent);

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

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: loadLogin,
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: loadAdminHome,
      },
      {
        path: '',
        loadComponent: loadAdminBarShell,
        children: [
          {
            path: 'calendar',
            loadComponent: loadCalendar,
          },
          {
            path: 'clients',
            loadComponent: loadClients,
          },
          {
            path: 'clients/:id',
            loadComponent: loadClientFicha,
          },
          {
            path: 'services',
            loadComponent: loadServices,
          },
          {
            path: 'forms',
            loadComponent: loadForms,
          },
          {
            path: 'forms/:id',
            loadComponent: loadFormFicha,
          },
        ],
      },
    ],
  },
  {
    path: 'app',
    canActivate: [clientGuard],
    loadComponent: loadPortalShell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'profile' },
      { path: 'profile', loadComponent: loadPortalProfile },
      { path: 'bonos', loadComponent: loadPortalBonos },
      { path: 'agenda', loadComponent: loadPortalAgenda },
      { path: 'catalogo', loadComponent: loadPortalCatalogo },
      { path: 'formularios', loadComponent: loadPortalForms },
      { path: 'formularios/:id', loadComponent: loadPortalFormFill },
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
