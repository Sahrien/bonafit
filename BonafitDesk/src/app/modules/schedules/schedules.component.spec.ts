import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { provideBonaFeedbackTesting } from '../../testing/bona-feedback';
import { MOCK_TRAINERS, MOCK_TRAINER_SCHEDULES } from '../../testing/fixtures';
import { clickGridMenuAction } from '../../testing/grid-menu';
import { CalendarApiService } from '../../services/calendar-api.service';
import { SchedulesComponent } from './schedules.component';
import { SCHEDULES_LITERALS } from './schedules.literals';

describe('SchedulesComponent', () => {
  let calendarApi: jasmine.SpyObj<CalendarApiService>;

  beforeEach(async () => {
    calendarApi = jasmine.createSpyObj('CalendarApiService', [
      'getTrainers',
      'getTrainerSchedules',
      'createTrainerSchedule',
      'updateTrainerSchedule',
      'deleteTrainerSchedule',
    ]);
    calendarApi.getTrainers.and.returnValue(of(MOCK_TRAINERS));
    calendarApi.getTrainerSchedules.and.returnValue(of(MOCK_TRAINER_SCHEDULES));
    calendarApi.createTrainerSchedule.and.returnValue(
      of({
        id: 'sch-new',
        trainerId: 'trainer-1',
        weekday: 6,
        startTime: '09:00',
        endTime: '13:00',
      }),
    );
    calendarApi.deleteTrainerSchedule.and.returnValue(of(void 0));

    await TestBed.configureTestingModule({
      imports: [SchedulesComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([{ path: 'admin/horarios', component: SchedulesComponent }]),
        { provide: CalendarApiService, useValue: calendarApi },
        ...provideBonaFeedbackTesting().providers,
      ],
    }).compileComponents();
  });

  it('loads schedules and shows trainers and weekdays', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/horarios', SchedulesComponent);

    expect(calendarApi.getTrainers).toHaveBeenCalled();
    expect(calendarApi.getTrainerSchedules).toHaveBeenCalled();
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(SCHEDULES_LITERALS.title);
    expect(text).toContain(SCHEDULES_LITERALS.trainer);
    expect(text).toContain(SCHEDULES_LITERALS.weekday);
    expect(text).toContain(SCHEDULES_LITERALS.startTime);
    expect(text).toContain(SCHEDULES_LITERALS.endTime);
    expect(text).toContain('Alex Martin');
    expect(text).toContain(SCHEDULES_LITERALS.weekday1);
    expect(harness.routeNativeElement?.querySelector('app-bona-grid')).toBeTruthy();
  });

  it('creates a weekly slot', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/admin/horarios', SchedulesComponent);

    component.onCreate();
    component.onSave({
      trainerId: 'trainer-1',
      weekday: '6',
      startTime: '09:00',
      endTime: '13:00',
    });
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(calendarApi.createTrainerSchedule).toHaveBeenCalledWith({
      trainerId: 'trainer-1',
      weekday: 6,
      startTime: '09:00',
      endTime: '13:00',
    });
  });

  it('deletes a weekly slot', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/horarios', SchedulesComponent);

    clickGridMenuAction(harness.routeNativeElement, SCHEDULES_LITERALS.delete, {
      rowText: 'Alex Martin',
    });
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(calendarApi.deleteTrainerSchedule).toHaveBeenCalledWith('sch-1-1');
  });
});
