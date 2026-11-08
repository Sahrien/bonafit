import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { BonaButtonComponent } from '../../components/bona-button/bona-button.component';
import {
  BonaCalendarComponent,
  BonaCalendarEvent,
  BonaCalendarEventDrop,
  BonaCalendarSlotSelect,
  BonaCalendarView,
} from '../../components/bona-calendar/bona-calendar.component';
import { BonaFieldComponent } from '../../components/bona-field/bona-field.component';
import { BonaFieldDefinition } from '../../components/bona-field/bona-field.definition';
import { BonaFilterMenuComponent, BonaFilterMenuItem } from '../../components/bona-filter-menu/bona-filter-menu.component';
import { BonaIconButtonComponent } from '../../components/bona-icon-button/bona-icon-button.component';
import { BonaPageComponent } from '../../components/bona-page/bona-page.component';
import { BonaSummaryCardComponent } from '../../components/bona-summary-card/bona-summary-card.component';
import { BonaTabItem, BonaTabsComponent } from '../../components/bona-tabs/bona-tabs.component';
import { BonaToast } from '../../components/bona-toast/bona-toast.service';
import { ApiBusinessError } from '../../core/api-business.error';
import { isoWeekday, localDateKey, parseLocalDateKey } from '../../core/booking';
import { periodRange } from '../calendar/calendar-range';
import { injectI18n } from '../../core/i18n/inject-i18n';
import { LanguageService } from '../../core/i18n/language.service';
import { AuthUserDto } from '../../models/auth-session.dto';
import {
  PublicHolidayDto,
  ResolvedDayDto,
  ScheduleAbsenceDto,
  ScheduleDateWindowDto,
  ScheduleHoursDto,
} from '../../models/schedule.dto';
import { TrainerScheduleDto } from '../../models/trainer-schedule.dto';
import { TrainerDto } from '../../models/trainer.dto';
import { AuthApiService } from '../../services/auth-api.service';
import { CalendarApiService } from '../../services/calendar-api.service';
import { ScheduleActionDialogData, ScheduleActionResult, ScheduleScope } from './schedule-action.model';
import { ScheduleAction } from './schedule-action.service';
import {
  TRAINER_EVENT_COLORS,
  TRAINER_EVENT_TEXT_COLORS,
  addDays,
  addMonths,
  atDateTime,
  formatHours,
  hhmm,
  inclusiveDateKey,
  parseScheduleEventId,
  rangeQueryForView,
  scheduleEventId,
} from './schedule-dates';

export type SchedulesMode = 'yo' | 'estudio';

