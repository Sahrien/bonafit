import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_PATHS, apiUrl } from '../core/api-url';
import { configureHttpClientTesting } from '../core/http-testing';
import { MOCK_TASKS } from '../testing/fixtures';
import { TaskPatchDto, TaskWriteDto } from '../models/task.dto';
import { TasksApiService } from './tasks-api.service';

describe('TasksApiService', () => {
  let api: TasksApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    http = configureHttpClientTesting();
    api = TestBed.inject(TasksApiService);
  });

  afterEach(() => {
    http.verify();
  });

  it('GET /tasks', async () => {
    const pending = firstValueFrom(api.getTasks());
    const req = http.expectOne({ method: 'GET', url: apiUrl(API_PATHS.tasks) });
    req.flush(MOCK_TASKS);
    expect(await pending).toEqual(MOCK_TASKS);
  });

  it('POST /tasks', async () => {
    const payload: TaskWriteDto = {
      title: 'Nueva tarea',
      description: '',
      status: 'pending',
    };
    const created = { ...payload, ...MOCK_TASKS[0], id: 'task-9', title: payload.title };
    const pending = firstValueFrom(api.createTask(payload));
    const req = http.expectOne({ method: 'POST', url: apiUrl(API_PATHS.tasks) });
    expect(req.request.body).toEqual(payload);
    req.flush(created);
    expect((await pending).id).toBe('task-9');
  });

  it('PATCH /tasks/:id', async () => {
    const payload: TaskPatchDto = { status: 'done' };
    const pending = firstValueFrom(api.updateTask('task-1', payload));
    const req = http.expectOne({
      method: 'PATCH',
      url: apiUrl(API_PATHS.tasks, 'task-1'),
    });
    expect(req.request.body).toEqual(payload);
    req.flush({ ...MOCK_TASKS[0], status: 'done' });
    expect((await pending).status).toBe('done');
  });

  it('DELETE /tasks/:id', async () => {
    const pending = firstValueFrom(api.deleteTask('task-1'));
    const req = http.expectOne({
      method: 'DELETE',
      url: apiUrl(API_PATHS.tasks, 'task-1'),
    });
    req.flush(null);
    expect(await pending).toBeNull();
  });
});
