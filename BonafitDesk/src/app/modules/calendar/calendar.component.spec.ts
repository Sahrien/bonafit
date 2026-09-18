import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { BonaCalendarEvent } from '../../components/bona-calendar/bona-calendar.component';
import { BonaConfirm } from '../../components/bona-confirm/bona-confirm.service';
import { BonaToast } from '../../components/bona-toast/bona-toast.service';
import { provideBonaFeedbackTesting } from '../../testing/bona-feedback';
import { MOCK_APPOINTMENTS, MOCK_BOOKING_SETTINGS, MOCK_CLIENTS, MOCK_SERVICES, MOCK_TRAINERS } from '../../testing/fixtures';
import { CalendarApiService } from '../../services/calendar-api.service';
import { ClientsApiService } from '../../services/clients-api.service';
import { ServicesApiService } from '../../services/services-api.service';
import { CalendarComponent } from './calendar.component';
import { CALENDAR_LITERALS } from './calendar.literals';

describe('CalendarComponent', () => {
  let fixture: ComponentFixture<CalendarComponent>;
  let calendarApi: jasmine.SpyObj<CalendarApiService>;
  let clientsApi: jasmine.SpyObj<ClientsApiService>;
  let servicesApi: jasmine.SpyObj<ServicesApiService>;
  let router: Router;

  beforeEach(async () => {
    calendarApi = jasmine.createSpyObj('CalendarApiService', [
      'getTrainers',
      'getAppointments',
      'createAppointment',
      'updateAppointment',
      'getBookingSettings',
      'getTrainerSchedules',
    ]);
    clientsApi = jasmine.createSpyObj('ClientsApiService', ['getClients', 'getClientBonos']);
    servicesApi = jasmine.createSpyObj('ServicesApiService', ['getServices', 'getBonos']);

    calendarApi.getTrainers.and.returnValue(of(MOCK_TRAINERS));
    calendarApi.getAppointments.and.returnValue(of(MOCK_APPOINTMENTS));
    calendarApi.getBookingSettings.and.returnValue(of(MOCK_BOOKING_SETTINGS));
    calendarApi.createAppointment.and.returnValue(of(MOCK_APPOINTMENTS[0]));
    calendarApi.updateAppointment.and.returnValue(of(MOCK_APPOINTMENTS[0]));
    clientsApi.getClients.and.returnValue(of(MOCK_CLIENTS));
    clientsApi.getClientBonos.and.returnValue(of([]));
    servicesApi.getServices.and.returnValue(of(MOCK_SERVICES));
    servicesApi.getBonos.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [CalendarComponent],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideRouter([]),
        { provide: CalendarApiService, useValue: calendarApi },
        { provide: ClientsApiService, useValue: clientsApi },
        { provide: ServicesApiService, useValue: servicesApi },
        ...provideBonaFeedbackTesting().providers,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarComponent);
    fixture.detectChanges();
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl');
  });

  afterEach(() => {
    calendarApi.getAppointments.and.returnValue(of(MOCK_APPOINTMENTS));
  });

  it('loads appointments without the booking settings form', () => {
    expect(calendarApi.getAppointments).toHaveBeenCalled();
    expect(clientsApi.getClients).toHaveBeenCalled();
    expect(servicesApi.getServices).toHaveBeenCalled();
    expect(calendarApi.getBookingSettings).toHaveBeenCalled();
    expect(calendarApi.getTrainerSchedules).not.toHaveBeenCalled();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain(CALENDAR_LITERALS.title);
    expect(text).toContain(CALENDAR_LITERALS.week);
    expect(text).toContain(CALENDAR_LITERALS.day);
    expect(text).toContain(CALENDAR_LITERALS.todayTitle);
    expect(text).toContain(CALENDAR_LITERALS.emptyToday);
    expect(fixture.componentInstance.events().length).toBe(MOCK_APPOINTMENTS.length);
  });

  it('tints today summary rows by appointment status', () => {
    const pendingStart = new Date();
    pendingStart.setHours(10, 0, 0, 0);
    const confirmedStart = new Date();
    confirmedStart.setHours(12, 0, 0, 0);
    calendarApi.getAppointments.and.returnValue(
      of([
        {
          ...MOCK_APPOINTMENTS[2],
          id: 'today-pending',
          startsAt: pendingStart.toISOString(),
          endsAt: new Date(pendingStart.getTime() + 60 * 60 * 1000).toISOString(),
          status: 'pending',
        },
        {
          ...MOCK_APPOINTMENTS[2],
          id: 'today-confirmed',
          startsAt: confirmedStart.toISOString(),
          endsAt: new Date(confirmedStart.getTime() + 60 * 60 * 1000).toISOString(),
          status: 'confirmed',
        },
      ]),
    );
    fixture = TestBed.createComponent(CalendarComponent);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll(
      '.calendar-today__item',
    ) as NodeListOf<HTMLButtonElement>;
    expect(items.length).toBe(2);
    expect(items[0].getAttribute('data-status')).toBe('pending');
    expect(items[1].getAttribute('data-status')).toBe('confirmed');
    fixture.destroy();
  });

  it('omits completed appointments from today but keeps them grey on the calendar', () => {
    const completedStart = new Date();
    completedStart.setHours(11, 0, 0, 0);
    const confirmedStart = new Date();
    confirmedStart.setHours(13, 0, 0, 0);
    calendarApi.getAppointments.and.returnValue(
      of([
        {
          ...MOCK_APPOINTMENTS[0],
          id: 'today-completed',
          startsAt: completedStart.toISOString(),
          endsAt: new Date(completedStart.getTime() + 60 * 60 * 1000).toISOString(),
          status: 'completed',
        },
        {
          ...MOCK_APPOINTMENTS[2],
          id: 'today-confirmed',
          startsAt: confirmedStart.toISOString(),
          endsAt: new Date(confirmedStart.getTime() + 60 * 60 * 1000).toISOString(),
          status: 'confirmed',
        },
      ]),
    );
    fixture = TestBed.createComponent(CalendarComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.todayGroups().flatMap((group) =>
      group.items.map((item) => item.id),
    )).toEqual([
      'today-confirmed',
    ]);
    const completedEvent = fixture.componentInstance.events().find((event) => event.id === 'today-completed');
    expect(completedEvent).toBeTruthy();
    expect(completedEvent?.color).toBe(
      'color-mix(in srgb, var(--bona-color-text-muted) 55%, var(--bona-color-surface))',
    );
    expect(completedEvent?.classNames).toContain('bona-cal-status-completed');
    expect(completedEvent?.interactive).toBeTrue();
    fixture.destroy();
  });

  it('hides cancelled appointments from the calendar', () => {
    calendarApi.getAppointments.and.returnValue(
      of([{ ...MOCK_APPOINTMENTS[2], id: 'apt-cancelled', status: 'cancelled' }]),
    );
    fixture = TestBed.createComponent(CalendarComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.events().some((event) => event.id === 'apt-cancelled')).toBeFalse();
    expect(
      fixture.componentInstance
        .todayGroups()
        .some((group) => group.items.some((item) => item.id === 'apt-cancelled')),
    ).toBeFalse();
    fixture.destroy();
  });

  it('colors calendar events by appointment status', () => {
    calendarApi.getAppointments.and.returnValue(
      of([
        { ...MOCK_APPOINTMENTS[0], id: 'apt-completed', status: 'completed' },
        { ...MOCK_APPOINTMENTS[2], id: 'apt-pending', status: 'pending' },
        { ...MOCK_APPOINTMENTS[2], id: 'apt-confirmed', status: 'confirmed' },
      ]),
    );
    fixture = TestBed.createComponent(CalendarComponent);
    fixture.detectChanges();

    const events = fixture.componentInstance.events();
    expect(events.find((event) => event.id === 'apt-pending')?.color).toBe('var(--bona-color-warning)');
    expect(events.find((event) => event.id === 'apt-confirmed')?.color).toBe('var(--bona-color-success)');
    expect(events.find((event) => event.id === 'apt-completed')?.color).toBe(
      'color-mix(in srgb, var(--bona-color-text-muted) 55%, var(--bona-color-surface))',
    );
    fixture.destroy();
  });

  it('shows trainer on week titles when several trainers are visible', () => {
    calendarApi.getAppointments.and.returnValue(of([{ ...MOCK_APPOINTMENTS[0], isGift: true }]));
    fixture = TestBed.createComponent(CalendarComponent);
    fixture.detectChanges();
    fixture.componentInstance.onView('week');
    fixture.detectChanges();

    const title = fixture.componentInstance.events()[0].title;
    expect(title).toBe('Marina Lopez · Entrenamiento personal · Alex Martin');
    expect(title).not.toContain(CALENDAR_LITERALS.gift);
    expect(title).not.toContain(CALENDAR_LITERALS.statusCompleted);
    fixture.destroy();
  });

  it('omits trainer from day calendar titles', () => {
    fixture.componentInstance.onView('day');
    fixture.detectChanges();
    expect(fixture.componentInstance.events()[0].title).toBe('Marina Lopez · Entrenamiento personal');
  });

  it('opens the appointment form with field literals', () => {
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    );
    const create = buttons.find((button) =>
      button.textContent?.includes(CALENDAR_LITERALS.newAppointment),
    );
    create?.click();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain(CALENDAR_LITERALS.trainer);
    expect(text).toContain(CALENDAR_LITERALS.client);
    expect(text).toContain(CALENDAR_LITERALS.service);
    expect(text).toContain(CALENDAR_LITERALS.bono);
    expect(text).toContain(CALENDAR_LITERALS.startsAt);
    expect(text).toContain(CALENDAR_LITERALS.endsAt);
    expect(text).toContain(CALENDAR_LITERALS.location);
    expect(text).toContain(CALENDAR_LITERALS.sessionNotes);
    expect(text).toContain(CALENDAR_LITERALS.status);
    expect(fixture.nativeElement.querySelector('app-bona-form')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-bona-calendar')).toBeTruthy();
  });

  it('keeps the view switcher apart from the new appointment action', () => {
    const actions = fixture.nativeElement.querySelector('.bona-page__actions') as HTMLElement;
    expect(actions.textContent).toContain(CALENDAR_LITERALS.newAppointment);
    expect(actions.textContent).not.toContain(CALENDAR_LITERALS.week);
    expect(actions.textContent).not.toContain(CALENDAR_LITERALS.day);

    const tabs = fixture.nativeElement.querySelector('.bona-tabs') as HTMLElement;
    expect(tabs.getAttribute('aria-label')).toBe(CALENDAR_LITERALS.viewLabel);
    expect(tabs.textContent).toContain(CALENDAR_LITERALS.week);
    expect(tabs.textContent).toContain(CALENDAR_LITERALS.day);
  });

  it('groups today appointments by trainer then time', () => {
    const later = new Date();
    later.setHours(12, 0, 0, 0);
    const earlier = new Date();
    earlier.setHours(10, 0, 0, 0);
    calendarApi.getAppointments.and.returnValue(
      of([
        {
          ...MOCK_APPOINTMENTS[2],
          id: 'today-a',
          trainerId: 'trainer-2',
          startsAt: later.toISOString(),
          endsAt: later.toISOString(),
          status: 'confirmed',
        },
        {
          ...MOCK_APPOINTMENTS[2],
          id: 'today-b',
          trainerId: 'trainer-1',
          startsAt: earlier.toISOString(),
          endsAt: earlier.toISOString(),
          status: 'pending',
        },
        {
          ...MOCK_APPOINTMENTS[2],
          id: 'today-c',
          trainerId: 'trainer-1',
          startsAt: later.toISOString(),
          endsAt: later.toISOString(),
          status: 'confirmed',
        },
      ]),
    );
    fixture = TestBed.createComponent(CalendarComponent);
    fixture.detectChanges();

    const groups = fixture.componentInstance.todayGroups();
    expect(groups.map((group) => group.trainerId)).toEqual(['trainer-1', 'trainer-2']);
    expect(groups[0].items.map((item) => item.id)).toEqual(['today-b', 'today-c']);
    expect(groups[1].items.map((item) => item.id)).toEqual(['today-a']);
    const firstItem = fixture.nativeElement.querySelector('.calendar-today__item') as HTMLButtonElement;
    expect(firstItem.querySelector('.calendar-today__time')?.textContent?.trim()).toBeTruthy();
    expect(firstItem.querySelector('.calendar-today__copy strong')?.textContent).not.toContain(
      CALENDAR_LITERALS.statusPending,
    );
    expect(firstItem.querySelector('.calendar-today__copy em')?.textContent).toContain(
      CALENDAR_LITERALS.statusPending,
    );
    const itemTitle = firstItem.querySelector('.calendar-today__copy strong')?.textContent ?? '';
    expect(itemTitle).not.toContain('Alex Martin');
    expect(itemTitle).not.toContain('Sam Ortega');
    expect(fixture.nativeElement.textContent).toContain('Alex Martin');
    expect(fixture.nativeElement.textContent).toContain('Sam Ortega');
    expect(fixture.nativeElement.querySelector('.calendar-today__total')?.textContent).toContain(
      '3 citas en total',
    );
    const trainerCounts = Array.from(
      fixture.nativeElement.querySelectorAll('.calendar-today__trainer-count') as NodeListOf<HTMLElement>,
    ).map((node) => node.textContent?.trim());
    expect(trainerCounts).toEqual(['2 citas', '1 cita']);
    expect(getComputedStyle(fixture.nativeElement.querySelector('.calendar-today__list') as HTMLElement).display).toBe(
      'flex',
    );
    fixture.destroy();
  });

  it('filters the today summary with the trainer chips', () => {
    const start = new Date();
    start.setHours(10, 0, 0, 0);
    const iso = start.toISOString();
    calendarApi.getAppointments.and.returnValue(
      of([
        { ...MOCK_APPOINTMENTS[2], id: 'today-a', trainerId: 'trainer-2', startsAt: iso, endsAt: iso, status: 'confirmed' },
        { ...MOCK_APPOINTMENTS[2], id: 'today-b', trainerId: 'trainer-1', startsAt: iso, endsAt: iso, status: 'pending' },
      ]),
    );
    fixture = TestBed.createComponent(CalendarComponent);
    fixture.detectChanges();

    fixture.componentInstance.toggleTrainer('trainer-1');
    fixture.detectChanges();

    expect(fixture.componentInstance.todayGroups().map((group) => group.trainerId)).toEqual(['trainer-1']);
    expect(fixture.componentInstance.todayCount()).toBe(1);
    expect(fixture.nativeElement.querySelector('.calendar-today__total')?.textContent).toContain(
      CALENDAR_LITERALS.todayTotalOne,
    );
    expect(fixture.nativeElement.textContent).toContain('Alex Martin');
    expect(
      (fixture.nativeElement.querySelector('.calendar-today__list') as HTMLElement).textContent,
    ).not.toContain('Sam Ortega');
    fixture.destroy();
  });

  it('stacks one day calendar per trainer', () => {
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    );
    const day = buttons.find((button) => button.textContent?.includes(CALENDAR_LITERALS.day));
    day?.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.view()).toBe('day');
    expect(fixture.nativeElement.querySelectorAll('app-bona-calendar').length).toBe(MOCK_TRAINERS.length);
    const stack = fixture.nativeElement.querySelector('.calendar-day-trainers') as HTMLElement;
    expect(getComputedStyle(stack).flexDirection).toBe('column');
  });

  it('opens the editor when an event is selected', () => {
    const event: BonaCalendarEvent = {
      id: MOCK_APPOINTMENTS[0].id,
      title: 'cita',
      start: MOCK_APPOINTMENTS[0].startsAt,
    };
    fixture.componentInstance.onEventClick(event);
    fixture.detectChanges();

    expect(clientsApi.getClientBonos).toHaveBeenCalledWith(MOCK_APPOINTMENTS[0].clientId);
    expect(fixture.nativeElement.textContent).toContain(CALENDAR_LITERALS.editAppointment);
  });

  it('opens the editor for a completed appointment', () => {
    expect(MOCK_APPOINTMENTS[0].status).toBe('completed');
    fixture.componentInstance.onEventClick({
      id: MOCK_APPOINTMENTS[0].id,
      title: 'cita realizada',
      start: MOCK_APPOINTMENTS[0].startsAt,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(CALENDAR_LITERALS.editAppointment);
    expect(fixture.componentInstance.formValue()['status']).toBe('completed');
  });

  it('keeps close and save together and opens the client ficha', () => {
    const event: BonaCalendarEvent = {
      id: MOCK_APPOINTMENTS[0].id,
      title: 'cita',
      start: MOCK_APPOINTMENTS[0].startsAt,
    };
    fixture.componentInstance.onEventClick(event);
    fixture.detectChanges();

    const header = fixture.nativeElement.querySelector('.calendar-panel__header') as HTMLElement;
    expect(header.textContent).toContain(CALENDAR_LITERALS.closeEditor);
    expect(header.textContent).toContain(CALENDAR_LITERALS.save);

    const actions = fixture.nativeElement.querySelector('.bona-form__actions') as HTMLElement;
    expect(actions.textContent).toContain(CALENDAR_LITERALS.viewClient);
    expect(actions.textContent).not.toContain(CALENDAR_LITERALS.save);
    expect(fixture.nativeElement.querySelector('.calendar-panel > .calendar-panel__actions')).toBeNull();

    const buttons = Array.from(actions.querySelectorAll('button') as NodeListOf<HTMLButtonElement>);
    const openFicha = buttons.find((button) =>
      button.textContent?.includes(CALENDAR_LITERALS.viewClient),
    );
    openFicha?.click();
    expect(router.navigateByUrl).toHaveBeenCalledWith(`/admin/clients/${MOCK_APPOINTMENTS[0].clientId}`);
    const confirm = TestBed.inject(BonaConfirm) as jasmine.SpyObj<BonaConfirm>;
    expect(confirm.open).not.toHaveBeenCalled();
  });

  it('asks before opening the client ficha when the appointment form is dirty', () => {
    const confirm = TestBed.inject(BonaConfirm) as jasmine.SpyObj<BonaConfirm>;
    confirm.open.and.returnValue(of(false));
    fixture.componentInstance.onEventClick({
      id: MOCK_APPOINTMENTS[0].id,
      title: 'cita',
      start: MOCK_APPOINTMENTS[0].startsAt,
    });
    fixture.detectChanges();
    fixture.componentInstance.onFormChange({
      ...fixture.componentInstance.formValue(),
      notes: 'Cambio sin guardar',
    });

    fixture.componentInstance.onOpenClient();
    expect(confirm.open).toHaveBeenCalled();
    const request = confirm.open.calls.mostRecent().args[0];
    expect(request.title).toBe(CALENDAR_LITERALS.confirmLeaveTitle);
    expect(router.navigateByUrl).not.toHaveBeenCalled();

    confirm.open.and.returnValue(of(true));
    fixture.componentInstance.onOpenClient();
    expect(router.navigateByUrl).toHaveBeenCalledWith(`/admin/clients/${MOCK_APPOINTMENTS[0].clientId}`);
  });

  it('offers cancel on pending and confirmed appointments, not completed', () => {
    calendarApi.getAppointments.and.returnValue(
      of([
        { ...MOCK_APPOINTMENTS[0], status: 'completed' },
        { ...MOCK_APPOINTMENTS[2], status: 'confirmed' },
        { ...MOCK_APPOINTMENTS[2], id: 'apt-pending', status: 'pending' },
      ]),
    );
    fixture = TestBed.createComponent(CalendarComponent);
    fixture.detectChanges();

    fixture.componentInstance.onEventClick({
      id: MOCK_APPOINTMENTS[0].id,
      title: 'cita',
      start: MOCK_APPOINTMENTS[0].startsAt,
    });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector(`[aria-label="${CALENDAR_LITERALS.moreActions}"]`),
    ).toBeNull();

    fixture.componentInstance.onEventClick({
      id: MOCK_APPOINTMENTS[2].id,
      title: 'cita',
      start: MOCK_APPOINTMENTS[2].startsAt,
    });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector(`[aria-label="${CALENDAR_LITERALS.moreActions}"]`),
    ).toBeTruthy();
    expect(
      (fixture.nativeElement.querySelector('.bona-form__actions') as HTMLElement).textContent,
    ).toContain(CALENDAR_LITERALS.complete);

    fixture.componentInstance.onEventClick({
      id: 'apt-pending',
      title: 'cita',
      start: MOCK_APPOINTMENTS[2].startsAt,
    });
    fixture.detectChanges();

    const menuTrigger = fixture.nativeElement.querySelector(
      `[aria-label="${CALENDAR_LITERALS.moreActions}"]`,
    ) as HTMLButtonElement;
    expect(menuTrigger).toBeTruthy();
    menuTrigger.click();
    fixture.detectChanges();
    expect(document.body.textContent).toContain(CALENDAR_LITERALS.cancelAppointment);
    fixture.destroy();
  });

  it('asks before marking an appointment completed', () => {
    const confirm = TestBed.inject(BonaConfirm) as jasmine.SpyObj<BonaConfirm>;
    fixture.componentInstance.onEventClick({
      id: MOCK_APPOINTMENTS[2].id,
      title: 'cita',
      start: MOCK_APPOINTMENTS[2].startsAt,
    });
    fixture.detectChanges();
    fixture.componentInstance.onComplete();

    expect(confirm.open).toHaveBeenCalled();
    const request = confirm.open.calls.mostRecent().args[0];
    expect(request.title).toBe(CALENDAR_LITERALS.confirmCompleteTitle);
    expect(calendarApi.updateAppointment).toHaveBeenCalled();
    const payload = calendarApi.updateAppointment.calls.mostRecent().args[1];
    expect(payload.status).toBe('completed');
  });

  it('toasts when required appointment fields are missing', () => {
    const toast = TestBed.inject(BonaToast) as jasmine.SpyObj<BonaToast>;
    fixture.componentInstance.onSubmit({
      trainerId: '',
      clientId: '',
      serviceId: '',
      startsAt: '',
      endsAt: '',
      location: '',
      status: 'confirmed',
    });
    expect(toast.error).toHaveBeenCalledWith(CALENDAR_LITERALS.errorRequired);
    expect(calendarApi.createAppointment).not.toHaveBeenCalled();
  });

  it('sends clientBonoId null to assign a gift appointment', () => {
    fixture.componentInstance.onSubmit({
      trainerId: 'trainer-1',
      clientId: 'client-1',
      serviceId: 'svc-ep',
      clientBonoId: '',
      startsAt: '2026-09-09T10:00',
      endsAt: '2026-09-09T11:00',
      location: 'Studio',
      status: 'confirmed',
    });

    expect(calendarApi.createAppointment).toHaveBeenCalled();
    const payload = calendarApi.createAppointment.calls.mostRecent().args[0];
    expect(payload.clientBonoId).toBeNull();
    const toast = TestBed.inject(BonaToast) as jasmine.SpyObj<BonaToast>;
    expect(toast.success).toHaveBeenCalledWith(CALENDAR_LITERALS.saved);
  });

  it('sends the gift clientBonoId when booking a gifted session', () => {
    fixture.componentInstance.onSubmit({
      trainerId: 'trainer-1',
      clientId: 'client-1',
      serviceId: 'svc-ep',
      clientBonoId: 'cb-gift',
      startsAt: '2026-09-09T10:00',
      endsAt: '2026-09-09T11:00',
      location: 'Studio',
      status: 'confirmed',
    });

    expect(calendarApi.createAppointment).toHaveBeenCalled();
    const payload = calendarApi.createAppointment.calls.mostRecent().args[0];
    expect(payload.clientBonoId).toBe('cb-gift');
  });
});
