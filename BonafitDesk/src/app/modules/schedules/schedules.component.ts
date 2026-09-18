import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIcon } from '@angular/material/icon';
import { filter, forkJoin, switchMap } from 'rxjs';
import { BonaButtonComponent } from '../../components/bona-button/bona-button.component';
import { BonaConfirm } from '../../components/bona-confirm/bona-confirm.service';
import { BonaFieldComponent } from '../../components/bona-field/bona-field.component';
import { BonaFieldDefinition, BonaFieldOption } from '../../components/bona-field/bona-field.definition';
import { BonaFormComponent, BonaFormValue } from '../../components/bona-form/bona-form.component';
import {
  BonaGridAction,
  BonaGridActionEvent,
  BonaGridColumn,
  BonaGridComponent,
} from '../../components/bona-grid/bona-grid.component';
import { BonaPageComponent } from '../../components/bona-page/bona-page.component';
import { BonaToast } from '../../components/bona-toast/bona-toast.service';
import { ApiBusinessError } from '../../core/api-business.error';
import { TrainerScheduleDto, TrainerScheduleWriteDto } from '../../models/trainer-schedule.dto';
import { TrainerDto, TrainerWriteDto } from '../../models/trainer.dto';
import { CalendarApiService } from '../../services/calendar-api.service';
import { injectI18n } from '../../core/i18n/inject-i18n';

const NEW_ID = 'new';
const EMPTY_FORM: BonaFormValue = {
  trainerId: '',
  weekday: '1',
  startTime: '08:00',
  endTime: '18:00',
};

