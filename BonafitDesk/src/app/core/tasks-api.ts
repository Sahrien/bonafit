import { Observable } from 'rxjs';
import { TaskDto, TaskPatchDto, TaskWriteDto } from '../models/task.dto';

export interface TasksApi {
  getTasks(): Observable<TaskDto[]>;
  createTask(payload: TaskWriteDto): Observable<TaskDto>;
  updateTask(id: string, payload: TaskPatchDto): Observable<TaskDto>;
  deleteTask(id: string): Observable<void>;
}
