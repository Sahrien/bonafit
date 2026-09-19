import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  WritableSignal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIcon } from '@angular/material/icon';
import { filter, forkJoin, switchMap } from 'rxjs';
import { BonaButtonComponent } from '../../components/bona-button/bona-button.component';
import { BonaConfirm } from '../../components/bona-confirm/bona-confirm.service';
import { BonaFieldComponent } from '../../components/bona-field/bona-field.component';
import { BonaFieldDefinition, BonaFieldOption } from '../../components/bona-field/bona-field.definition';
import { BonaFormComponent, BonaFormValue } from '../../components/bona-form/bona-form.component';
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

interface ScheduleSlotView {
  id: string;
  startTime: string;
  endTime: string;
}

interface ScheduleDayView {
  weekday: number;
  weekdayLabel: string;
  slots: ScheduleSlotView[];
}

interface TrainerScheduleGroup {
  trainerId: string;
  trainerName: string;
  slotCount: number;
  days: ScheduleDayView[];
}

@Component({
  selector: 'app-schedules',
  standalone: true,
  imports: [BonaPageComponent, BonaButtonComponent, BonaFormComponent, BonaFieldComponent, MatIcon],
  templateUrl: './schedules.component.html',
  styleUrl: './schedules.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulesComponent {
  private readonly calendarApi = inject(CalendarApiService);
  private readonly confirm = inject(BonaConfirm);
  private readonly toast = inject(BonaToast);
  private readonly destroyRef = inject(DestroyRef);

  private readonly i18n = injectI18n('schedules');
  get literals() {
    return this.i18n();
  }
  readonly loading = signal(true);
  readonly error = signal('');
  readonly formOpen = signal(false);
  readonly capacityOpen = signal(false);
  readonly formValue = signal<BonaFormValue>({ ...EMPTY_FORM });
  private readonly editingId = signal<string | null>(null);
  private readonly trainers = signal<TrainerDto[]>([]);
  private readonly schedules = signal<TrainerScheduleDto[]>([]);
  private readonly openTrainerIds = signal<ReadonlySet<string>>(new Set());
  private readonly openScheduleTrainerIds = signal<ReadonlySet<string>>(new Set());
  private readonly capacityDrafts = signal<Record<string, string>>({});

  readonly catalogTrainers = computed(() => this.trainers());

  readonly scheduleFormTitle = computed(() => {
    const id = this.editingId();
    return !id || id === NEW_ID ? this.literals.newSchedule : this.literals.editSchedule;
  });

  readonly weekdayOptions = computed<BonaFieldOption[]>(() =>
    [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
      value: String(weekday),
      label: this.weekdayLabel(weekday),
    })),
  );

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

  readonly trainerGroups = computed<TrainerScheduleGroup[]>(() => {
    const trainers = this.trainers();
    const byTrainer = new Map<string, TrainerScheduleDto[]>();
    for (const row of this.schedules()) {
      const list = byTrainer.get(row.trainerId) ?? [];
      list.push(row);
      byTrainer.set(row.trainerId, list);
    }

    const orderedIds = [
      ...trainers.map((trainer) => trainer.id).filter((id) => byTrainer.has(id)),
      ...[...byTrainer.keys()].filter((id) => !trainers.some((trainer) => trainer.id === id)),
    ];

    return orderedIds.map((id) => {
      const trainer = trainers.find((item) => item.id === id);
      const slots = byTrainer.get(id) ?? [];
      const daysMap = new Map<number, TrainerScheduleDto[]>();
      for (const slot of slots) {
        const list = daysMap.get(slot.weekday) ?? [];
        list.push(slot);
        daysMap.set(slot.weekday, list);
      }
      const days = [...daysMap.keys()]
        .sort((a, b) => a - b)
        .map((weekday) => ({
          weekday,
          weekdayLabel: this.weekdayLabel(weekday),
          slots: (daysMap.get(weekday) ?? [])
            .slice()
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
            .map((slot) => ({ id: slot.id, startTime: slot.startTime, endTime: slot.endTime })),
        }));
      return {
        trainerId: id,
        trainerName: trainer?.name ?? id,
        slotCount: slots.length,
        days,
      };
    });
  });

  constructor() {
    this.load();
  }

  onCreate(): void {
    this.editingId.set(NEW_ID);
    this.formValue.set({
      ...EMPTY_FORM,
      trainerId: this.trainers()[0]?.id || '',
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
        this.error.set('');
        this.toast.success(this.literals.saved);
        this.formOpen.set(false);
        this.editingId.set(null);
        this.loadSchedules();
      },
      error: (error) => this.toast.error(this.messageFor(error)),
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

  onCloseCapacity(): void {
    this.capacityOpen.set(false);
  }

  isTrainerOpen(trainerId: string): boolean {
    return this.openTrainerIds().has(trainerId);
  }

  onToggleTrainer(trainerId: string): void {
    this.toggleId(this.openTrainerIds, trainerId);
  }

  isScheduleTrainerOpen(trainerId: string): boolean {
    return this.openScheduleTrainerIds().has(trainerId);
  }

  onToggleScheduleTrainer(trainerId: string): void {
    this.toggleId(this.openScheduleTrainerIds, trainerId);
  }

  slotCountLabel(count: number): string {
    return count === 1
      ? this.literals.slotCountOne
      : this.literals.slotCountOther.replace('{{count}}', String(count));
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
        error: () => this.toast.error(this.literals.errorSave),
      });
  }

  onEdit(id: string): void {
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
  }

  onDelete(id: string): void {
    this.deleteSchedule(id);
  }

  private toggleId(store: WritableSignal<ReadonlySet<string>>, trainerId: string): void {
    store.update((ids) => {
      const next = new Set(ids);
      if (next.has(trainerId)) {
        next.delete(trainerId);
      } else {
        next.add(trainerId);
      }
      return next;
    });
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
