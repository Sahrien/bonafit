import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import {
  MOCK_BONOS,
  MOCK_CLIENT_BONOS,
  MOCK_CLIENTS,
  MOCK_SERVICES,
} from '../../testing/fixtures';
import { provideBonaFeedbackTesting } from '../../testing/bona-feedback';
import { clickGridMenuAction } from '../../testing/grid-menu';
import { ClientsApiService } from '../../services/clients-api.service';
import { ServicesApiService } from '../../services/services-api.service';
import { ClientFichaComponent } from './client-ficha.component';
import { CLIENTS_LITERALS } from './clients.literals';

describe('ClientFichaComponent', () => {
  let clientsApi: jasmine.SpyObj<ClientsApiService>;
  let servicesApi: jasmine.SpyObj<ServicesApiService>;

  beforeEach(async () => {
    clientsApi = jasmine.createSpyObj('ClientsApiService', [
      'getClient',
      'createClient',
      'updateClient',
      'deleteClient',
      'getClientBonos',
      'contractBono',
      'deleteClientBono',
    ]);
    servicesApi = jasmine.createSpyObj('ServicesApiService', ['getBonos', 'getServices']);
    clientsApi.getClient.and.callFake((id: string) =>
      of(MOCK_CLIENTS.find((client) => client.id === id) ?? MOCK_CLIENTS[0]),
    );
    clientsApi.updateClient.and.returnValue(of(MOCK_CLIENTS[0]));
    clientsApi.getClientBonos.and.callFake((id: string) =>
      of(MOCK_CLIENT_BONOS.filter((row) => row.clientId === id)),
    );
    clientsApi.contractBono.and.returnValue(
      of({
        id: 'cb-new',
        clientId: 'client-1',
        bonoId: 'bono-ep-5',
        remainingSessions: 5,
        purchasedAt: '2026-09-17T10:00:00.000Z',
        expiresAt: null,
      }),
    );
    clientsApi.deleteClientBono.and.returnValue(of(void 0));
    servicesApi.getBonos.and.returnValue(of(MOCK_BONOS));
    servicesApi.getServices.and.returnValue(of(MOCK_SERVICES));

    await TestBed.configureTestingModule({
      imports: [ClientFichaComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([{ path: 'admin/clients/:id', component: ClientFichaComponent }]),
        { provide: ClientsApiService, useValue: clientsApi },
        { provide: ServicesApiService, useValue: servicesApi },
        ...provideBonaFeedbackTesting().providers,
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

  it('lists assigned bonos and the gift form', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/clients/client-1', ClientFichaComponent);

    expect(clientsApi.getClientBonos).toHaveBeenCalledWith('client-1');
    expect(servicesApi.getServices).toHaveBeenCalled();
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(CLIENTS_LITERALS.assignedTitle);
    expect(text).toContain('Entrenamiento personal');
    expect(text).toContain('pack-10');
    expect(text).toContain(CLIENTS_LITERALS.giftTitle);
    expect(text).toContain(CLIENTS_LITERALS.gift);
  });

  it('labels a one-session gift as sesión suelta', async () => {
    clientsApi.getClientBonos.and.returnValue(
      of([
        {
          id: 'cb-gift',
          clientId: 'client-1',
          bonoId: 'bono-ep-10',
          remainingSessions: 1,
          purchasedAt: '2026-09-17T10:00:00.000Z',
          expiresAt: null,
        },
      ]),
    );
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/clients/client-1', ClientFichaComponent);

    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(CLIENTS_LITERALS.singleSession);
    expect(text).not.toContain('pack-10');
  });

  it('gifts a catalog pack to the client', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/admin/clients/client-1', ClientFichaComponent);

    component.onGiftSubmit({
      serviceId: 'svc-ep',
      kind: 'pack',
      bonoId: 'bono-ep-5',
    });
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(clientsApi.contractBono).toHaveBeenCalledWith({
      clientId: 'client-1',
      bonoId: 'bono-ep-5',
    });
  });

  it('gifts a single session of a service', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/admin/clients/client-1', ClientFichaComponent);

    component.onGiftSubmit({
      serviceId: 'svc-ep',
      kind: 'single',
      bonoId: '',
    });
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(clientsApi.contractBono).toHaveBeenCalledWith({
      clientId: 'client-1',
      serviceId: 'svc-ep',
      remainingSessions: 1,
    });
  });

  it('unassigns a client bono', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/clients/client-1', ClientFichaComponent);

    clickGridMenuAction(harness.routeNativeElement, CLIENTS_LITERALS.unassign, {
      rowText: 'pack-10',
    });
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(clientsApi.deleteClientBono).toHaveBeenCalledWith('cb-1');
  });
});
