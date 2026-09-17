import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MOCK_BOOKING_SETTINGS, MOCK_SERVICES, MOCK_TRAINERS } from '../../../testing/fixtures';
import { AuthSessionDto } from '../../../models/auth-session.dto';
import { BonoDto } from '../../../models/bono.dto';
import { ClientBonoDto } from '../../../models/client-bono.dto';
import { AuthApiService } from '../../../services/auth-api.service';
import { CalendarApiService } from '../../../services/calendar-api.service';
import { ClientsApiService } from '../../../services/clients-api.service';
import { ServicesApiService } from '../../../services/services-api.service';
import { provideBonaFeedbackTesting } from '../../../testing/bona-feedback';
import { PortalAgendaComponent } from './portal-agenda.component';
import { PORTAL_AGENDA_LITERALS } from './portal-agenda.literals';

describe('PortalAgendaComponent', () => {
  let fixture: ComponentFixture<PortalAgendaComponent>;
  let authApi: jasmine.SpyObj<AuthApiService>;
  let calendarApi: jasmine.SpyObj<CalendarApiService>;
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
    calendarApi = jasmine.createSpyObj('CalendarApiService', [
      'getTrainers',
      'getAppointments',
      'getAvailability',
      'getBookingSettings',
      'createAppointment',
      'updateAppointment',
    ]);
    clientsApi = jasmine.createSpyObj('ClientsApiService', ['getClientBonos']);
    servicesApi = jasmine.createSpyObj('ServicesApiService', ['getServices', 'getBonos']);
    authApi.getSession.and.returnValue(of(session));
    calendarApi.getTrainers.and.returnValue(of(MOCK_TRAINERS));
    calendarApi.getAppointments.and.returnValue(of([]));
    calendarApi.getBookingSettings.and.returnValue(of(MOCK_BOOKING_SETTINGS));
    calendarApi.getAvailability.and.returnValue(
      of([
        {
          trainerId: 'trainer-1',
          startsAt: '2026-09-09T07:00:00.000Z',
          endsAt: '2026-09-09T08:00:00.000Z',
        },
      ]),
    );
    clientsApi.getClientBonos.and.returnValue(of(clientBonos));
    servicesApi.getServices.and.returnValue(of(MOCK_SERVICES));
    servicesApi.getBonos.and.returnValue(of(bonos));

    await TestBed.configureTestingModule({
      imports: [PortalAgendaComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: AuthApiService, useValue: authApi },
        { provide: CalendarApiService, useValue: calendarApi },
        { provide: ClientsApiService, useValue: clientsApi },
        { provide: ServicesApiService, useValue: servicesApi },
        ...provideBonaFeedbackTesting().providers,
      ],
    }).compileComponents();
  });

  it('shows bookable slots for the contracted service', async () => {
    fixture = TestBed.createComponent(PortalAgendaComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(calendarApi.getAvailability).toHaveBeenCalled();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain(PORTAL_AGENDA_LITERALS.title);
    expect(text).toContain(PORTAL_AGENDA_LITERALS.nextAppointment);
    expect(text).toContain(PORTAL_AGENDA_LITERALS.noNextAppointment);
    expect(text).toContain(PORTAL_AGENDA_LITERALS.slots);
    expect(text).toContain('Alex Martin');
    expect(text).toContain('7');
  });

  it('shows the next appointment in the hero when one is upcoming', async () => {
    calendarApi.getAppointments.and.returnValue(
      of([
        {
          id: 'apt-next',
          trainerId: 'trainer-1',
          clientId: 'client-1',
          serviceId: 'svc-ep',
          startsAt: '2026-12-01T10:00:00.000Z',
          endsAt: '2026-12-01T11:00:00.000Z',
          location: 'studio-1',
          status: 'confirmed' as const,
        },
      ]),
    );
    fixture = TestBed.createComponent(PortalAgendaComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain(PORTAL_AGENDA_LITERALS.nextAppointment);
    expect(text).toContain('Entrenamiento personal');
    expect(text).not.toContain(PORTAL_AGENDA_LITERALS.noNextAppointment);
  });

  it('shows cancel for a confirmed appointment still inside the cutoff', async () => {
    calendarApi.getAppointments.and.returnValue(
      of([
        {
          id: 'apt-next',
          trainerId: 'trainer-1',
          clientId: 'client-1',
          serviceId: 'svc-ep',
          startsAt: '2026-12-01T10:00:00.000Z',
          endsAt: '2026-12-01T11:00:00.000Z',
          location: 'studio-1',
          status: 'confirmed' as const,
        },
      ]),
    );
    fixture = TestBed.createComponent(PortalAgendaComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const cancel = fixture.componentInstance.appointmentActions().find((action) => action.action === 'cancel');
    const row = fixture.componentInstance.appointmentRows()[0];
    expect(cancel?.visible?.(row)).toBeTrue();
  });
});
