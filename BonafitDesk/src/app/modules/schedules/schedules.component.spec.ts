import { provideHttpClient } from '@angular/common/http';
import { provideDeskTranslate } from '../../core/i18n/provide-desk-translate';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { ApiBusinessError } from '../../core/api-business.error';
import { BonaToast } from '../../components/bona-toast/bona-toast.service';
import { provideBonaFeedbackTesting } from '../../testing/bona-feedback';
import { MOCK_TRAINERS, MOCK_TRAINER_SCHEDULES } from '../../testing/fixtures';
import { CalendarApiService } from '../../services/calendar-api.service';
import { SchedulesComponent } from './schedules.component';
import { SCHEDULES_LITERALS } from './schedules.literals';

describe('SchedulesComponent', () => {
  let calendarApi: jasmine.SpyObj<CalendarApiService>;
  let toast: jasmine.SpyObj<BonaToast>;

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
    const feedback = provideBonaFeedbackTesting();
    toast = feedback.toast;

    await TestBed.configureTestingModule({
      imports: [SchedulesComponent],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideDeskTranslate(),
        provideRouter([{ path: 'admin/horarios', component: SchedulesComponent }]),
        { provide: CalendarApiService, useValue: calendarApi },
        ...feedback.providers,
      ],
    }).compileComponents();
  });

  it('loads schedules folded by trainer', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/horarios', SchedulesComponent);

    expect(calendarApi.getTrainers).toHaveBeenCalled();
    expect(calendarApi.getTrainerSchedules).toHaveBeenCalled();
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(SCHEDULES_LITERALS.title);
    expect(text).toContain('Alex Martin');
    expect(text).toContain('Sam Ortega');
    expect(text).toContain(SCHEDULES_LITERALS.slotCountOther.replace('{{count}}', '5'));
    expect(text).not.toContain(SCHEDULES_LITERALS.weekday1);
    expect(harness.routeNativeElement?.querySelector('app-bona-grid')).toBeFalsy();
    expect(harness.routeNativeElement?.querySelector('.schedules-list')).toBeTruthy();
  });

  it('reveals weekday slots when a trainer is expanded', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/admin/horarios', SchedulesComponent);

    component.onToggleScheduleTrainer('trainer-1');
    harness.fixture.detectChanges();

    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(SCHEDULES_LITERALS.weekday1);
    expect(text).toContain('08:00');
    expect(text).toContain('18:00');
  });

  it('keeps concurrent capacity collapsed until asked', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/horarios', SchedulesComponent);

    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(SCHEDULES_LITERALS.capacitySettings);
    expect(text).not.toContain(SCHEDULES_LITERALS.capacityHint);
    expect(text).not.toContain(SCHEDULES_LITERALS.concurrentCapacity);
    expect(harness.routeNativeElement?.querySelector('.schedules-capacity')).toBeFalsy();
    expect(harness.routeNativeElement?.querySelector('.page-toolbar')).toBeFalsy();
  });

  it('closes concurrent capacity from the panel', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/admin/horarios', SchedulesComponent);

    component.onToggleCapacity();
    harness.fixture.detectChanges();
    const panel = harness.routeNativeElement?.querySelector('.schedules-capacity') as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.textContent).toContain(SCHEDULES_LITERALS.cancel);
    expect(panel.textContent).toContain(SCHEDULES_LITERALS.save);
    expect(panel.querySelector('.schedules-capacity__close')).toBeFalsy();

    const cancel = Array.from(panel.querySelectorAll('button')).find((button) =>
      button.textContent?.includes(SCHEDULES_LITERALS.cancel),
    ) as HTMLButtonElement;
    cancel.click();
    harness.fixture.detectChanges();
    expect(harness.routeNativeElement?.querySelector('.schedules-capacity')).toBeFalsy();
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
    const list = harness.routeNativeElement?.querySelector('.schedules-list') as HTMLElement;
    expect(nested).toBeTruthy();
    expect(list).toBeTruthy();
    expect(nested.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(nested.textContent).toContain(SCHEDULES_LITERALS.newSchedule);
    expect(nested.querySelector('app-bona-form app-bona-button')?.textContent).toContain(
      SCHEDULES_LITERALS.cancel,
    );
    expect(nested.textContent).toContain(SCHEDULES_LITERALS.save);

    component.onEdit('sch-1-1');
    harness.fixture.detectChanges();
    expect(
      (harness.routeNativeElement?.querySelector('.page-nested') as HTMLElement).textContent,
    ).toContain(SCHEDULES_LITERALS.editSchedule);

    component.onCreate();
    harness.fixture.detectChanges();
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

  it('toasts a taken slot and does not leave it on the page after a later save', async () => {
    calendarApi.createTrainerSchedule.and.returnValues(
      throwError(() => new ApiBusinessError('booking.scheduleTaken')),
      of({
        id: 'sch-new',
        trainerId: 'trainer-1',
        weekday: 6,
        startTime: '09:00',
        endTime: '13:00',
      }),
    );
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/admin/horarios', SchedulesComponent);

    component.onCreate();
    component.onSave({
      trainerId: 'trainer-1',
      weekday: '1',
      startTime: '08:00',
      endTime: '18:00',
    });
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(toast.error).toHaveBeenCalledWith(SCHEDULES_LITERALS.errorTaken);
    expect(harness.routeNativeElement?.querySelector('.page-nested')).toBeTruthy();

    component.onSave({
      trainerId: 'trainer-1',
      weekday: '6',
      startTime: '09:00',
      endTime: '13:00',
    });
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();

    expect(harness.routeNativeElement?.querySelector('.page-nested')).toBeFalsy();
    expect(harness.routeNativeElement?.textContent).not.toContain(SCHEDULES_LITERALS.errorTaken);
  });

  it('deletes a weekly slot', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/admin/horarios', SchedulesComponent);

    component.onToggleScheduleTrainer('trainer-1');
    harness.fixture.detectChanges();

    const trainer = Array.from(
      harness.routeNativeElement?.querySelectorAll('.schedules-list__trainer') ?? [],
    ).find((item) => item.textContent?.includes('Alex Martin')) as HTMLElement;
    const deleteButton = trainer.querySelector(
      `.schedules-list__action[aria-label="${SCHEDULES_LITERALS.delete}"]`,
    ) as HTMLButtonElement;
    deleteButton.click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(calendarApi.deleteTrainerSchedule).toHaveBeenCalledWith('sch-1-1');
  });
});
