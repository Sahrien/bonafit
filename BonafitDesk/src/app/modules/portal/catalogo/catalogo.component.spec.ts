import { provideHttpClient } from '@angular/common/http';
import { provideDeskTranslate } from '../../../core/i18n/provide-desk-translate';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { AuthSessionDto } from '../../../models/auth-session.dto';
import { BonoDto } from '../../../models/bono.dto';
import { ClientBonoDto } from '../../../models/client-bono.dto';
import { ServiceDto } from '../../../models/service.dto';
import { AuthApiService } from '../../../services/auth-api.service';
import { provideBonaFeedbackTesting } from '../../../testing/bona-feedback';
import { ClientsApiService } from '../../../services/clients-api.service';
import { ServicesApiService } from '../../../services/services-api.service';
import { CatalogoComponent } from './catalogo.component';
import { CATALOGO_LITERALS } from './catalogo.literals';
import { clickGridMenuAction } from '../../../testing/grid-menu';

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
      name: 'Entrenamiento personal',
      sharesSessionPool: true,
      forcesSingleSession: false,
      allowsSingleSession: false,
      durationMinutes: 60,
      bookableByClient: true,
      active: true,
    },
    {
      id: 'svc-masaje',
      name: 'Masaje',
      sharesSessionPool: false,
      forcesSingleSession: true,
      allowsSingleSession: true,
      singleSessionPrice: 45,
      durationMinutes: 60,
      bookableByClient: false,
      active: true,
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
      id: 'bono-masaje-1',
      serviceId: 'svc-masaje',
      name: 'sesion-suelta',
      description: 'sessions-1',
      sessionCount: 1,
      price: 45,
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
    clientsApi = jasmine.createSpyObj('ClientsApiService', ['contractBono', 'getCoupons']);
    servicesApi = jasmine.createSpyObj('ServicesApiService', ['getServices', 'getBonos']);
    authApi.getSession.and.returnValue(of(session));
    servicesApi.getServices.and.returnValue(of(services));
    servicesApi.getBonos.and.returnValue(of(bonos));
    clientsApi.contractBono.and.returnValue(of(contracted));
    clientsApi.getCoupons.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [CatalogoComponent],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(), provideDeskTranslate(),
        { provide: AuthApiService, useValue: authApi },
        { provide: ClientsApiService, useValue: clientsApi },
        { provide: ServicesApiService, useValue: servicesApi },
        ...provideBonaFeedbackTesting().providers,
      ],
    }).compileComponents();
  });

  function create(): Promise<void> {
    fixture = TestBed.createComponent(CatalogoComponent);
    fixture.detectChanges();
    return fixture.whenStable().then(() => fixture.detectChanges());
  }

  function contractInRow(text: string): void {
    clickGridMenuAction(fixture.nativeElement, CATALOGO_LITERALS.contract, { rowText: text });
  }

  it('loads catalog offers from real bonos only', async () => {
    await create();

    expect(servicesApi.getServices).toHaveBeenCalled();
    expect(servicesApi.getBonos).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('app-bona-grid')).toBeTruthy();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('pack-10');
    expect(text).toContain('sesion-suelta');
    expect(fixture.nativeElement.querySelector('button[mat-icon-button]')).toBeTruthy();
  });

  it('contracts a bono through ClientsApiService.contractBono', async () => {
    await create();

    contractInRow('pack-10');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(clientsApi.contractBono).toHaveBeenCalledWith({
      clientId: 'client-1',
      bonoId: 'bono-ep-10',
    });
    expect(servicesApi.getBonos).toHaveBeenCalledTimes(2);
  });

  it('contracts a one-session masaje bono', async () => {
    await create();

    contractInRow('sesion-suelta');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(clientsApi.contractBono).toHaveBeenCalledWith({
      clientId: 'client-1',
      bonoId: 'bono-masaje-1',
    });
  });

  it('shows the stacked sale and coupon price and sends couponId', async () => {
    servicesApi.getServices.and.returnValue(
      of([{ ...services[0], saleKind: 'percent', saleValue: 20 }, services[1]]),
    );
    clientsApi.getCoupons.and.returnValue(
      of([
        {
          id: 'coupon-1',
          clientId: 'client-1',
          kind: 'percent',
          value: 10,
        },
      ]),
    );
    await create();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('400');
    expect(text).toContain('288');

    contractInRow('pack-10');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(clientsApi.contractBono).toHaveBeenCalledWith({
      clientId: 'client-1',
      bonoId: 'bono-ep-10',
      couponId: 'coupon-1',
    });
  });
});
