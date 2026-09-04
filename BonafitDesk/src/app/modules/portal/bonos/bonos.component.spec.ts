import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { AuthSessionDto } from '../../../models/auth-session.dto';
import { BonoDto } from '../../../models/bono.dto';
import { ClientBonoDto } from '../../../models/client-bono.dto';
import { AuthApiService } from '../../../services/auth-api.service';
import { ClientsApiService } from '../../../services/clients-api.service';
import { ServicesApiService } from '../../../services/services-api.service';
import { BonosComponent } from './bonos.component';
import { BONOS_LITERALS } from './bonos.literals';

describe('BonosComponent', () => {
  let fixture: ComponentFixture<BonosComponent>;
  let authApi: jasmine.SpyObj<AuthApiService>;
  let clientsApi: jasmine.SpyObj<ClientsApiService>;
  let servicesApi: jasmine.SpyObj<ServicesApiService>;

  const session: AuthSessionDto = {
    token: 't',
    user: {
      id: 'user-client-1',
      displayName: 'Marina Lopez',
      role: 'client',
      clientId: 'client-1',
    },
  };

  const bonos: BonoDto[] = [
    {
      id: 'bono-ep-10',
      serviceId: 'svc-ep',
      name: 'pack-10',
      description: 'sessions-10',
      sessionCount: 10,
      price: 400,
    },
  ];

  const clientBonos: ClientBonoDto[] = [
    {
      id: 'cb-1',
      clientId: 'client-1',
      bonoId: 'bono-ep-10',
      remainingSessions: 7,
      purchasedAt: '2026-06-01T10:00:00.000Z',
      expiresAt: '2026-12-01T10:00:00.000Z',
    },
  ];

  beforeEach(async () => {
    authApi = jasmine.createSpyObj('AuthApiService', ['getSession']);
    clientsApi = jasmine.createSpyObj('ClientsApiService', ['getClientBonos']);
    servicesApi = jasmine.createSpyObj('ServicesApiService', ['getBonos']);
    authApi.getSession.and.returnValue(of(session));
    clientsApi.getClientBonos.and.returnValue(of(clientBonos));
    servicesApi.getBonos.and.returnValue(of(bonos));

    await TestBed.configureTestingModule({
      imports: [BonosComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AuthApiService, useValue: authApi },
        { provide: ClientsApiService, useValue: clientsApi },
        { provide: ServicesApiService, useValue: servicesApi },
      ],
    }).compileComponents();
  });

  function create(): Promise<void> {
    fixture = TestBed.createComponent(BonosComponent);
    fixture.detectChanges();
    return fixture.whenStable().then(() => fixture.detectChanges());
  }

  it('lists contracted ClientBono rows with remainingSessions', async () => {
    await create();

    expect(clientsApi.getClientBonos).toHaveBeenCalledWith('client-1');
    expect(fixture.nativeElement.querySelector('app-bona-grid')).toBeTruthy();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain(BONOS_LITERALS.remainingSessions);
    expect(text).toContain('pack-10');
    expect(text).toContain('7');
  });

  it('shows the empty state when the client has no bonos', async () => {
    clientsApi.getClientBonos.and.returnValue(of([]));
    await create();

    expect(fixture.nativeElement.textContent).toContain(BONOS_LITERALS.empty);
  });
});
