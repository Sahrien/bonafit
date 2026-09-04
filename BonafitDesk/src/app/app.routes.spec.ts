import { Type } from '@angular/core';
import { Route } from '@angular/router';
import { routes } from './app.routes';

interface LoadedRoute {
  path: string;
  name: string;
}

function joinPath(prefix: string, segment: string | undefined): string {
  return [prefix, segment ?? ''].filter((part) => part !== '').join('/');
}

function collectLoaders(items: Route[], prefix = ''): Array<{ path: string; load: () => Promise<Type<unknown>> }> {
  const loaders: Array<{ path: string; load: () => Promise<Type<unknown>> }> = [];
  for (const item of items) {
    const path = joinPath(prefix, item.path);
    if (item.loadComponent) {
      loaders.push({ path, load: item.loadComponent as () => Promise<Type<unknown>> });
    }
    if (item.children) {
      loaders.push(...collectLoaders(item.children, path));
    }
  }
  return loaders;
}

describe('app routes', () => {
  let loaded: LoadedRoute[];

  beforeAll(async () => {
    loaded = await Promise.all(
      collectLoaders(routes).map(async (item) => ({
        path: item.path,
        name: (await item.load()).name,
      })),
    );
  });

  it('does not leave PlaceholderPageComponent on any route', () => {
    expect(loaded.map((item) => item.name)).not.toContain('PlaceholderPageComponent');
  });

  it('wires admin home, bar shell, and CRUD modules', () => {
    expect(loaded).toContain(jasmine.objectContaining({ path: 'admin', name: 'AdminHomeComponent' }));
    expect(loaded).toContain(jasmine.objectContaining({ path: 'admin', name: 'AdminBarShellComponent' }));
    expect(loaded).toContain(jasmine.objectContaining({ path: 'admin/calendar', name: 'CalendarComponent' }));
    expect(loaded).toContain(jasmine.objectContaining({ path: 'admin/clients', name: 'ClientsComponent' }));
    expect(loaded).toContain(
      jasmine.objectContaining({ path: 'admin/clients/:id', name: 'ClientFichaComponent' }),
    );
    expect(loaded).toContain(jasmine.objectContaining({ path: 'admin/services', name: 'ServicesComponent' }));
  });

  it('wires the client portal shell and pages', () => {
    expect(loaded).toContain(jasmine.objectContaining({ path: 'app', name: 'PortalShellComponent' }));
    expect(loaded).toContain(jasmine.objectContaining({ path: 'app/profile', name: 'ProfileComponent' }));
    expect(loaded).toContain(jasmine.objectContaining({ path: 'app/bonos', name: 'BonosComponent' }));
    expect(loaded).toContain(jasmine.objectContaining({ path: 'app/catalogo', name: 'CatalogoComponent' }));
  });
});
