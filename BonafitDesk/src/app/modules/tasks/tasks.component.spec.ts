import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { provideDeskTranslate } from '../../core/i18n/provide-desk-translate';
import { TasksApiService } from '../../services/tasks-api.service';
import { MOCK_TASKS } from '../../testing/fixtures';
import { provideBonaFeedbackTesting } from '../../testing/bona-feedback';
import { TASKS_LITERALS } from './tasks.literals';
import { TasksComponent } from './tasks.component';

describe('TasksComponent', () => {
  let tasksApi: jasmine.SpyObj<TasksApiService>;

  beforeEach(async () => {
    tasksApi = jasmine.createSpyObj('TasksApiService', [
      'getTasks',
      'createTask',
      'updateTask',
      'deleteTask',
    ]);
    tasksApi.getTasks.and.returnValue(of(MOCK_TASKS));
    tasksApi.updateTask.and.callFake((id, payload) =>
      of({ ...MOCK_TASKS.find((task) => task.id === id)!, ...payload }),
    );

    await TestBed.configureTestingModule({
      imports: [TasksComponent],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideDeskTranslate(),
        provideRouter([{ path: 'admin/tareas', component: TasksComponent }]),
        { provide: TasksApiService, useValue: tasksApi },
        ...provideBonaFeedbackTesting().providers,
      ],
    }).compileComponents();
  });

  it('renders the three kanban columns with opener and date', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/tareas', TasksComponent);

    expect(tasksApi.getTasks).toHaveBeenCalled();
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(TASKS_LITERALS.title);
    expect(text).toContain(TASKS_LITERALS.columnPending);
    expect(text).toContain(TASKS_LITERALS.columnInProgress);
    expect(text).toContain(TASKS_LITERALS.columnDone);
    expect(text).toContain('Revisar bonos caducados');
    expect(text).toContain('Abierta por Alex Martin');
    expect(harness.routeNativeElement?.querySelectorAll('.bona-board__column').length).toBe(3);
  });

  it('updates the status when a card is moved', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/tareas', TasksComponent);
    const component = harness.routeDebugElement?.componentInstance as TasksComponent;

    component.onMove({
      item: { id: 'task-1', columnId: 'pending', title: 'Revisar bonos caducados' },
      columnId: 'done',
    });
    await harness.fixture.whenStable();

    expect(tasksApi.updateTask).toHaveBeenCalledWith('task-1', { status: 'done' });
  });
});
