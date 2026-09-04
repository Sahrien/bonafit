import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { MOCK_CLIENTS } from '../../core/mock-data';
import { ClientsApiService } from '../../services/clients-api.service';
import { ClientsComponent } from './clients.component';
import { CLIENTS_LITERALS } from './clients.literals';

@Component({
  selector: 'app-client-ficha-stub',
  standalone: true,
  template: 'ficha',
})
class ClientFichaStubComponent {}

describe('ClientsComponent', () => {
  let clientsApi: jasmine.SpyObj<ClientsApiService>;
  let router: Router;

  beforeEach(async () => {
    clientsApi = jasmine.createSpyObj('ClientsApiService', [
      'getClients',
      'deleteClient',
    ]);
    clientsApi.getClients.and.returnValue(of(MOCK_CLIENTS));
    clientsApi.deleteClient.and.returnValue(of(void 0));

    await TestBed.configureTestingModule({
      imports: [ClientsComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([
          { path: 'admin/clients', component: ClientsComponent },
          { path: 'admin/clients/:id', component: ClientFichaStubComponent },
        ]),
        { provide: ClientsApiService, useValue: clientsApi },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  it('loads clients and renders columns from literals', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/clients', ClientsComponent);

    expect(clientsApi.getClients).toHaveBeenCalled();
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(CLIENTS_LITERALS.title);
    expect(text).toContain(CLIENTS_LITERALS.firstName);
    expect(text).toContain(CLIENTS_LITERALS.lastName);
    expect(text).toContain(CLIENTS_LITERALS.email);
    expect(text).toContain(CLIENTS_LITERALS.phone);
    expect(text).toContain('Marina');
    expect(harness.routeNativeElement?.querySelector('app-bona-grid')).toBeTruthy();
  });

  it('opens the ficha from the edit action', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/clients', ClientsComponent);

    const buttons = Array.from(
      harness.routeNativeElement?.querySelectorAll('button') ?? [],
    ) as HTMLButtonElement[];
    const edit = buttons.find((button) => button.textContent?.includes(CLIENTS_LITERALS.edit));
    expect(edit).toBeTruthy();
    edit?.click();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/admin/clients/client-1');
  });
});
