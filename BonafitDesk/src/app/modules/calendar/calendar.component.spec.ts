import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { BonaCalendarEvent } from '../../components/bona-calendar/bona-calendar.component';
import { MOCK_APPOINTMENTS, MOCK_CLIENTS, MOCK_SERVICES, MOCK_TRAINERS } from '../../core/mock-data';
import { AuthSessionDto } from '../../models/auth-session.dto';
import { AuthApiService } from '../../services/auth-api.service';
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
  let authApi: jasmine.SpyObj<AuthApiService>;

  const session: AuthSessionDto = {
    user: {
      id: 'user-trainer-1',
      displayName: 'Alex Martin',
      role: 'admin',
      trainerId: 'trainer-1',
    },
    token: 'mock',
  };

  beforeEach(async () => {
    calendarApi = jasmine.createSpyObj('CalendarApiService', [
      'getTrainers',
      'getAppointments',
      'createAppointment',
      'updateAppointment',
      'deleteAppointment',
    ]);
    clientsApi = jasmine.createSpyObj('ClientsApiService', ['getClients', 'getClientBonos']);
    servicesApi = jasmine.createSpyObj('ServicesApiService', ['getServices', 'getBonos']);
    authApi = jasmine.createSpyObj('AuthApiService', ['getSession']);

    calendarApi.getTrainers.and.returnValue(of(MOCK_TRAINERS));
    calendarApi.getAppointments.and.returnValue(of(MOCK_APPOINTMENTS));
    clientsApi.getClients.and.returnValue(of(MOCK_CLIENTS));
    clientsApi.getClientBonos.and.returnValue(of([]));
    servicesApi.getServices.and.returnValue(of(MOCK_SERVICES));
    servicesApi.getBonos.and.returnValue(of([]));
    authApi.getSession.and.returnValue(of(session));

    await TestBed.configureTestingModule({
      imports: [CalendarComponent],
      providers: [
        provideNoopAnimations(),
        { provide: CalendarApiService, useValue: calendarApi },
        { provide: ClientsApiService, useValue: clientsApi },
        { provide: ServicesApiService, useValue: servicesApi },
        { provide: AuthApiService, useValue: authApi },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarComponent);
    fixture.detectChanges();
  });

  it('loads appointments and shows the session user', () => {
    expect(calendarApi.getAppointments).toHaveBeenCalled();
    expect(clientsApi.getClients).toHaveBeenCalled();
    expect(servicesApi.getServices).toHaveBeenCalled();
    expect(authApi.getSession).toHaveBeenCalled();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain(CALENDAR_LITERALS.title);
    expect(text).toContain(CALENDAR_LITERALS.week);
    expect(text).toContain(CALENDAR_LITERALS.day);
    expect(text).toContain('Alex Martin');
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
    expect(fixture.nativeElement.querySelector('app-bona-form')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-bona-calendar')).toBeTruthy();
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
});