@Component({
  selector: 'app-schedules',
  standalone: true,
  imports: [
    BonaPageComponent,
    BonaGridComponent,
    BonaButtonComponent,
    BonaFormComponent,
    BonaFieldComponent,
    MatIcon,
  ],
  templateUrl: './schedules.component.html',
  styleUrl: './schedules.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulesComponent {
  private readonly calendarApi = inject(CalendarApiService);
  private readonly confirm = inject(BonaConfirm);
  private readonly toast = inject(BonaToast);
  private readonly destroyRef = inject(DestroyRef);

  private readonly i18n = injectI18n<Record<string, string>>('schedules');
  get literals() {
    return this.i18n();
  }
  readonly loading = signal(true);
  readonly error = signal('');
  readonly formOpen = signal(false);
  readonly capacityOpen = signal(false);
  readonly filterValue = signal<BonaFormValue>({ trainerId: '' });
  readonly formValue = signal<BonaFormValue>({ ...EMPTY_FORM });
  private readonly editingId = signal<string | null>(null);
  private readonly trainers = signal<TrainerDto[]>([]);
  private readonly schedules = signal<TrainerScheduleDto[]>([]);
  private readonly openTrainerIds = signal<ReadonlySet<string>>(new Set());
  private readonly capacityDrafts = signal<Record<string, string>>({});

  readonly catalogTrainers = computed(() => this.trainers());

  readonly weekdayOptions = computed<BonaFieldOption[]>(() =>
    [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
      value: String(weekday),
      label: this.weekdayLabel(weekday),
    })),
  );

  readonly columns = computed<BonaGridColumn[]>(() => [
    { field: 'trainerLabel', header: this.literals.trainer },
    { field: 'weekdayLabel', header: this.literals.weekday },
    { field: 'startTime', header: this.literals.startTime },
    { field: 'endTime', header: this.literals.endTime },
  ]);

  readonly actions = computed<BonaGridAction[]>(() => [
    { label: this.literals.edit, action: 'edit' },
    { label: this.literals.delete, action: 'delete' },
  ]);

  readonly filterFields = computed((): BonaFieldDefinition[] => [
    {
      key: 'trainerId',
      label: this.literals.trainer,
      type: 'select',
      options: [
        { value: '', label: this.literals.allTrainers },
        ...this.trainers().map((trainer) => ({ value: trainer.id, label: trainer.name })),
      ],
    },
  ]);

  readonly formFields = computed((): BonaFieldDefinition[] => [
    {
      key: 'trainerId',
      label: this.literals.trainer,
      type: 'select',
      required: true,
      options: this.trainers().map((trainer) => ({ value: trainer.id, label: trainer.name })),
    },
    {
      key: 'weekday',
      label: this.literals.weekday,
      type: 'select',
      required: true,
      options: this.weekdayOptions(),
    },
    { key: 'startTime', label: this.literals.startTime, type: 'time', required: true },
    { key: 'endTime', label: this.literals.endTime, type: 'time', required: true },
  ]);

  readonly capacityField = computed<BonaFieldDefinition>(() => ({
    key: 'concurrentCapacity',
    label: this.literals.concurrentCapacity,
    type: 'number',
    required: true,
  }));

  readonly rows = computed(() => {
    const trainerId = this.filterValue()['trainerId'] ?? '';
    return this.schedules()
      .filter((row) => !trainerId || row.trainerId === trainerId)
      .map((row) => ({
        ...row,
        trainerLabel: this.trainers().find((trainer) => trainer.id === row.trainerId)?.name ?? row.trainerId,
        weekdayLabel: this.weekdayLabel(row.weekday),
      }));
  });

  constructor() {
    this.load();
  }

  onFilterChange(value: BonaFormValue): void {
    this.filterValue.set(value);
  }

  onCreate(): void {
    this.editingId.set(NEW_ID);
    this.formValue.set({
      ...EMPTY_FORM,
      trainerId: this.filterValue()['trainerId'] || this.trainers()[0]?.id || '',
    });
    this.error.set('');
    this.formOpen.set(true);
  }

  onFormChange(value: BonaFormValue): void {
    this.formValue.set(value);
  }

  onSave(value: BonaFormValue): void {
    const payload = this.toWriteDto(value);
    if (!payload) {
      return;
    }
    const id = this.editingId();
    const request =
      !id || id === NEW_ID
        ? this.calendarApi.createTrainerSchedule(payload)
        : this.calendarApi.updateTrainerSchedule(id, payload);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success(this.literals.saved);
        this.formOpen.set(false);
        this.editingId.set(null);
        this.loadSchedules();
      },
      error: (error) => this.error.set(this.messageFor(error)),
    });
  }

  onCancel(): void {
    this.formOpen.set(false);
    this.editingId.set(null);
    this.error.set('');
  }

  onToggleCapacity(): void {
    this.capacityOpen.update((open) => !open);
  }

  isTrainerOpen(trainerId: string): boolean {
    return this.openTrainerIds().has(trainerId);
  }

  onToggleTrainer(trainerId: string): void {
    this.openTrainerIds.update((ids) => {
      const next = new Set(ids);
      if (next.has(trainerId)) {
        next.delete(trainerId);
      } else {
        next.add(trainerId);
      }
      return next;
    });
  }

  capacityDraft(trainer: TrainerDto): string {
    return this.capacityDrafts()[trainer.id] ?? `${trainer.concurrentCapacity}`;
  }

  onCapacityDraftChange(trainerId: string, value: string): void {
    this.capacityDrafts.update((drafts) => ({ ...drafts, [trainerId]: value }));
  }

  onSaveCapacities(): void {
    const dirty: { id: string; payload: TrainerWriteDto }[] = [];
    for (const trainer of this.trainers()) {
      const payload = this.toTrainerWrite(trainer, this.capacityDraft(trainer));
      if (!payload) {
        return;
      }
      if (payload.concurrentCapacity !== trainer.concurrentCapacity) {
        dirty.push({ id: trainer.id, payload });
      }
    }
    this.error.set('');
    if (dirty.length === 0) {
      this.toast.success(this.literals.capacitySaved);
      return;
    }
    forkJoin(dirty.map((item) => this.calendarApi.updateTrainer(item.id, item.payload)))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          const byId = new Map(updated.map((row) => [row.id, row]));
          const trainers = this.trainers().map((row) => byId.get(row.id) ?? row);
          this.trainers.set(trainers);
          this.capacityDrafts.set(this.draftsFromTrainers(trainers));
          this.toast.success(this.literals.capacitySaved);
        },
        error: () => this.error.set(this.literals.errorSave),
      });
  }

  onRowAction(event: BonaGridActionEvent<Record<string, unknown>>): void {
    const id = String(event.item['id'] ?? '');
    if (event.action === 'edit') {
      const row = this.schedules().find((item) => item.id === id);
      if (!row) {
        return;
      }
      this.editingId.set(row.id);
      this.formValue.set({
        trainerId: row.trainerId,
        weekday: String(row.weekday),
        startTime: row.startTime,
        endTime: row.endTime,
      });
      this.error.set('');
      this.formOpen.set(true);
      return;
    }
    if (event.action === 'delete' && id) {
      this.deleteSchedule(id);
    }
  }

  private deleteSchedule(id: string): void {
    this.confirm
      .open({
        title: this.literals.confirmDeleteTitle,
        message: this.literals.confirmDeleteMessage,
        confirmLabel: this.literals.delete,
      })
      .pipe(
        filter((ok) => ok),
        switchMap(() => this.calendarApi.deleteTrainerSchedule(id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          if (this.editingId() === id) {
            this.formOpen.set(false);
            this.editingId.set(null);
          }
          this.toast.success(this.literals.deleted);
          this.loadSchedules();
        },
        error: () => this.toast.error(this.literals.errorSave),
      });
  }

  private load(): void {
    forkJoin({
      trainers: this.calendarApi.getTrainers(),
      schedules: this.calendarApi.getTrainerSchedules(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ trainers, schedules }) => {
          this.trainers.set(trainers);
          this.capacityDrafts.set(this.draftsFromTrainers(trainers));
          this.schedules.set(schedules);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(this.literals.errorLoad);
          this.loading.set(false);
        },
      });
  }

  private loadSchedules(): void {
    this.calendarApi
      .getTrainerSchedules()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((rows) => this.schedules.set(rows));
  }

  private toWriteDto(value: BonaFormValue): TrainerScheduleWriteDto | null {
    const trainerId = value['trainerId'] ?? '';
    const weekday = Number(value['weekday']);
    const startTime = value['startTime'] ?? '';
    const endTime = value['endTime'] ?? '';
    if (!trainerId || !weekday || !startTime || !endTime) {
      this.error.set(this.literals.errorRequired);
      return null;
    }
    if (startTime >= endTime) {
      this.error.set(this.literals.errorInvalid);
      return null;
    }
    return { trainerId, weekday, startTime, endTime };
  }

  private toTrainerWrite(trainer: TrainerDto, value: string): TrainerWriteDto | null {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      this.error.set(this.literals.errorCapacity);
      return null;
    }
    return { name: trainer.name, concurrentCapacity: parsed };
  }

  private draftsFromTrainers(trainers: TrainerDto[]): Record<string, string> {
    return Object.fromEntries(trainers.map((trainer) => [trainer.id, `${trainer.concurrentCapacity}`]));
  }

  private weekdayLabel(weekday: number): string {
    const labels: Record<number, string> = {
      1: this.literals.weekday1,
      2: this.literals.weekday2,
      3: this.literals.weekday3,
      4: this.literals.weekday4,
      5: this.literals.weekday5,
      6: this.literals.weekday6,
      7: this.literals.weekday7,
    };
    return labels[weekday] ?? String(weekday);
  }

  private messageFor(error: unknown): string {
    if (error instanceof ApiBusinessError) {
      if (error.code === 'booking.invalidSchedule') {
        return this.literals.errorInvalid;
      }
      if (error.code === 'booking.scheduleTaken') {
        return this.literals.errorTaken;
      }
    }
    return this.literals.errorSave;
  }
}
