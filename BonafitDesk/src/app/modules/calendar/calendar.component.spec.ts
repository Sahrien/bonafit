import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { BonaCalendarEvent } from '../../components/bona-calendar/bona-calendar.component';
import { AUTH_PATHS } from '../../core/auth/auth.paths';
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
      'deleteAppointment',
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
    expect(text).toContain(CALENDAR_LITERALS.status);
    expect(fixture.nativeElement.querySelector('app-bona-form')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-bona-calendar')).toBeTruthy();
  });

  it('keeps the view switcher apart from the new appointment action', () => {
    const actions = fixture.nativeElement.querySelector('.bona-page__actions') as HTMLElement;
    expect(actions.textContent).toContain(CALENDAR_LITERALS.newAppointment);
    expect(actions.textContent).toContain(CALENDAR_LITERALS.schedulesToggle);
    expect(actions.textContent).not.toContain(CALENDAR_LITERALS.week);
    expect(actions.textContent).not.toContain(CALENDAR_LITERALS.day);

    const tabs = fixture.nativeElement.querySelector('.bona-tabs') as HTMLElement;
    expect(tabs.getAttribute('aria-label')).toBe(CALENDAR_LITERALS.viewLabel);
    expect(tabs.textContent).toContain(CALENDAR_LITERALS.week);
    expect(tabs.textContent).toContain(CALENDAR_LITERALS.day);
  });

  it('switches to day view', () => {
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    );
    const day = buttons.find((button) => button.textContent?.includes(CALENDAR_LITERALS.day));
    day?.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.view()).toBe('day');
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

  it('sends clientBonoId null for a walk-in session', () => {
    fixture.componentInstance.onSubmit({
      trainerId: 'trainer-1',
      clientId: 'client-1',
      serviceId: 'svc-masaje',
      clientBonoId: '',
      startsAt: '2026-09-09T10:00',
      endsAt: '2026-09-09T11:00',
      location: 'Studio',
      status: 'confirmed',
    });

    expect(calendarApi.createAppointment).toHaveBeenCalled();
    const payload = calendarApi.createAppointment.calls.mostRecent().args[0];
    expect(payload.clientBonoId).toBeNull();
  });

  it('sends clientBonoId null for a gifted single session', () => {
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
  });

  it('opens the schedules page from the calendar action', () => {
    fixture.componentInstance.onOpenSchedules();
    expect(router.navigateByUrl).toHaveBeenCalledWith(AUTH_PATHS.adminSchedules);
  });
});
