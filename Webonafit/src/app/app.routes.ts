import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, data: { page: 'home' } },
  { path: 'en', component: HomeComponent, data: { page: 'home' } },

  // `/es` is the explicit Spanish URL; the canonical Spanish page is `/`.
  { path: 'es', redirectTo: '/', pathMatch: 'full' },

  // Contact is an anchor on the home page, not a page of its own. Keep the old
  // paths working by pointing them at the localized anchor.
  { path: 'contacto', redirectTo: '/#contacto', pathMatch: 'full' },
  { path: 'es/contacto', redirectTo: '/#contacto', pathMatch: 'full' },
  { path: 'en/contacto', redirectTo: '/en#contact', pathMatch: 'full' },

  { path: '**', component: NotFoundComponent, data: { page: 'notFound' } },
];
