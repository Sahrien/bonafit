import { provideDeskTranslate } from '../../core/i18n/provide-desk-translate';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { BonaCalendarEventDrop } from '../../components/bona-calendar/bona-calendar.component';
import { BonaToast } from '../../components/bona-toast/bona-toast.service';
import { ApiBusinessError } from '../../core/api-business.error';
import { provideBonaFeedbackTesting } from '../../testing/bona-feedback';
import { MOCK_APPOINTMENTS, MOCK_BOOKING_SETTINGS, MOCK_CLIENTS, MOCK_PUBLIC_HOLIDAYS, MOCK_SERVICES, MOCK_TRAINERS } from '../../testing/fixtures';
import { CalendarApiService } from '../../services/calendar-api.service';
import { ClientsApiService } from '../../services/clients-api.service';
import { ServicesApiService } from '../../services/services-api.service';
import { AppointmentEditor } from './appointment-editor/appointment-editor.service';
import { CalendarComponent } from './calendar.component';
import { CALENDAR_LITERALS } from './calendar.literals';

describe('CalendarComponent', () => {
  let fixture: ComponentFixture<CalendarComponent>;
  let calendarApi: jasmine.SpyObj<CalendarApiService>;
  let clientsApi: jasmine.SpyObj<ClientsApiService>;
  let servicesApi: jasmine.SpyObj<ServicesApiService>;
  let appointmentEditor: jasmine.SpyObj<AppointmentEditor>;

  beforeEach(async () => {
    calendarApi = jasmine.createSpyObj('CalendarApiService', [
      'getTrainers',
      'getAppointments',
      'createAppointment',
      'updateAppointment',
      'getBookingSettings',
      'getTrainerSchedules',
      'getResolvedSchedules',
      'getPublicHolidays',
    ]);
    clientsApi = jasmine.createSpyObj('ClientsApiService', ['getClients', 'getClientBonos']);
    servicesApi = jasmine.createSpyObj('ServicesApiService', ['getServices', 'getBonos']);
    appointmentEditor = jasmine.createSpyObj('AppointmentEditor', ['open']);

    calendarApi.getTrainers.and.returnValue(of(MOCK_TRAINERS));
    calendarApi.getAppointments.and.returnValue(of(MOCK_APPOINTMENTS));
    calendarApi.getBookingSettings.and.returnValue(of(MOCK_BOOKING_SETTINGS));
    calendarApi.getResolvedSchedules.and.returnValue(of([]));
    calendarApi.getPublicHolidays.and.returnValue(of([]));
    calendarApi.createAppointment.and.returnValue(of(MOCK_APPOINTMENTS[0]));
    calendarApi.updateAppointment.and.returnValue(of(MOCK_APPOINTMENTS[0]));
    clientsApi.getClients.and.returnValue(of(MOCK_CLIENTS));
    clientsApi.getClientBonos.and.returnValue(of([]));
    servicesApi.getServices.and.returnValue(of(MOCK_SERVICES));
    servicesApi.getBonos.and.returnValue(of([]));
    appointmentEditor.open.and.returnValue(of(false));

    await TestBed.configureTestingModule({
      imports: [CalendarComponent],
      providers: [
        provideNoopAnimations(),
        provideDeskTranslate(),
        provideHttpClient(),
        provideRouter([]),
        { provide: CalendarApiService, useValue: calendarApi },
        { provide: ClientsApiService, useValue: clientsApi },
        { provide: ServicesApiService, useValue: servicesApi },
        { provide: AppointmentEditor, useValue: appointmentEditor },
        ...provideBonaFeedbackTesting().providers,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarComponent);
    fixture.detectChanges();
  });

  it('loads appointments without the today strip or booking settings form', () => {
    expect(calendarApi.getAppointments).toHaveBeenCalled();
    expect(clientsApi.getClients).toHaveBeenCalled();
    expect(servicesApi.getServices).toHaveBeenCalled();
    expect(calendarApi.getBookingSettings).toHaveBeenCalled();
    expect(calendarApi.getTrainerSchedules).not.toHaveBeenCalled();
    expect(calendarApi.getResolvedSchedules).toHaveBeenCalled();
    expect(calendarApi.getPublicHolidays).toHaveBeenCalled();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain(CALENDAR_LITERALS.title);
    expect(text).toContain(CALENDAR_LITERALS.week);
    expect(text).toContain(CALENDAR_LITERALS.day);
    expect(text).toContain(CALENDAR_LITERALS.displayCalendar);
    expect(text).toContain(CALENDAR_LITERALS.displayBoard);
    expect(fixture.nativeElement.querySelector('.calendar-today')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-bona-chip-filter')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-bona-filter-menu')).toBeTruthy();
    expect(text).toContain(CALENDAR_LITERALS.serviceFilter);
    expect(text).toContain(CALENDAR_LITERALS.trainerFilter);
    expect(text).not.toContain('Bonafit hoy');
    expect(fixture.componentInstance.appointmentEvents().length).toBe(MOCK_APPOINTMENTS.length);
  });

  it('keeps the view switcher apart from the new appointment action', () => {
    const actions = fixture.nativeElement.querySelector('.bona-page__actions') as HTMLElement;
    expect(actions.textContent).toContain(CALENDAR_LITERALS.newAppointment);
    expect(actions.textContent).not.toContain(CALENDAR_LITERALS.week);
    expect(actions.textContent).not.toContain(CALENDAR_LITERALS.day);

    const tabs = fixture.nativeElement.querySelectorAll('[role="tablist"]') as NodeListOf<HTMLElement>;
    expect(tabs[0].getAttribute('aria-label')).toBe(CALENDAR_LITERALS.viewLabel);
    expect(tabs[1].getAttribute('aria-label')).toBe(CALENDAR_LITERALS.displayLabel);
  });

  it('hides cancelled appointments from the calendar', () => {
    calendarApi.getAppointments.and.returnValue(
      of([{ ...MOCK_APPOINTMENTS[2], id: 'apt-cancelled', status: 'cancelled' }]),
    );
    fixture = TestBed.createComponent(CalendarComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.events().some((event) => event.id === 'apt-cancelled')).toBeFalse();
    fixture.destroy();
  });

  it('colors calendar events by appointment status and locks completed ones', () => {
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
    expect(events.find((event) => event.id === 'apt-completed')?.startEditable).toBeFalse();
    expect(events.find((event) => event.id === 'apt-pending')?.startEditable).toBeTrue();
    fixture.destroy();
  });

  it('shows trainer on week titles when several trainers are visible', () => {
    calendarApi.getAppointments.and.returnValue(of([{ ...MOCK_APPOINTMENTS[0], isGift: true }]));
    fixture = TestBed.createComponent(CalendarComponent);
    fixture.detectChanges();
    fixture.componentInstance.onView('week');
    fixture.detectChanges();

    const title = fixture.componentInstance.appointmentEvents()[0].title;
    expect(title).toBe('Marina Lopez · Entrenamiento personal · Alex Martin');
    expect(title).not.toContain(CALENDAR_LITERALS.gift);
    fixture.destroy();
  });

  it('omits trainer from day calendar titles', () => {
    fixture.componentInstance.onView('day');
    fixture.detectChanges();
    expect(fixture.componentInstance.appointmentEvents()[0].title).toBe('Marina Lopez · Entrenamiento personal');
  });

  it('filters events by trainer and service menus', () => {
    fixture.componentInstance.onTrainerFilter(['trainer-2']);
    fixture.detectChanges();
    expect(fixture.componentInstance.appointmentEvents().every((event) => event.resourceId === 'trainer-2')).toBeTrue();

    fixture.componentInstance.onTrainerFilter([]);
    fixture.componentInstance.onServiceFilter(['svc-masaje']);
    fixture.detectChanges();
    expect(fixture.componentInstance.appointmentEvents().map((event) => event.id)).toEqual(['apt-3']);
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

  it('opens the editor from the new appointment action and from a slot', () => {
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    );
    const create = buttons.find((button) =>
      button.textContent?.includes(CALENDAR_LITERALS.newAppointment),
    );
    create?.click();
    expect(appointmentEditor.open).toHaveBeenCalled();
    expect(appointmentEditor.open.calls.mostRecent().args[0].appointment).toBeNull();

    fixture.componentInstance.onSlotSelect({
      start: new Date('2026-09-09T10:00:00'),
      end: new Date('2026-09-09T11:00:00'),
      allDay: false,
    });
    const slotCall = appointmentEditor.open.calls.mostRecent().args[0];
    expect(slotCall.preset?.['startsAt']).toContain('2026-09-09T10:00');
  });

  it('opens the editor when an event is selected', () => {
    fixture.componentInstance.onEventClick({
      id: MOCK_APPOINTMENTS[0].id,
      title: 'cita',
      start: MOCK_APPOINTMENTS[0].startsAt,
    });
    expect(appointmentEditor.open).toHaveBeenCalledWith(
      jasmine.objectContaining({ appointment: MOCK_APPOINTMENTS[0] }),
    );
  });

  it('reloads appointments after a saved editor', () => {
    appointmentEditor.open.and.returnValue(of(true));
    calendarApi.getAppointments.calls.reset();
    fixture.componentInstance.onCreate();
    expect(calendarApi.getAppointments).toHaveBeenCalled();
  });

  it('switches to the status board for the visible period', () => {
    fixture.componentInstance.focusDate.set(new Date('2026-09-08T12:00:00'));
    fixture.componentInstance.onView('day');
    fixture.componentInstance.onDisplay('board');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-bona-board')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-bona-calendar')).toBeNull();
    expect(fixture.componentInstance.boardItems().map((item) => item.id)).toEqual(['apt-3']);
    expect(fixture.componentInstance.boardItems()[0].columnId).toBe('confirmed');
  });

  it('opens the editor from a board card', () => {
    fixture.componentInstance.onBoardItemClick({
      id: MOCK_APPOINTMENTS[2].id,
      columnId: 'confirmed',
      title: 'cita',
    });
    expect(appointmentEditor.open).toHaveBeenCalledWith(
      jasmine.objectContaining({ appointment: MOCK_APPOINTMENTS[2] }),
    );
  });

  it('saves a drag reschedule and reverts on conflict', () => {
    const revert = jasmine.createSpy('revert');
    const start = new Date('2026-09-08T18:00:00.000Z');
    const end = new Date('2026-09-08T19:00:00.000Z');
    const drop: BonaCalendarEventDrop = {
      event: {
        id: MOCK_APPOINTMENTS[2].id,
        title: 'cita',
        start: MOCK_APPOINTMENTS[2].startsAt,
      },
      start,
      end,
      revert,
    };
    fixture.componentInstance.onEventDrop(drop);
    expect(calendarApi.updateAppointment).toHaveBeenCalled();
    const payload = calendarApi.updateAppointment.calls.mostRecent().args[1];
    expect(payload.startsAt).toBe(start.toISOString());
    expect(payload.endsAt).toBe(end.toISOString());
    expect(revert).not.toHaveBeenCalled();

    calendarApi.updateAppointment.and.returnValue(throwError(() => new ApiBusinessError('booking.slotTaken')));
    fixture.componentInstance.onEventDrop(drop);
    expect(revert).toHaveBeenCalled();
    const toast = TestBed.inject(BonaToast) as jasmine.SpyObj<BonaToast>;
    expect(toast.error).toHaveBeenCalled();
  });

  it('does not drag completed appointments', () => {
    const revert = jasmine.createSpy('revert');
    fixture.componentInstance.onEventDrop({
      event: {
        id: MOCK_APPOINTMENTS[0].id,
        title: 'cita',
        start: MOCK_APPOINTMENTS[0].startsAt,
      },
      start: new Date(),
      end: new Date(),
      revert,
    });
    expect(calendarApi.updateAppointment).not.toHaveBeenCalled();
    expect(revert).toHaveBeenCalled();
  });

  it('paints union availability as a background event and holidays all day', () => {
    calendarApi.getResolvedSchedules.and.returnValue(
      of([
        {
          trainerId: 'trainer-1',
          date: '2026-09-09',
          windows: [{ startTime: '08:00', endTime: '12:00' }],
          source: 'template',
        },
        {
          trainerId: 'trainer-2',
          date: '2026-09-09',
          windows: [{ startTime: '10:00', endTime: '16:00' }],
          source: 'template',
        },
      ]),
    );
    calendarApi.getPublicHolidays.and.returnValue(of(MOCK_PUBLIC_HOLIDAYS));
    fixture = TestBed.createComponent(CalendarComponent);
    fixture.detectChanges();

    const events = fixture.componentInstance.events();
    const availability = events.filter((event) => event.display === 'background');
    expect(availability.length).toBe(1);
    expect((availability[0].start as Date).getHours()).toBe(8);
    expect((availability[0].end as Date).getHours()).toBe(16);
    expect(events.some((event) => event.allDay && event.title === 'Fiesta local')).toBeTrue();

    appointmentEditor.open.calls.reset();
    fixture.componentInstance.onEventClick(availability[0]);
    fixture.componentInstance.onEventClick(events.find((event) => event.allDay)!);
    fixture.componentInstance.onSlotSelect({
      start: new Date(2026, 8, 11),
      end: new Date(2026, 8, 12),
      allDay: true,
    });
    expect(appointmentEditor.open).not.toHaveBeenCalled();

    fixture.componentInstance.onTrainerFilter(['trainer-1']);
    fixture.detectChanges();
    const filtered = fixture.componentInstance.events().filter((event) => event.display === 'background');
    expect((filtered[0].end as Date).getHours()).toBe(12);
    fixture.destroy();
  });
});
