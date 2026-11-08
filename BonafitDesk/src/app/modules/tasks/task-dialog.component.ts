import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { BonaButtonComponent } from '../../components/bona-button/bona-button.component';
import { BonaDialogLayoutComponent } from '../../components/bona-dialog/bona-dialog-layout.component';
import { BonaFieldDefinition } from '../../components/bona-field/bona-field.definition';
import { BonaFormComponent, BonaFormValue } from '../../components/bona-form/bona-form.component';
import { injectI18n } from '../../core/i18n/inject-i18n';
import { LanguageService } from '../../core/i18n/language.service';
import { TaskDto, TaskStatus } from '../../models/task.dto';
import { formatTaskMoment } from './task-time';

export interface TaskDialogData {
  task: TaskDto | null;
}

export type TaskDialogResult =
  | {
      action: 'save';
      title: string;
      description: string;
      status: TaskStatus;
    }
  | { action: 'delete' };

@Component({
  selector: 'app-task-dialog',
  standalone: true,
  imports: [BonaDialogLayoutComponent, BonaFormComponent, BonaButtonComponent],
  templateUrl: './task-dialog.component.html',
  styleUrl: './task-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskDialogComponent {
  readonly data = inject<TaskDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<TaskDialogComponent, TaskDialogResult | null>);
  private readonly language = inject(LanguageService);
  private readonly i18n = injectI18n('tasks');

  get literals() {
    return this.i18n();
  }

  readonly formValue = signal<BonaFormValue>(this.initialValue());
  readonly title = computed(() =>
    this.data.task ? this.literals.editTitle : this.literals.newTitle,
  );
  readonly openedBy = computed(() => {
    const task = this.data.task;
    if (!task) {
      return '';
    }
    return this.literals.createdBy
      .replace('{{name}}', task.createdByName)
      .replace('{{date}}', formatTaskMoment(task.createdAt, this.language.locale()));
  });

  readonly fields = computed<BonaFieldDefinition[]>(() => [
    {
      key: 'title',
      label: this.literals.titleField,
      type: 'text',
      placeholder: this.literals.titlePlaceholder,
      required: true,
    },
    {
      key: 'description',
      label: this.literals.descriptionField,
      type: 'textarea',
      placeholder: this.literals.descriptionPlaceholder,
    },
    {
      key: 'status',
      label: this.literals.status,
      type: 'select',
      required: true,
      options: [
        { value: 'pending', label: this.literals.statusPending },
        { value: 'inProgress', label: this.literals.statusInProgress },
        { value: 'done', label: this.literals.statusDone },
      ],
    },
  ]);

  onFormChange(value: BonaFormValue): void {
    this.formValue.set(value);
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSave(): void {
    const value = this.formValue();
    const title = (value['title'] ?? '').trim();
    if (!title) {
      return;
    }
    this.dialogRef.close({
      action: 'save',
      title,
      description: (value['description'] ?? '').trim(),
      status: (value['status'] as TaskStatus) || 'pending',
    });
  }

  onDelete(): void {
    if (this.data.task) {
      this.dialogRef.close({ action: 'delete' });
    }
  }

  private initialValue(): BonaFormValue {
    const task = this.data.task;
    return {
      title: task?.title ?? '',
      description: task?.description ?? '',
      status: task?.status ?? 'pending',
    };
  }
}
