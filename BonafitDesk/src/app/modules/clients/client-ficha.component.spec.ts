import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { MOCK_CLIENTS } from '../../core/mock-data';
import { ClientsApiService } from '../../services/clients-api.service';
import { ServicesApiService } from '../../services/services-api.service';
import { ClientFichaComponent } from './client-ficha.component';
import { CLIENTS_LITERALS } from './clients.literals';

describe('ClientFichaComponent', () => {
  let clientsApi: jasmine.SpyObj<ClientsApiService>;

  beforeEach(async () => {
    clientsApi = jasmine.createSpyObj('ClientsApiService', [
      'getClient',
      'createClient',
      'updateClient',
      'deleteClient',
      'getClientBonos',
    ]);
    const servicesApi = jasmine.createSpyObj('ServicesApiService', ['getBonos']);
    clientsApi.getClient.and.callFake((id: string) =>
      of(MOCK_CLIENTS.find((client) => client.id === id) ?? MOCK_CLIENTS[0]),
    );
    clientsApi.updateClient.and.returnValue(of(MOCK_CLIENTS[0]));
    clientsApi.getClientBonos.and.returnValue(of([]));
    servicesApi.getBonos.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [ClientFichaComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([{ path: 'admin/clients/:id', component: ClientFichaComponent }]),
        { provide: ClientsApiService, useValue: clientsApi },
        { provide: ServicesApiService, useValue: servicesApi },
      ],
    }).compileComponents();
  });

  it('loads the ficha and shows field literals', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/clients/client-1', ClientFichaComponent);

    expect(clientsApi.getClient).toHaveBeenCalledWith('client-1');
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(CLIENTS_LITERALS.fichaTitle);
    expect(text).toContain(CLIENTS_LITERALS.firstName);
    expect(text).toContain(CLIENTS_LITERALS.lastName);
    expect(text).toContain(CLIENTS_LITERALS.email);
    expect(text).toContain(CLIENTS_LITERALS.phone);
    expect(text).toContain(CLIENTS_LITERALS.notes);
    expect(text).toContain(CLIENTS_LITERALS.instantConfirm);

    const inputs = Array.from(
      harness.routeNativeElement?.querySelectorAll('input') ?? [],
    ) as HTMLInputElement[];
    expect(inputs.some((input) => input.value === 'Marina')).toBeTrue();
    expect(harness.routeNativeElement?.querySelector('app-bona-form')).toBeTruthy();
  });
});
