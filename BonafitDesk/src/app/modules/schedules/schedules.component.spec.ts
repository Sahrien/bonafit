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
      'updateTrainer',
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
    calendarApi.updateTrainer.and.returnValue(of({ ...MOCK_TRAINERS[0], concurrentCapacity: 2 }));

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

  it('saves concurrent capacity for a trainer', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/admin/horarios', SchedulesComponent);
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(SCHEDULES_LITERALS.capacityTitle);
    expect(text).toContain(SCHEDULES_LITERALS.concurrentCapacity);

    component.onSaveCapacity(MOCK_TRAINERS[0], { concurrentCapacity: '2' });
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(calendarApi.updateTrainer).toHaveBeenCalledWith('trainer-1', {
      name: 'Alex Martin',
      concurrentCapacity: 2,
    });
  });

  it('creates a weekly slot', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/admin/horarios', SchedulesComponent);

    component.onCreate();
    harness.fixture.detectChanges();
    const nested = harness.routeNativeElement?.querySelector('.page-nested') as HTMLElement;
    const grid = harness.routeNativeElement?.querySelector('app-bona-grid') as HTMLElement;
    expect(nested).toBeTruthy();
    expect(grid).toBeTruthy();
    expect(nested.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

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
