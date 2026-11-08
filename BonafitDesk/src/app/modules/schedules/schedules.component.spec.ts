import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { provideDeskTranslate } from '../../core/i18n/provide-desk-translate';
import { provideHttpClient } from '@angular/common/http';
import { provideBonaFeedbackTesting } from '../../testing/bona-feedback';
import {
  MOCK_ACCOUNTS,
  MOCK_PUBLIC_HOLIDAYS,
  MOCK_SCHEDULE_HOURS,
  MOCK_TRAINERS,
  MOCK_TRAINER_SCHEDULES,
  createMockSession,
} from '../../testing/fixtures';
import { AuthApiService } from '../../services/auth-api.service';
import { CalendarApiService } from '../../services/calendar-api.service';
import { SchedulesComponent } from './schedules.component';
import { ScheduleAction } from './schedule-action.service';
import { SCHEDULES_LITERALS } from './schedules.literals';

describe('SchedulesComponent', () => {
  let calendarApi: jasmine.SpyObj<CalendarApiService>;
  let authApi: jasmine.SpyObj<AuthApiService>;
  let scheduleAction: jasmine.SpyObj<ScheduleAction>;

  beforeEach(async () => {
    calendarApi = jasmine.createSpyObj('CalendarApiService', [
      'getTrainers',
      'getTrainer',
      'getTrainerSchedules',
      'createTrainerSchedule',
      'updateTrainerSchedule',
      'deleteTrainerSchedule',
      'updateTrainer',
      'getScheduleDateWindows',
      'createScheduleDateWindow',
      'updateScheduleDateWindow',
      'deleteScheduleDateWindow',
      'getScheduleAbsences',
      'createScheduleAbsence',
      'deleteScheduleAbsence',
      'getPublicHolidays',
      'createPublicHoliday',
      'updatePublicHoliday',
      'deletePublicHoliday',
      'getResolvedSchedules',
      'getScheduleHours',
    ]);
    authApi = jasmine.createSpyObj('AuthApiService', ['getSession']);
    scheduleAction = jasmine.createSpyObj('ScheduleAction', ['open']);
    scheduleAction.open.and.returnValue(of(null));
    calendarApi.getTrainers.and.returnValue(of(MOCK_TRAINERS));
    calendarApi.getTrainer.and.callFake((id: string) =>
      of(MOCK_TRAINERS.find((row) => row.id === id) ?? MOCK_TRAINERS[0]),
    );
    calendarApi.updateTrainer.and.callFake((id: string, payload) =>
      of({ id, name: payload.name, concurrentCapacity: payload.concurrentCapacity }),
    );
    calendarApi.getTrainerSchedules.and.callFake((trainerId?: string) =>
      of(
        trainerId
          ? MOCK_TRAINER_SCHEDULES.filter((row) => row.trainerId === trainerId)
          : MOCK_TRAINER_SCHEDULES,
      ),
    );
    calendarApi.getScheduleDateWindows.and.returnValue(of([]));
    calendarApi.getScheduleAbsences.and.returnValue(of([]));
    calendarApi.getPublicHolidays.and.returnValue(of(MOCK_PUBLIC_HOLIDAYS));
    calendarApi.getResolvedSchedules.and.returnValue(of([]));
    calendarApi.getScheduleHours.and.returnValue(of(MOCK_SCHEDULE_HOURS));
    authApi.getSession.and.returnValue(of(createMockSession(MOCK_ACCOUNTS[0])));

    await TestBed.configureTestingModule({
      imports: [SchedulesComponent],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideDeskTranslate(),
        { provide: CalendarApiService, useValue: calendarApi },
        { provide: AuthApiService, useValue: authApi },
        { provide: ScheduleAction, useValue: scheduleAction },
        ...provideBonaFeedbackTesting().providers,
      ],
    }).compileComponents();
  });

  it('defaults to Yo with a single calendar for the signed-in trainer', () => {
    const fixture = TestBed.createComponent(SchedulesComponent);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain(SCHEDULES_LITERALS.tabYo);
    expect(text).not.toContain(SCHEDULES_LITERALS.typicalWeek);
    expect(text).not.toContain(SCHEDULES_LITERALS.hoursTotal);
    expect(text).toContain(SCHEDULES_LITERALS.capacityTitle);
    expect(text).toContain('Alex Martin');
    expect(fixture.nativeElement.querySelectorAll('app-bona-calendar').length).toBe(1);
    expect(calendarApi.getTrainer).toHaveBeenCalledWith('trainer-1');
    expect(calendarApi.getTrainers).not.toHaveBeenCalled();
    expect(calendarApi.getScheduleHours).not.toHaveBeenCalled();
    expect(calendarApi.getTrainerSchedules).toHaveBeenCalledWith('trainer-1');
    const resolved = calendarApi.getResolvedSchedules.calls.mostRecent().args[0];
    expect(resolved.trainerId).toBe('trainer-1');
  });

  it('shows hours on one studio calendar and opens an action dialog on slot select', () => {
    authApi.getSession.and.returnValue(
      of(createMockSession({ ...MOCK_ACCOUNTS[0], trainerId: undefined })),
    );
    const fixture = TestBed.createComponent(SchedulesComponent);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain(SCHEDULES_LITERALS.tabEstudio);
    expect(text).toContain(SCHEDULES_LITERALS.hoursTotal);
    expect(text).not.toContain(SCHEDULES_LITERALS.holidaysTitle);
    expect(text).toContain(SCHEDULES_LITERALS.capacityTitle);
    expect(text).toContain('Alex Martin');
    expect(text).toContain('Sam Ortega');
    expect(fixture.nativeElement.querySelectorAll('app-bona-calendar').length).toBe(1);
    expect(fixture.nativeElement.querySelector('app-bona-chip-filter')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-bona-filter-menu')).toBeTruthy();
    expect(calendarApi.getScheduleHours).toHaveBeenCalled();
    expect(calendarApi.getPublicHolidays).toHaveBeenCalled();

    const start = new Date(2026, 8, 21, 8, 0);
    const end = new Date(2026, 8, 21, 14, 0);
    fixture.componentInstance.onSlotSelect({ start, end, allDay: false });
    expect(scheduleAction.open).toHaveBeenCalled();
    const data = scheduleAction.open.calls.mostRecent().args[0];
    expect(data.kind).toBe('createHours');
  });

  it('saves concurrent capacity from the schedules screen', () => {
    const fixture = TestBed.createComponent(SchedulesComponent);
    fixture.detectChanges();

    fixture.componentInstance.onCapacityDraftChange('trainer-1', '3');
    fixture.componentInstance.onSaveCapacity();
    fixture.detectChanges();

    expect(calendarApi.updateTrainer).toHaveBeenCalledWith('trainer-1', {
      name: 'Alex Martin',
      concurrentCapacity: 3,
    });
  });
});
