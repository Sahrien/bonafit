import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_PATHS, apiUrl } from '../core/api-url';
import { TasksApi } from '../core/tasks-api';
import { TaskDto, TaskPatchDto, TaskWriteDto } from '../models/task.dto';

@Injectable({ providedIn: 'root' })
export class TasksApiService implements TasksApi {
  private readonly http = inject(HttpClient);

  getTasks(): Observable<TaskDto[]> {
    return this.http.get<TaskDto[]>(apiUrl(API_PATHS.tasks));
  }

  createTask(payload: TaskWriteDto): Observable<TaskDto> {
    return this.http.post<TaskDto>(apiUrl(API_PATHS.tasks), payload);
  }

  updateTask(id: string, payload: TaskPatchDto): Observable<TaskDto> {
    return this.http.patch<TaskDto>(apiUrl(API_PATHS.tasks, id), payload);
  }

  deleteTask(id: string): Observable<void> {
    return this.http.delete<void>(apiUrl(API_PATHS.tasks, id));
  }
}
