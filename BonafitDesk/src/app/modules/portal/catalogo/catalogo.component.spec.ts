import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { AuthSessionDto } from '../../../models/auth-session.dto';
import { BonoDto } from '../../../models/bono.dto';
import { ClientBonoDto } from '../../../models/client-bono.dto';
import { ServiceDto } from '../../../models/service.dto';
import { AuthApiService } from '../../../services/auth-api.service';
import { ClientsApiService } from '../../../services/clients-api.service';
import { ServicesApiService } from '../../../services/services-api.service';
import { CatalogoComponent } from './catalogo.component';
import { CATALOGO_LITERALS } from './catalogo.literals';

describe('CatalogoComponent', () => {
  let fixture: ComponentFixture<CatalogoComponent>;
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

  const services: ServiceDto[] = [
    {
      id: 'svc-ep',
      category: 'entrenamiento-personal',
      name: 'entrenamiento-personal',
      allowsSingleSession: false,
    },
    {
      id: 'svc-masaje',
      category: 'masaje',
      name: 'masaje',
      allowsSingleSession: true,
      singleSessionPrice: 45,
    },
  ];

  const bonos: BonoDto[] = [
    {
      id: 'bono-ep-10',
      serviceId: 'svc-ep',
      name: 'pack-10',
      description: 'sessions-10',
      sessionCount: 10,
      price: 400,
    },
    {
      id: 'bono-masaje-5',
      serviceId: 'svc-masaje',
      name: 'pack-5',
      description: 'sessions-5',
      sessionCount: 5,
      price: 200,
    },
  ];

  const contracted: ClientBonoDto = {
    id: 'cb-new',
    clientId: 'client-1',
    bonoId: 'bono-ep-10',
    remainingSessions: 10,
    purchasedAt: '2026-09-04T10:00:00.000Z',
    expiresAt: null,
  };

  beforeEach(async () => {
    authApi = jasmine.createSpyObj('AuthApiService', ['getSession']);
    clientsApi = jasmine.createSpyObj('ClientsApiService', ['contractBono']);
    servicesApi = jasmine.createSpyObj('ServicesApiService', ['getServices', 'getBonos']);
    authApi.getSession.and.returnValue(of(session));
    servicesApi.getServices.and.returnValue(of(services));
    servicesApi.getBonos.and.returnValue(of(bonos));
    clientsApi.contractBono.and.returnValue(of(contracted));

    await TestBed.configureTestingModule({
      imports: [CatalogoComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AuthApiService, useValue: authApi },
        { provide: ClientsApiService, useValue: clientsApi },
        { provide: ServicesApiService, useValue: servicesApi },
      ],
    }).compileComponents();
  });

  function create(): Promise<void> {
    fixture = TestBed.createComponent(CatalogoComponent);
    fixture.detectChanges();
    return fixture.whenStable().then(() => fixture.detectChanges());
  }

  function contractButtonInRow(text: string): HTMLButtonElement | undefined {
    const rows = Array.from(
      fixture.nativeElement.querySelectorAll('tr') as NodeListOf<HTMLTableRowElement>,
    );
    const row = rows.find((item) => item.textContent?.includes(text));
    return row?.querySelector('button') ?? undefined;
  }

  it('loads catalog offers including a single session when allowed', async () => {
    await create();

    expect(servicesApi.getServices).toHaveBeenCalled();
    expect(servicesApi.getBonos).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('app-bona-grid')).toBeTruthy();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('pack-10');
    expect(text).toContain('pack-5');
    expect(text).toContain(CATALOGO_LITERALS.singleSession);
    expect(text).toContain(CATALOGO_LITERALS.contract);
  });

  it('contracts a bono through ClientsApiService.contractBono', async () => {
    await create();

    contractButtonInRow('pack-10')?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(clientsApi.contractBono).toHaveBeenCalledWith({
      clientId: 'client-1',
      bonoId: 'bono-ep-10',
    });
    expect(fixture.nativeElement.textContent).toContain(CATALOGO_LITERALS.contracted);
  });

  it('uses a local mock path for single session because no API exists', async () => {
    await create();

    contractButtonInRow(CATALOGO_LITERALS.singleSession)?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(clientsApi.contractBono).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(CATALOGO_LITERALS.singleSessionMock);
  });
});
