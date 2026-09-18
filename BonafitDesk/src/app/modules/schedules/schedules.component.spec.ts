import { provideHttpClient } from '@angular/common/http';
import { provideDeskTranslate } from '../../core/i18n/provide-desk-translate';
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
        provideHttpClient(), provideDeskTranslate(),
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

  it('keeps concurrent capacity collapsed until asked', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/horarios', SchedulesComponent);

    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(SCHEDULES_LITERALS.capacitySettings);
    expect(text).not.toContain(SCHEDULES_LITERALS.capacityHint);
    expect(text).not.toContain(SCHEDULES_LITERALS.concurrentCapacity);
    expect(harness.routeNativeElement?.querySelector('.schedules-capacity')).toBeFalsy();

    const toolbar = harness.routeNativeElement?.querySelector('.page-toolbar') as HTMLElement;
    const grid = harness.routeNativeElement?.querySelector('app-bona-grid') as HTMLElement;
    expect(toolbar.nextElementSibling).toBe(grid);
  });

  it('saves concurrent capacity for dirty trainers with one action', async () => {
    calendarApi.updateTrainer.and.callFake((id, payload) =>
      of({ id, name: payload.name, concurrentCapacity: payload.concurrentCapacity }),
    );
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/admin/horarios', SchedulesComponent);

    component.onToggleCapacity();
    harness.fixture.detectChanges();
    expect(harness.routeNativeElement?.querySelector('.schedules-capacity')).toBeTruthy();
    expect(harness.routeNativeElement?.textContent).toContain(SCHEDULES_LITERALS.capacityHint);
    expect(harness.routeNativeElement?.querySelector('.schedules-capacity app-bona-field')).toBeFalsy();

    const toolbar = harness.routeNativeElement?.querySelector('.page-toolbar') as HTMLElement;
    const grid = harness.routeNativeElement?.querySelector('app-bona-grid') as HTMLElement;
    expect(toolbar.nextElementSibling).toBe(grid);

    component.onToggleTrainer('trainer-1');
    harness.fixture.detectChanges();
    expect(harness.routeNativeElement?.querySelector('.schedules-capacity app-bona-field')).toBeTruthy();
    expect(harness.routeNativeElement?.textContent).toContain(SCHEDULES_LITERALS.concurrentCapacity);

    component.onCapacityDraftChange('trainer-1', '2');
    component.onCapacityDraftChange('trainer-2', '3');
    component.onSaveCapacities();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(calendarApi.updateTrainer).toHaveBeenCalledTimes(2);
    expect(calendarApi.updateTrainer).toHaveBeenCalledWith('trainer-1', {
      name: 'Alex Martin',
      concurrentCapacity: 2,
    });
    expect(calendarApi.updateTrainer).toHaveBeenCalledWith('trainer-2', {
      name: 'Sam Ortega',
      concurrentCapacity: 3,
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
