export type TaskStatus = 'pending' | 'inProgress' | 'done';

export const TASK_STATUSES: readonly TaskStatus[] = ['pending', 'inProgress', 'done'];

export interface TaskDto {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface TaskWriteDto {
  title: string;
  description: string;
  status: TaskStatus;
}

export type TaskPatchDto = Partial<TaskWriteDto>;