@Component({
  selector: 'app-schedules',
  standalone: true,
  imports: [
    BonaPageComponent,
    BonaButtonComponent,
    BonaTabsComponent,
    BonaCalendarComponent,
    BonaIconButtonComponent,
    BonaFilterMenuComponent,
    BonaFieldComponent,
    BonaSummaryCardComponent,
  ],
  templateUrl: './schedules.component.html',
  styleUrl: './schedules.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulesComponent {
  private readonly calendarApi = inject(CalendarApiService);
  private readonly authApi = inject(AuthApiService);
  private readonly scheduleAction = inject(ScheduleAction);
  private readonly toast = inject(BonaToast);
  private readonly destroyRef = inject(DestroyRef);
  readonly language = inject(LanguageService);
  private readonly i18n = injectI18n('schedules');

  get literals() {
    return this.i18n();
  }

  readonly loading = signal(true);
  readonly error = signal('');
  private readonly trainers = signal<TrainerDto[]>([]);
  private readonly templates = signal<TrainerScheduleDto[]>([]);
  private readonly resolved = signal<ResolvedDayDto[]>([]);
  private readonly dateWindows = signal<ScheduleDateWindowDto[]>([]);
  private readonly absences = signal<ScheduleAbsenceDto[]>([]);
  readonly holidays = signal<PublicHolidayDto[]>([]);
  readonly hours = signal<ScheduleHoursDto>({
    days: [],
    totals: [],
    totalMinutes: 0,
    averageMinutesPerDay: 0,
  });
  readonly modeOverride = signal<SchedulesMode | null>(null);
  readonly focusDate = signal(new Date());
  readonly view = signal<BonaCalendarView>('week');
  readonly selectedTrainerIds = signal<string[]>([]);
  private readonly capacityDrafts = signal<Record<string, string>>({});
  private readonly sessionUser = signal<AuthUserDto | null>(null);

  readonly ownTrainerId = computed(() => this.sessionUser()?.trainerId ?? '');
  readonly activeMode = computed<SchedulesMode>(
    () => this.modeOverride() ?? (this.ownTrainerId() ? 'yo' : 'estudio'),
  );
  readonly catalogTrainers = computed(() => this.trainers());

  readonly modeTabs = computed<BonaTabItem[]>(() => [
    { id: 'yo', label: this.literals.tabYo },
    { id: 'estudio', label: this.literals.tabEstudio },
  ]);

  readonly viewTabs = computed<BonaTabItem[]>(() => [
    { id: 'week', label: this.literals.periodWeek },
    { id: 'day', label: this.literals.periodDay },
    { id: 'month', label: this.literals.periodMonth },
  ]);

  readonly trainerFilterItems = computed<BonaFilterMenuItem[]>(() =>
    this.trainers().map((row) => ({ id: row.id, label: row.name })),
  );

  readonly capacityTrainers = computed(() => {
    const selected = this.selectedTrainerIds();
    return selected.length
      ? this.trainers().filter((row) => selected.includes(row.id))
      : this.trainers();
  });

  readonly capacityField = computed<BonaFieldDefinition>(() => ({
    key: 'concurrentCapacity',
    label: this.literals.concurrentCapacity,
    type: 'number',
    required: true,
  }));

  readonly periodTitle = computed(() => {
    const locale = this.language.locale();
    const focus = this.focusDate();
    if (this.view() === 'day') {
      return focus.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
    }
    if (this.view() === 'month') {
      return focus.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    }
    const { start, end } = periodRange('week', focus);
    const last = new Date(end);
    last.setDate(last.getDate() - 1);
    const startLabel = start.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    const endLabel = last.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
    return `${startLabel} – ${endLabel}`;
  });

  readonly events = computed<BonaCalendarEvent[]>(() => {
    const selected = this.selectedTrainerIds();
    const visible = (trainerId: string) => !selected.length || selected.includes(trainerId);
    const events: BonaCalendarEvent[] = [];
    const canEditHoliday = this.activeMode() === 'estudio';

    for (const holiday of this.holidays()) {
      events.push({
        id: scheduleEventId({ kind: 'holiday', holidayId: holiday.id }),
        title: holiday.name,
        start: parseLocalDateKey(holiday.date),
        allDay: true,
        interactive: canEditHoliday,
        startEditable: false,
        textColor: 'var(--bona-color-text)',
        classNames: ['schedule-window--closed'],
      });
    }

    for (const absence of this.absences()) {
      if (!visible(absence.trainerId)) {
        continue;
      }
      events.push({
        id: scheduleEventId({ kind: 'absence', absenceId: absence.id, trainerId: absence.trainerId }),
        title: `${this.trainerName(absence.trainerId)} · ${this.reasonLabel(absence.reason)}`,
        start: parseLocalDateKey(absence.startsOn),
        end: addDays(parseLocalDateKey(absence.endsOn), 1),
        allDay: true,
        color: this.colorForTrainer(absence.trainerId),
        textColor: this.textColorForTrainer(absence.trainerId),
        resourceId: absence.trainerId,
        classNames: ['schedule-window--closed'],
      });
    }

    for (const day of this.resolved()) {
      if (!visible(day.trainerId) || day.source === 'holiday' || day.source === 'absence') {
        continue;
      }
      for (const window of day.windows) {
        const dated = this.dateWindows().find(
          (row) =>
            row.trainerId === day.trainerId &&
            row.date === day.date &&
            row.startTime === window.startTime &&
            row.endTime === window.endTime,
        );
        const weekday = isoWeekday(parseLocalDateKey(day.date));
        const template = this.templates().find(
          (row) =>
            row.trainerId === day.trainerId &&
            row.weekday === weekday &&
            row.startTime === window.startTime &&
            row.endTime === window.endTime,
        );
        const inherited = day.source === 'template';
        const id = dated
          ? scheduleEventId({ kind: 'window', windowId: dated.id, trainerId: day.trainerId })
          : scheduleEventId({
              kind: 'inherited',
              templateId: template?.id ?? '',
              trainerId: day.trainerId,
              date: day.date,
              startTime: window.startTime,
              endTime: window.endTime,
            });
        events.push({
          id,
          title: this.activeMode() === 'estudio' ? this.trainerName(day.trainerId) : `${window.startTime}–${window.endTime}`,
          start: atDateTime(day.date, window.startTime),
          end: atDateTime(day.date, window.endTime),
          color: this.colorForTrainer(day.trainerId),
          textColor: this.textColorForTrainer(day.trainerId),
          resourceId: day.trainerId,
          classNames: inherited ? ['schedule-window--inherited'] : ['schedule-window--override'],
        });
      }
    }
    return events;
  });

  constructor() {
    this.authApi
      .getSession()
      .pipe(takeUntilDestroyed())
      .subscribe((session) => {
        this.sessionUser.set(session?.user ?? null);
        this.load();
      });
  }

  onMode(id: string): void {
    this.modeOverride.set(id === 'yo' ? 'yo' : 'estudio');
    this.selectedTrainerIds.set([]);
    this.load();
  }

  onView(id: string): void {
    this.view.set(id === 'day' || id === 'month' ? id : 'week');
    this.load();
  }

  onFocusToday(): void {
    this.focusDate.set(new Date());
    this.load();
  }

  onPrevPeriod(): void {
    this.shiftFocus(-1);
  }

  onNextPeriod(): void {
    this.shiftFocus(1);
  }

  onTrainerFilter(ids: string[]): void {
    this.selectedTrainerIds.set(ids);
  }

  hoursLabel(minutes: number): string {
    return formatHours(minutes);
  }

  capacityDraft(trainer: TrainerDto): string {
    return this.capacityDrafts()[trainer.id] ?? `${trainer.concurrentCapacity}`;
  }

  onCapacityDraftChange(trainerId: string, value: string): void {
    this.capacityDrafts.update((drafts) => ({ ...drafts, [trainerId]: value }));
  }

  onSaveCapacity(): void {
    const updates: Array<{ trainer: TrainerDto; capacity: number }> = [];
    for (const trainer of this.capacityTrainers()) {
      const parsed = Number(this.capacityDraft(trainer));
      if (!Number.isInteger(parsed) || parsed < 1) {
        this.toast.error(this.literals.errorCapacity);
        return;
      }
      if (parsed !== trainer.concurrentCapacity) {
        updates.push({ trainer, capacity: parsed });
      }
    }
    if (!updates.length) {
      return;
    }
    forkJoin(
      updates.map((item) =>
        this.calendarApi.updateTrainer(item.trainer.id, {
          name: item.trainer.name,
          concurrentCapacity: item.capacity,
        }),
      ),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (saved) => {
          const byId = new Map(saved.map((row) => [row.id, row]));
          this.trainers.update((rows) => rows.map((row) => byId.get(row.id) ?? row));
          this.capacityDrafts.update((drafts) => {
            const next = { ...drafts };
            for (const row of saved) {
              delete next[row.id];
            }
            return next;
          });
          this.toast.success(this.literals.capacitySaved);
        },
        error: () => this.toast.error(this.literals.errorSave),
      });
  }

  onSlotSelect(slot: BonaCalendarSlotSelect): void {
    const date = localDateKey(slot.start);
    if (this.holidays().some((row) => row.date === date) && !slot.allDay) {
      return;
    }
    if (slot.allDay) {
      const range = inclusiveDateKey(slot.start, slot.end, true);
      this.openAction({
        kind: 'createClosed',
        mode: this.activeMode(),
        trainers: this.dialogTrainers(),
        trainerId: this.defaultTrainerId(),
        date: range.startsOn,
        endsOn: range.endsOn,
        weekday: isoWeekday(slot.start),
        canEditHoliday: this.activeMode() === 'estudio',
      });
      return;
    }
    const startTime = hhmm(slot.start);
    const endTime = hhmm(slot.end);
    if (startTime >= endTime) {
      return;
    }
    this.openAction({
      kind: 'createHours',
      mode: this.activeMode(),
      trainers: this.dialogTrainers(),
      trainerId: this.defaultTrainerId(),
      date,
      startTime,
      endTime,
      weekday: isoWeekday(slot.start),
    });
  }

  onEventClick(event: BonaCalendarEvent): void {
    const parsed = parseScheduleEventId(event.id);
    if (!parsed) {
      return;
    }
    if (parsed.kind === 'holiday') {
      if (this.activeMode() !== 'estudio') {
        return;
      }
      const holiday = this.holidays().find((row) => row.id === parsed.holidayId);
      if (!holiday) {
        return;
      }
      this.openAction({
        kind: 'editHoliday',
        mode: 'estudio',
        trainers: this.trainers(),
        trainerId: this.defaultTrainerId(),
        date: holiday.date,
        weekday: isoWeekday(parseLocalDateKey(holiday.date)),
        holidayName: holiday.name,
        canEditHoliday: true,
      });
      return;
    }
    if (parsed.kind === 'absence') {
      const absence = this.absences().find((row) => row.id === parsed.absenceId);
      if (!absence) {
        return;
      }
      this.openAction({
        kind: 'editAbsence',
        mode: this.activeMode(),
        trainers: this.trainers(),
        trainerId: absence.trainerId,
        date: absence.startsOn,
        endsOn: absence.endsOn,
        weekday: isoWeekday(parseLocalDateKey(absence.startsOn)),
      });
      return;
    }
    if (parsed.kind === 'window') {
      const window = this.dateWindows().find((row) => row.id === parsed.windowId);
      if (!window) {
        return;
      }
      const weekday = isoWeekday(parseLocalDateKey(window.date));
      const template = this.templates().find(
        (row) =>
          row.trainerId === window.trainerId &&
          row.weekday === weekday &&
          row.startTime === window.startTime &&
          row.endTime === window.endTime,
      );
      this.openAction({
        kind: 'editWindow',
        mode: this.activeMode(),
        trainers: this.trainers(),
        trainerId: window.trainerId,
        date: window.date,
        startTime: window.startTime,
        endTime: window.endTime,
        weekday,
        source: 'override',
        templateId: template?.id,
      });
      return;
    }
    const weekday = isoWeekday(parseLocalDateKey(parsed.date));
    this.openAction({
      kind: 'editWindow',
      mode: this.activeMode(),
      trainers: this.trainers(),
      trainerId: parsed.trainerId,
      date: parsed.date,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      weekday,
      source: 'template',
      templateId: parsed.templateId || undefined,
    });
  }

  onEventDrop(drop: BonaCalendarEventDrop): void {
    const parsed = parseScheduleEventId(drop.event.id);
    if (!parsed || parsed.kind === 'holiday' || parsed.kind === 'absence') {
      drop.revert();
      return;
    }
    const startTime = hhmm(drop.start);
    const end = drop.end ?? drop.start;
    const endTime = hhmm(end);
    const date = localDateKey(drop.start);
    if (startTime >= endTime) {
      drop.revert();
      return;
    }
    if (parsed.kind === 'window') {
      const current = this.dateWindows().find((row) => row.id === parsed.windowId);
      this.run(
        this.calendarApi.updateScheduleDateWindow(parsed.windowId, {
          trainerId: parsed.trainerId,
          date,
          startTime,
          endTime,
          note: current?.note ?? '',
        }),
        this.literals.saved,
        drop.revert,
      );
      return;
    }
    this.openAction(
      {
        kind: 'moveTemplate',
        mode: this.activeMode(),
        trainers: this.trainers(),
        trainerId: parsed.trainerId,
        date,
        startTime,
        endTime,
        weekday: isoWeekday(drop.start),
        source: 'template',
        templateId: parsed.templateId || undefined,
      },
      drop,
      parsed,
    );
  }

  private openAction(
    data: ScheduleActionDialogData,
    drop?: BonaCalendarEventDrop,
    parsed?: ReturnType<typeof parseScheduleEventId>,
  ): void {
    this.scheduleAction
      .open(data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) {
          drop?.revert();
          return;
        }
        this.applyResult(result, data, drop, parsed ?? null);
      });
  }

  private applyResult(
    result: ScheduleActionResult,
    data: ScheduleActionDialogData,
    drop?: BonaCalendarEventDrop,
    parsed?: ReturnType<typeof parseScheduleEventId> | null,
  ): void {
    if (result.action === 'createHours') {
      if (result.scope === 'everyWeekday') {
        this.run(
          this.calendarApi.createTrainerSchedule({
            trainerId: result.trainerId,
            weekday: isoWeekday(parseLocalDateKey(result.date)),
            startTime: result.startTime,
            endTime: result.endTime,
          }),
          this.literals.saved,
        );
        return;
      }
      this.run(
        this.ensureOverride(result.trainerId, result.date).pipe(
          switchMap(() =>
            this.calendarApi.createScheduleDateWindow({
              trainerId: result.trainerId,
              date: result.date,
              startTime: result.startTime,
              endTime: result.endTime,
              note: '',
            }),
          ),
        ),
        this.literals.saved,
      );
      return;
    }
    if (result.action === 'createAbsence') {
      this.run(
        this.clearDateWindows(result.trainerId, result.startsOn).pipe(
          switchMap(() =>
            this.calendarApi.createScheduleAbsence({
              trainerId: result.trainerId,
              startsOn: result.startsOn,
              endsOn: result.endsOn,
              reason: result.reason,
              note: '',
            }),
          ),
        ),
        this.literals.absenceSaved,
      );
      return;
    }
    if (result.action === 'createHoliday') {
      this.run(
        this.calendarApi.createPublicHoliday({ date: result.date, name: result.name }),
        this.literals.holidaySaved,
      );
      return;
    }
    if (result.action === 'saveHoliday') {
      const holiday = this.holidays().find((row) => row.date === data.date);
      if (!holiday) {
        return;
      }
      this.run(
        this.calendarApi.updatePublicHoliday(holiday.id, { date: holiday.date, name: result.name }),
        this.literals.holidaySaved,
      );
      return;
    }
    if (result.action === 'deleteHoliday') {
      const holiday = this.holidays().find((row) => row.date === data.date);
      if (!holiday) {
        return;
      }
      this.run(this.calendarApi.deletePublicHoliday(holiday.id), this.literals.holidayDeleted);
      return;
    }
    if (result.action === 'deleteAbsence') {
      const absence = this.absences().find(
        (row) => row.trainerId === data.trainerId && row.startsOn === data.date,
      );
      if (!absence) {
        return;
      }
      this.run(this.calendarApi.deleteScheduleAbsence(absence.id), this.literals.absenceDeleted);
      return;
    }
    if (result.action === 'requestAbsence') {
      this.openAction({
        kind: 'createClosed',
        mode: this.activeMode(),
        trainers: this.dialogTrainers(data.trainerId),
        trainerId: data.trainerId,
        date: data.date,
        endsOn: data.date,
        weekday: data.weekday,
        canEditHoliday: this.activeMode() === 'estudio',
      });
      return;
    }
    if (result.action === 'revertDay') {
      this.run(this.clearDateWindows(data.trainerId, data.date), this.literals.reverted);
      return;
    }
    if (result.action === 'deleteWindow') {
      this.deleteWindow(result.scope, data);
      return;
    }
    if (result.action === 'applyMove') {
      this.applyMove(result.scope, data, drop, parsed ?? null);
    }
  }

  private deleteWindow(scope: ScheduleScope, data: ScheduleActionDialogData): void {
    if (scope === 'everyWeekday' && data.templateId) {
      this.run(this.calendarApi.deleteTrainerSchedule(data.templateId), this.literals.deleted);
      return;
    }
    this.run(
      this.ensureOverride(data.trainerId, data.date).pipe(
        switchMap((windows) => {
          const match = windows.find(
            (row) => row.startTime === data.startTime && row.endTime === data.endTime,
          );
          const remaining = windows.filter((row) => row.id !== match?.id);
          const deleteOne = match ? this.calendarApi.deleteScheduleDateWindow(match.id) : of(void 0);
          if (remaining.length > 0 || !match) {
            return deleteOne;
          }
          return deleteOne.pipe(
            switchMap(() =>
              this.calendarApi.createScheduleAbsence({
                trainerId: data.trainerId,
                startsOn: data.date,
                endsOn: data.date,
                reason: 'unknown',
                note: '',
              }),
            ),
          );
        }),
      ),
      this.literals.deleted,
    );
  }

  private applyMove(
    scope: ScheduleScope,
    data: ScheduleActionDialogData,
    drop?: BonaCalendarEventDrop,
    parsed?: ReturnType<typeof parseScheduleEventId> | null,
  ): void {
    if (!data.startTime || !data.endTime) {
      drop?.revert();
      return;
    }
    if (scope === 'everyWeekday' && data.templateId) {
      this.run(
        this.calendarApi.updateTrainerSchedule(data.templateId, {
          trainerId: data.trainerId,
          weekday: data.weekday,
          startTime: data.startTime,
          endTime: data.endTime,
        }),
        this.literals.saved,
        drop?.revert,
      );
      return;
    }
    const originalDate = parsed?.kind === 'inherited' ? parsed.date : data.date;
    this.run(
      this.ensureOverride(data.trainerId, originalDate).pipe(
        switchMap((windows) => {
          const start = parsed?.kind === 'inherited' ? parsed.startTime : data.startTime;
          const end = parsed?.kind === 'inherited' ? parsed.endTime : data.endTime;
          const match = windows.find((row) => row.startTime === start && row.endTime === end);
          if (!match) {
            return this.calendarApi.createScheduleDateWindow({
              trainerId: data.trainerId,
              date: data.date,
              startTime: data.startTime ?? '',
              endTime: data.endTime ?? '',
              note: '',
            });
          }
          return this.calendarApi.updateScheduleDateWindow(match.id, {
            trainerId: data.trainerId,
            date: data.date,
            startTime: data.startTime ?? '',
            endTime: data.endTime ?? '',
            note: match.note,
          });
        }),
      ),
      this.literals.saved,
      drop?.revert,
    );
  }

  private dialogTrainers(lockedId?: string): TrainerDto[] {
    if (lockedId) {
      return this.trainers().filter((row) => row.id === lockedId);
    }
    const selected = this.selectedTrainerIds();
    if (selected.length === 1) {
      return this.trainers().filter((row) => row.id === selected[0]);
    }
    return this.trainers();
  }

  private defaultTrainerId(): string {
    const selected = this.selectedTrainerIds();
    if (selected.length === 1) {
      return selected[0];
    }
    return this.activeMode() === 'yo' ? this.ownTrainerId() : (this.trainers()[0]?.id ?? '');
  }

  private trainerName(trainerId: string): string {
    return this.trainers().find((row) => row.id === trainerId)?.name ?? trainerId;
  }

  private reasonLabel(reason: string): string {
    const labels: Record<string, string> = {
      vacation: this.literals.reasonVacation,
      personal: this.literals.reasonPersonal,
      sick: this.literals.reasonSick,
      unknown: this.literals.reasonUnknown,
      publicHoliday: this.literals.reasonHoliday,
    };
    return labels[reason] ?? this.literals.closedDay;
  }

  private colorForTrainer(trainerId: string): string {
    return TRAINER_EVENT_COLORS[this.trainerColorIndex(trainerId)];
  }

  private textColorForTrainer(trainerId: string): string {
    return TRAINER_EVENT_TEXT_COLORS[this.trainerColorIndex(trainerId)];
  }

  private trainerColorIndex(trainerId: string): number {
    const index = this.trainers().findIndex((row) => row.id === trainerId);
    return Math.max(0, index) % TRAINER_EVENT_COLORS.length;
  }

  private shiftFocus(direction: number): void {
    if (this.view() === 'day') {
      this.focusDate.set(addDays(this.focusDate(), direction));
    } else if (this.view() === 'month') {
      this.focusDate.set(addMonths(this.focusDate(), direction));
    } else {
      this.focusDate.set(addDays(this.focusDate(), direction * 7));
    }
    this.load();
  }

  private ensureOverride(trainerId: string, dateKey: string): Observable<ScheduleDateWindowDto[]> {
    const existing = this.dateWindows().filter((row) => row.trainerId === trainerId && row.date === dateKey);
    if (existing.length > 0) {
      return of(existing);
    }
    const weekday = isoWeekday(parseLocalDateKey(dateKey));
    const templates = this.templates().filter((row) => row.trainerId === trainerId && row.weekday === weekday);
    if (templates.length === 0) {
      return of([]);
    }
    return forkJoin(
      templates.map((row) =>
        this.calendarApi.createScheduleDateWindow({
          trainerId,
          date: dateKey,
          startTime: row.startTime,
          endTime: row.endTime,
          note: '',
        }),
      ),
    );
  }

  private clearDateWindows(trainerId: string, dateKey: string): Observable<unknown> {
    const windows = this.dateWindows().filter((row) => row.trainerId === trainerId && row.date === dateKey);
    if (windows.length === 0) {
      return of(void 0);
    }
    return forkJoin(windows.map((row) => this.calendarApi.deleteScheduleDateWindow(row.id)));
  }

  private run<T>(request: Observable<T>, success: string, revert?: () => void): void {
    this.error.set('');
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success(success);
        this.load();
      },
      error: (error) => {
        revert?.();
        this.toast.error(this.messageFor(error));
      },
    });
  }

  private load(): void {
    const trainerId = this.activeMode() === 'yo' ? this.ownTrainerId() : undefined;
    if (this.activeMode() === 'yo' && !trainerId) {
      this.loading.set(false);
      return;
    }
    const range = rangeQueryForView(this.focusDate(), this.view() === 'month' ? 'month' : this.view());
    this.loading.set(true);
    const trainers$ = trainerId ? this.calendarApi.getTrainer(trainerId) : this.calendarApi.getTrainers();
    forkJoin({
      trainers: trainers$,
      templates: this.calendarApi.getTrainerSchedules(trainerId).pipe(catchError(() => of([] as TrainerScheduleDto[]))),
      resolved: this.calendarApi
        .getResolvedSchedules({ ...range, trainerId })
        .pipe(catchError(() => of([] as ResolvedDayDto[]))),
      dateWindows: this.calendarApi
        .getScheduleDateWindows({ ...range, trainerId })
        .pipe(catchError(() => of([] as ScheduleDateWindowDto[]))),
      absences: this.calendarApi
        .getScheduleAbsences({ ...range, trainerId })
        .pipe(catchError(() => of([] as ScheduleAbsenceDto[]))),
      holidays: this.calendarApi.getPublicHolidays(range).pipe(catchError(() => of([] as PublicHolidayDto[]))),
      hours:
        this.activeMode() === 'estudio'
          ? this.calendarApi.getScheduleHours(range).pipe(
              catchError(() =>
                of({
                  days: [],
                  totals: [],
                  totalMinutes: 0,
                  averageMinutesPerDay: 0,
                } satisfies ScheduleHoursDto),
              ),
            )
          : of({
              days: [],
              totals: [],
              totalMinutes: 0,
              averageMinutesPerDay: 0,
            } satisfies ScheduleHoursDto),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (bundle) => {
          this.trainers.set(Array.isArray(bundle.trainers) ? bundle.trainers : [bundle.trainers]);
          this.templates.set(bundle.templates);
          this.resolved.set(bundle.resolved);
          this.dateWindows.set(bundle.dateWindows);
          this.absences.set(bundle.absences);
          this.holidays.set(bundle.holidays);
          this.hours.set(bundle.hours);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(this.literals.errorLoad);
          this.loading.set(false);
        },
      });
  }

  private messageFor(error: unknown): string {
    if (error instanceof ApiBusinessError) {
      if (error.code === 'booking.invalidSchedule') {
        return this.literals.errorInvalid;
      }
      if (error.code === 'booking.scheduleTaken') {
        return this.literals.errorTaken;
      }
      if (error.code === 'booking.scheduleConflict') {
        return this.literals.errorConflict;
      }
      if (error.code === 'booking.scheduleHasAppointments') {
        return this.literals.errorHasAppointments;
      }
    }
    return this.literals.errorSave;
  }
}
