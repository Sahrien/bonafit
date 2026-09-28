import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { BonaButtonComponent } from '../../components/bona-button/bona-button.component';
import { BonaDialogLayoutComponent } from '../../components/bona-dialog/bona-dialog-layout.component';
import { BonaFieldDefinition } from '../../components/bona-field/bona-field.definition';
import { BonaFormComponent, BonaFormValue } from '../../components/bona-form/bona-form.component';
import { injectI18n } from '../../core/i18n/inject-i18n';
import { AbsenceReason } from '../../models/schedule.dto';
import {
  ScheduleActionDialogData,
  ScheduleActionResult,
  ScheduleScope,
} from './schedule-action.model';

@Component({
  selector: 'app-schedule-action-dialog',
  standalone: true,
  imports: [BonaDialogLayoutComponent, BonaFormComponent, BonaButtonComponent],
  templateUrl: './schedule-action-dialog.component.html',
  styleUrl: './schedule-action-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleActionDialogComponent {
  readonly data = inject<ScheduleActionDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ScheduleActionDialogComponent, ScheduleActionResult | null>);
  private readonly i18n = injectI18n('schedules');

  get literals() {
    return this.i18n();
  }

  readonly formValue = signal<BonaFormValue>(this.initialValue());

  readonly weekdayLabel = computed(() => this.weekdayName(this.data.weekday));

  readonly title = computed(() => {
    if (this.data.kind === 'createHours') {
      return this.literals.newHours;
    }
    if (this.data.kind === 'createClosed') {
      return this.literals.newClosed;
    }
    if (this.data.kind === 'editAbsence') {
      return this.literals.absenceTitle;
    }
    if (this.data.kind === 'editHoliday') {
      return this.literals.holidayTitle;
    }
    if (this.data.kind === 'moveTemplate') {
      return this.literals.moveTitle.replace('{{weekday}}', this.weekdayLabel());
    }
    return this.literals.windowTitle;
  });

  readonly fields = computed<BonaFieldDefinition[]>(() => {
    if (this.data.kind === 'createHours') {
      return [...this.trainerFields(), this.scopeField()];
    }
    if (this.data.kind === 'createClosed') {
      return this.closedFields();
    }
    if (this.data.kind === 'editHoliday') {
      return [{ key: 'name', label: this.literals.holidayName, type: 'text', required: true }];
    }
    return [];
  });

  readonly showForm = computed(() => this.fields().length > 0);

  readonly rangeLabel = computed(() => {
    const end = this.data.endsOn && this.data.endsOn !== this.data.date ? ` – ${this.data.endsOn}` : '';
    if (this.data.startTime && this.data.endTime) {
      return `${this.data.date} · ${this.data.startTime}–${this.data.endTime}${end}`;
    }
    return `${this.data.date}${end}`;
  });

  readonly inherited = computed(() => this.data.source === 'template');

  onFormChange(value: BonaFormValue): void {
    this.formValue.set(value);
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSave(): void {
    const value = this.formValue();
    if (this.data.kind === 'createHours') {
      const trainerId = value['trainerId'] || this.data.trainerId;
      const scope = (value['scope'] as ScheduleScope) || 'thisDay';
      if (!trainerId || !this.data.startTime || !this.data.endTime) {
        return;
      }
      this.dialogRef.close({
        action: 'createHours',
        trainerId,
        scope,
        date: this.data.date,
        startTime: this.data.startTime,
        endTime: this.data.endTime,
      });
      return;
    }
    if (this.data.kind === 'createClosed') {
      const closedKind = this.data.mode === 'yo' ? 'absence' : value['closedKind'] || 'absence';
      if (closedKind === 'holiday') {
        const name = (value['name'] ?? '').trim();
        if (!name) {
          return;
        }
        this.dialogRef.close({ action: 'createHoliday', date: this.data.date, name });
        return;
      }
      const trainerId = value['trainerId'] || this.data.trainerId;
      const reason = (value['reason'] as AbsenceReason) || 'vacation';
      if (!trainerId) {
        return;
      }
      this.dialogRef.close({
        action: 'createAbsence',
        trainerId,
        reason,
        startsOn: this.data.date,
        endsOn: this.data.endsOn || this.data.date,
      });
      return;
    }
    if (this.data.kind === 'editHoliday') {
      const name = (value['name'] ?? '').trim();
      if (!name) {
        return;
      }
      this.dialogRef.close({ action: 'saveHoliday', name });
    }
  }

  onDeleteWindow(scope: ScheduleScope): void {
    this.dialogRef.close({ action: 'deleteWindow', scope });
  }

  onRevertDay(): void {
    this.dialogRef.close({ action: 'revertDay' });
  }

  onRequestAbsence(): void {
    this.dialogRef.close({ action: 'requestAbsence' });
  }

  onDeleteAbsence(): void {
    this.dialogRef.close({ action: 'deleteAbsence' });
  }

  onDeleteHoliday(): void {
    this.dialogRef.close({ action: 'deleteHoliday' });
  }

  onApplyMove(scope: ScheduleScope): void {
    this.dialogRef.close({ action: 'applyMove', scope });
  }

  everyWeekdayLabel(): string {
    return this.literals.scopeEveryWeekday.replace('{{weekday}}', this.weekdayLabel());
  }

  deleteEveryLabel(): string {
    return this.literals.deleteEveryWeekday.replace('{{weekday}}', this.weekdayLabel());
  }

  applyEveryLabel(): string {
    return this.literals.applyEveryWeekday.replace('{{weekday}}', this.weekdayLabel());
  }

  private weekdayName(weekday: number): string {
    const labels: Record<number, string> = {
      1: this.literals.weekday1,
      2: this.literals.weekday2,
      3: this.literals.weekday3,
      4: this.literals.weekday4,
      5: this.literals.weekday5,
      6: this.literals.weekday6,
      7: this.literals.weekday7,
    };
    return labels[weekday] ?? '';
  }

  private initialValue(): BonaFormValue {
    if (this.data.kind === 'editHoliday') {
      return { name: this.data.holidayName ?? '' };
    }
    if (this.data.kind === 'createClosed') {
      return {
        closedKind: 'absence',
        trainerId: this.data.trainerId,
        reason: 'vacation',
        name: '',
      };
    }
    return {
      trainerId: this.data.trainerId,
      scope: 'thisDay',
    };
  }

  private trainerFields(): BonaFieldDefinition[] {
    if (this.data.mode !== 'estudio' || this.data.trainers.length < 2) {
      return [];
    }
    return [
      {
        key: 'trainerId',
        label: this.literals.trainer,
        type: 'select',
        required: true,
        options: this.data.trainers.map((row) => ({ value: row.id, label: row.name })),
      },
    ];
  }

  private scopeField(): BonaFieldDefinition {
    return {
      key: 'scope',
      label: this.literals.scopeLabel,
      type: 'radio',
      required: true,
      options: [
        { value: 'thisDay', label: this.literals.scopeThisDay },
        { value: 'everyWeekday', label: this.everyWeekdayLabel() },
      ],
    };
  }

  private closedFields(): BonaFieldDefinition[] {
    const value = this.formValue();
    const closedKind = this.data.mode === 'yo' ? 'absence' : value['closedKind'] || 'absence';
    const fields: BonaFieldDefinition[] = [];
    if (this.data.mode === 'estudio') {
      fields.push({
        key: 'closedKind',
        label: this.literals.closedKind,
        type: 'radio',
        required: true,
        options: [
          { value: 'absence', label: this.literals.kindAbsence },
          { value: 'holiday', label: this.literals.kindHoliday },
        ],
      });
    }
    if (closedKind === 'holiday') {
      fields.push({ key: 'name', label: this.literals.holidayName, type: 'text', required: true });
      return fields;
    }
    fields.push(...this.trainerFields());
    fields.push({
      key: 'reason',
      label: this.literals.absenceReason,
      type: 'select',
      required: true,
      options: [
        { value: 'vacation', label: this.literals.reasonVacation },
        { value: 'personal', label: this.literals.reasonPersonal },
        { value: 'sick', label: this.literals.reasonSick },
        { value: 'unknown', label: this.literals.reasonUnknown },
      ],
    });
    return fields;
  }
}
