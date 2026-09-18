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
    expect(text).toContain(PORTAL_AGENDA_LITERALS.noNextPickSlot);
    expect(text).not.toContain(PORTAL_AGENDA_LITERALS.noNextHint);
    expect(text).toContain(PORTAL_AGENDA_LITERALS.slots);
    expect(text).toContain('Alex Martin');
    expect(text).toContain('7');
  });

  it('keeps Pedir cita off the next appointment card', async () => {
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

    const nextCard = fixture.nativeElement.querySelector('app-bona-summary-card') as HTMLElement;
    expect(nextCard.textContent).toContain(PORTAL_AGENDA_LITERALS.nextAppointment);
    expect(nextCard.textContent).not.toContain(PORTAL_AGENDA_LITERALS.bookCta);
    expect(nextCard.textContent).toContain(PORTAL_AGENDA_LITERALS.cancel);
    expect(fixture.nativeElement.querySelector('#portal-agenda-book')?.textContent).toContain(
      PORTAL_AGENDA_LITERALS.bookCta,
    );
  });

  it('offers only the other contracted service when one type is already booked', async () => {
    servicesApi.getBonos.and.returnValue(
      of([
        ...bonos,
        {
          id: 'bono-hipo-8',
          serviceId: 'svc-hipo',
          name: 'pack-8',
          description: 'sessions-8',
          sessionCount: 8,
          price: 240,
        },
      ]),
    );
    clientsApi.getClientBonos.and.returnValue(
      of([
        ...clientBonos,
        {
          id: 'cb-hipo',
          clientId: 'client-1',
          bonoId: 'bono-hipo-8',
          remainingSessions: 3,
          purchasedAt: '2026-06-01T10:00:00.000Z',
          expiresAt: '2026-12-01T10:00:00.000Z',
        },
      ]),
    );
    calendarApi.getAppointments.and.returnValue(
      of([
        {
          id: 'apt-ep',
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

    const options = fixture.componentInstance.filterFields()[0].options ?? [];
    expect(options.length).toBe(1);
    expect(options[0].label).toContain('Hipopresivos');
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

  it('shows an in-progress appointment in the hero instead of an empty next slot', async () => {
    const startsAt = new Date(Date.now() - 20 * 60_000).toISOString();
    const endsAt = new Date(Date.now() + 40 * 60_000).toISOString();
    calendarApi.getAppointments.and.returnValue(
      of([
        {
          id: 'apt-now',
          trainerId: 'trainer-1',
          clientId: 'client-1',
          serviceId: 'svc-ep',
          startsAt,
          endsAt,
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
    expect(text).toContain('Entrenamiento personal');
    expect(text).not.toContain(PORTAL_AGENDA_LITERALS.noNextAppointment);
    expect(text).toContain(PORTAL_AGENDA_LITERALS.allServicesBooked);
  });

  it('keeps a finished but still-active appointment in the hero', async () => {
    calendarApi.getAppointments.and.returnValue(
      of([
        {
          id: 'apt-past',
          trainerId: 'trainer-1',
          clientId: 'client-1',
          serviceId: 'svc-ep',
          startsAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
          endsAt: new Date(Date.now() - 2 * 60 * 60_000).toISOString(),
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
    expect(text).toContain('Entrenamiento personal');
    expect(text).not.toContain(PORTAL_AGENDA_LITERALS.noNextAppointment);
    expect(text).not.toContain(PORTAL_AGENDA_LITERALS.noNextHint);
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

  it('does not let the client confirm a pending appointment', async () => {
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
          status: 'pending' as const,
        },
      ]),
    );
    fixture = TestBed.createComponent(PortalAgendaComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const nextCard = fixture.nativeElement.querySelector('app-bona-summary-card') as HTMLElement;
    expect(nextCard.textContent).toContain(PORTAL_AGENDA_LITERALS.statusPending);
    expect(nextCard.textContent).not.toContain(PORTAL_AGENDA_LITERALS.confirm);
    expect(nextCard.textContent).toContain(PORTAL_AGENDA_LITERALS.cancel);
    expect(fixture.componentInstance.appointmentActions().some((action) => action.action === 'confirm')).toBeFalse();
    expect(calendarApi.updateAppointment).not.toHaveBeenCalled();
  });

  it('hides cancel when the appointment is outside the booking cutoff', async () => {
    const startsAt = new Date(Date.now() + 30 * 60_000).toISOString();
    const endsAt = new Date(Date.now() + 90 * 60_000).toISOString();
    calendarApi.getAppointments.and.returnValue(
      of([
        {
          id: 'apt-soon',
          trainerId: 'trainer-1',
          clientId: 'client-1',
          serviceId: 'svc-ep',
          startsAt,
          endsAt,
          location: 'studio-1',
          status: 'confirmed' as const,
        },
      ]),
    );
    fixture = TestBed.createComponent(PortalAgendaComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const nextCard = fixture.nativeElement.querySelector('app-bona-summary-card') as HTMLElement;
    expect(nextCard.textContent).not.toContain(PORTAL_AGENDA_LITERALS.cancel);
    const cancel = fixture.componentInstance.appointmentActions().find((action) => action.action === 'cancel');
    expect(cancel?.visible?.(fixture.componentInstance.appointmentRows()[0])).toBeFalse();
  });

  it('lists hours for the selected day only', async () => {
    calendarApi.getAvailability.and.returnValue(
      of([
        {
          trainerId: 'trainer-1',
          startsAt: '2026-09-09T07:00:00.000Z',
          endsAt: '2026-09-09T08:00:00.000Z',
        },
        {
          trainerId: 'trainer-1',
          startsAt: '2026-09-10T09:00:00.000Z',
          endsAt: '2026-09-10T10:00:00.000Z',
        },
      ]),
    );
    fixture = TestBed.createComponent(PortalAgendaComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const chips = fixture.nativeElement.querySelectorAll('.portal-agenda__day-chip') as NodeListOf<HTMLButtonElement>;
    expect(chips.length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('.portal-agenda__slot').length).toBe(1);
    expect(fixture.componentInstance.selectedDayGroup()?.slots.length).toBe(1);
    expect(fixture.componentInstance.selectedDayGroup()?.key).toBe(fixture.componentInstance.slotGroups()[0].key);

    chips[1].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedDayGroup()?.key).toBe(fixture.componentInstance.slotGroups()[1].key);
    expect(fixture.nativeElement.querySelectorAll('.portal-agenda__slot').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.portal-agenda__slot-time')?.textContent).toContain(
      fixture.componentInstance.selectedDayGroup()?.slots[0].timeLabel ?? '',
    );
  });

  it('shows slots when changing even if the bono has no leftover sessions', async () => {
    clientsApi.getClientBonos.and.returnValue(
      of([
        {
          ...clientBonos[0],
          remainingSessions: 0,
        },
      ]),
    );
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

    fixture.componentInstance.onAppointmentAction({
      action: 'change',
      item: { id: 'apt-next' },
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(calendarApi.getAvailability).toHaveBeenCalledWith(
      jasmine.objectContaining({ serviceId: 'svc-ep', ignoreAppointmentId: 'apt-next' }),
    );
    const book = fixture.nativeElement.querySelector('#portal-agenda-book') as HTMLElement;
    expect(book.textContent).not.toContain(PORTAL_AGENDA_LITERALS.allServicesBooked);
    expect(book.textContent).toContain('Alex Martin');
  });

  it('lists my appointments from later dates first', async () => {
    calendarApi.getAppointments.and.returnValue(
      of([
        {
          id: 'apt-earlier',
          trainerId: 'trainer-1',
          clientId: 'client-1',
          serviceId: 'svc-ep',
          startsAt: '2026-06-01T10:00:00.000Z',
          endsAt: '2026-06-01T11:00:00.000Z',
          location: 'studio-1',
          status: 'completed' as const,
        },
        {
          id: 'apt-later',
          trainerId: 'trainer-2',
          clientId: 'client-1',
          serviceId: 'svc-hipo',
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

    expect(fixture.componentInstance.appointmentRows().map((row) => row.id)).toEqual([
      'apt-later',
      'apt-earlier',
    ]);
  });

  it('filters my appointments from the column field', async () => {
    calendarApi.getAppointments.and.returnValue(
      of([
        {
          id: 'apt-ep',
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

    const serviceFilter = Array.from(
      fixture.nativeElement.querySelectorAll('.bona-grid__table .bona-grid__filter') as NodeListOf<HTMLInputElement>,
    ).find((input) => input.getAttribute('aria-label')?.includes(PORTAL_AGENDA_LITERALS.service));
    expect(serviceFilter).toBeTruthy();
    serviceFilter!.value = 'zzz';
    serviceFilter!.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(PORTAL_AGENDA_LITERALS.emptyAppointmentsFilter);

    serviceFilter!.value = 'Entrenamiento';
    serviceFilter!.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Entrenamiento personal');
    expect(fixture.nativeElement.textContent).not.toContain(PORTAL_AGENDA_LITERALS.emptyAppointmentsFilter);
  });
});
