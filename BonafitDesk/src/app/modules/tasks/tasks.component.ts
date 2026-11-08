import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, switchMap } from 'rxjs';
import {
  BonaBoardColumn,
  BonaBoardComponent,
  BonaBoardItem,
  BonaBoardMove,
} from '../../components/bona-board/bona-board.component';
import { BonaButtonComponent } from '../../components/bona-button/bona-button.component';
import { BonaConfirm } from '../../components/bona-confirm/bona-confirm.service';
import { BonaDialog } from '../../components/bona-dialog/bona-dialog.service';
import { BonaPageComponent } from '../../components/bona-page/bona-page.component';
import { BonaToast } from '../../components/bona-toast/bona-toast.service';
import { LanguageService } from '../../core/i18n/language.service';
import { injectI18n } from '../../core/i18n/inject-i18n';
import { TASK_STATUSES, TaskDto, TaskStatus } from '../../models/task.dto';
import { TasksApiService } from '../../services/tasks-api.service';
import {
  TaskDialogComponent,
  TaskDialogData,
  TaskDialogResult,
} from './task-dialog.component';
import { formatTaskMoment } from './task-time';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [BonaPageComponent, BonaBoardComponent, BonaButtonComponent],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TasksComponent {
  private readonly tasksApi = inject(TasksApiService);
  private readonly dialog = inject(BonaDialog);
  private readonly confirm = inject(BonaConfirm);
  private readonly toast = inject(BonaToast);
  private readonly destroyRef = inject(DestroyRef);
  private readonly language = inject(LanguageService);

  private readonly i18n = injectI18n('tasks');
  get literals() {
    return this.i18n();
  }

  readonly loading = signal(true);
  private readonly tasks = signal<TaskDto[]>([]);

  readonly boardColumns = computed<BonaBoardColumn[]>(() => [
    { id: 'pending', label: this.literals.columnPending },
    { id: 'inProgress', label: this.literals.columnInProgress },
    { id: 'done', label: this.literals.columnDone },
  ]);

  readonly boardItems = computed<BonaBoardItem[]>(() => {
    const locale = this.language.locale();
    return this.tasks().map((task) => ({
      id: task.id,
      columnId: task.status,
      title: task.title,
      meta: this.literals.createdBy
        .replace('{{name}}', task.createdByName)
        .replace('{{date}}', formatTaskMoment(task.createdAt, locale)),
      badge: this.statusLabel(task.status),
    }));
  });

  constructor() {
    this.load();
  }

  onCreate(): void {
    this.openDialog(null);
  }

  onItemClick(item: BonaBoardItem): void {
    const task = this.tasks().find((row) => row.id === item.id);
    if (task) {
      this.openDialog(task);
    }
  }

  onMove(event: BonaBoardMove): void {
    if (!isTaskStatus(event.columnId)) {
      return;
    }
    this.changeStatus(event.item.id, event.columnId);
  }

  private openDialog(task: TaskDto | null): void {
    const ref = this.dialog.open<TaskDialogComponent, TaskDialogData, TaskDialogResult | null>(
      TaskDialogComponent,
      { data: { task } },
    );
    ref
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) {
          return;
        }
        if (result.action === 'delete' && task) {
          this.confirmDelete(task);
          return;
        }
        if (result.action === 'save') {
          this.saveTask(task, result);
        }
      });
  }

  private saveTask(
    task: TaskDto | null,
    result: Extract<TaskDialogResult, { action: 'save' }>,
  ): void {
    const request = task
      ? this.tasksApi.updateTask(task.id, {
          title: result.title,
          description: result.description,
          status: result.status,
        })
      : this.tasksApi.createTask({
          title: result.title,
          description: result.description,
          status: result.status,
        });

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        this.tasks.update((rows) =>
          rows.some((row) => row.id === saved.id)
            ? rows.map((row) => (row.id === saved.id ? saved : row))
            : [saved, ...rows],
        );
        this.toast.success(task ? this.literals.saved : this.literals.created);
      },
      error: () => this.toast.error(this.literals.errorSave),
    });
  }

  private changeStatus(taskId: string, status: TaskStatus): void {
    const task = this.tasks().find((row) => row.id === taskId);
    if (!task || task.status === status) {
      return;
    }
    this.tasksApi
      .updateTask(taskId, { status })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (saved) => {
          this.tasks.update((rows) =>
            rows.map((row) => (row.id === saved.id ? saved : row)),
          );
        },
        error: () => this.toast.error(this.literals.errorSave),
      });
  }

  private confirmDelete(task: TaskDto): void {
    this.confirm
      .open({
        title: this.literals.deleteTitle,
        message: this.literals.deleteMessage,
        confirmLabel: this.literals.delete,
      })
      .pipe(
        filter((ok) => ok),
        switchMap(() => this.tasksApi.deleteTask(task.id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.tasks.update((rows) => rows.filter((row) => row.id !== task.id));
          this.toast.success(this.literals.deleted);
        },
        error: () => this.toast.error(this.literals.errorSave),
      });
  }

  private load(): void {
    this.tasksApi
      .getTasks()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tasks) => {
          this.tasks.set(tasks);
          this.loading.set(false);
        },
        error: () => {
          this.toast.error(this.literals.errorLoad);
          this.loading.set(false);
        },
      });
  }

  private statusLabel(status: TaskStatus): string {
    if (status === 'inProgress') {
      return this.literals.statusInProgress;
    }
    if (status === 'done') {
      return this.literals.statusDone;
    }
    return this.literals.statusPending;
  }
}

function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus);
}
