import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, forkJoin } from 'rxjs';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { BonaButtonComponent } from '../../components/bona-button/bona-button.component';
import { BonaConfirm } from '../../components/bona-confirm/bona-confirm.service';
import { BonaPageComponent } from '../../components/bona-page/bona-page.component';
import { BonaToast } from '../../components/bona-toast/bona-toast.service';
import {
  BonaCalendarComponent,
  BonaCalendarEvent,
  BonaCalendarSlotSelect,
  BonaCalendarView,
} from '../../components/bona-calendar/bona-calendar.component';
import { BonaTabItem, BonaTabsComponent } from '../../components/bona-tabs/bona-tabs.component';
import { BonaFieldDefinition, BonaFieldOption } from '../../components/bona-field/bona-field.definition';
import { BonaFormComponent, BonaFormValue } from '../../components/bona-form/bona-form.component';
import { ApiBusinessError } from '../../core/api-business.error';
import { addMinutes, canAdminCancelAppointment, isBonoUsable, isGiftCredit, pickPreferredBono } from '../../core/booking';
import { AppointmentDto, AppointmentStatus, AppointmentWriteDto } from '../../models/appointment.dto';
import { BonoDto } from '../../models/bono.dto';
import { BookingSettingsDto } from '../../models/booking-settings.dto';
import { ClientBonoDto } from '../../models/client-bono.dto';
import { ClientDto } from '../../models/client.dto';
import { ServiceDto } from '../../models/service.dto';
import { TrainerDto } from '../../models/trainer.dto';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { CalendarApiService } from '../../services/calendar-api.service';
import { ClientsApiService } from '../../services/clients-api.service';
import { ServicesApiService } from '../../services/services-api.service';
import { BrandThemeService } from '../../core/brand-theme.service';
import { injectI18n } from '../../core/i18n/inject-i18n';
import { LanguageService } from '../../core/i18n/language.service';
import { fromDatetimeLocalValue, toDatetimeLocalValue } from './calendar-datetime';

const EMPTY_FORM: BonaFormValue = {
  trainerId: '',
  clientId: '',
  serviceId: '',
  clientBonoId: '',
  startsAt: '',
  endsAt: '',
  location: '',
  status: 'confirmed',
  notes: '',
};

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  pending: 'var(--bona-color-warning)',
  confirmed: 'var(--bona-color-success)',
  completed: 'color-mix(in srgb, var(--bona-color-text-muted) 55%, var(--bona-color-surface))',
  cancelled: 'color-mix(in srgb, var(--bona-color-text-muted) 40%, var(--bona-color-surface))',
};

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    BonaPageComponent,
    BonaCalendarComponent,
    BonaTabsComponent,
    BonaFormComponent,
    BonaButtonComponent,
    MatIconButton,
    MatIcon,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
  ],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarComponent {
  private readonly calendarApi = inject(CalendarApiService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly servicesApi = inject(ServicesApiService);
  private readonly router = inject(Router);
  private readonly confirm = inject(BonaConfirm);
  private readonly toast = inject(BonaToast);
  private readonly destroyRef = inject(DestroyRef);
  private readonly brandTheme = inject(BrandThemeService);
  readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);

  private readonly i18n = injectI18n('calendar');
  get literals() {
    return this.i18n();
  }
  readonly subtitle = computed(() =>
    this.literals.subtitle.replace('{{studio}}', this.brandTheme.studioName()),
  );
  readonly viewTabs = computed<BonaTabItem[]>(() => [
    { id: 'week', label: this.literals.week },
    { id: 'day', label: this.literals.day },
  ]);
  readonly view = signal<BonaCalendarView>('week');
  readonly selectedTrainerIds = signal<string[]>([]);
  readonly focusDate = signal(new Date());
  readonly loading = signal(true);
  readonly formOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly formValue = signal<BonaFormValue>({ ...EMPTY_FORM });
  private readonly formBaseline = signal<BonaFormValue>({ ...EMPTY_FORM });

  private readonly trainers = signal<TrainerDto[]>([]);
  private readonly clients = signal<ClientDto[]>([]);
  private readonly services = signal<ServiceDto[]>([]);
  private readonly bonos = signal<BonoDto[]>([]);
  private readonly clientBonos = signal<ClientBonoDto[]>([]);
  private readonly appointments = signal<AppointmentDto[]>([]);
  private readonly settings = signal<BookingSettingsDto | null>(null);

  readonly catalogTrainers = computed(() => this.trainers());

  readonly visibleTrainers = computed(() => {
    const selected = this.selectedTrainerIds();
    const trainers = this.trainers();
    if (!selected.length) {
      return trainers;
    }
    return trainers.filter((trainer) => selected.includes(trainer.id));
  });

  readonly allTrainersSelected = computed(() => this.selectedTrainerIds().length === 0);

  readonly dayTitle = computed(() =>
    this.focusDate().toLocaleDateString(this.language.locale(), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
  );

  readonly events = computed(() => {
    const visible = new Set(this.visibleTrainers().map((trainer) => trainer.id));
    return this.appointments()
      .filter((appointment) => appointment.status !== 'cancelled' && visible.has(appointment.trainerId))
      .map((appointment) => this.toCalendarEvent(appointment));
  });

  readonly todayGroups = computed(() => {
    const todayKey = this.dayKey(new Date());
    const visible = new Set(this.visibleTrainers().map((trainer) => trainer.id));
    const rows = this.appointments()
      .filter(
        (appointment) =>
          appointment.status !== 'cancelled' &&
          appointment.status !== 'completed' &&
          visible.has(appointment.trainerId) &&
          this.dayKey(new Date(appointment.startsAt)) === todayKey,
      )
      .sort((left, right) => {
        const byTrainer = this.trainerName(left.trainerId).localeCompare(
          this.trainerName(right.trainerId),
          this.language.locale(),
        );
        if (byTrainer !== 0) {
          return byTrainer;
        }
        return new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime();
      });
    const groups: {
      trainerId: string;
      trainerName: string;
      items: { id: string; time: string; title: string; status: string; statusKey: AppointmentStatus }[];
    }[] = [];
    for (const appointment of rows) {
      let group = groups.find((item) => item.trainerId === appointment.trainerId);
      if (!group) {
        group = {
          trainerId: appointment.trainerId,
          trainerName: this.trainerName(appointment.trainerId),
          items: [],
        };
        groups.push(group);
      }
      group.items.push({
        id: appointment.id,
        time: this.formatTime(appointment.startsAt),
        title: this.appointmentTitle(appointment, { includeTrainer: false }),
        status: this.statusLabel(appointment.status),
        statusKey: appointment.status,
      });
    }
    return groups;
  });

  readonly todayCount = computed(() =>
    this.todayGroups().reduce((total, group) => total + group.items.length, 0),
  );

  readonly todayTotalLabel = computed(() => this.formatAppointmentCount(this.todayCount(), true));

  readonly editorTitle = computed(() =>
    this.editingId() ? this.literals.editAppointment : this.literals.newAppointment,
  );

  readonly currentStatus = computed(
    () => (this.formValue()['status'] ?? '') as AppointmentStatus | '',
  );

  readonly canCancel = computed(() => {
    const status = this.currentStatus();
    return status !== '' && canAdminCancelAppointment(status);
  });

  readonly selectedClientId = computed(() => this.formValue()['clientId'] ?? '');

  readonly appointmentFields = computed((): BonaFieldDefinition[] => {
    const serviceId = this.formValue()['serviceId'] ?? '';
    const service = this.services().find((item) => item.id === serviceId);
    return [
      {
        key: 'trainerId',
        label: this.literals.trainer,
        type: 'select',
        required: true,
        options: this.trainers().map((trainer) => ({ value: trainer.id, label: trainer.name })),
      },
      {
        key: 'clientId',
        label: this.literals.client,
        type: 'select',
        required: true,
        options: this.clients().map((client) => ({
          value: client.id,
          label: this.clientLabel(client),
        })),
      },
      {
        key: 'serviceId',
        label: this.literals.service,
        type: 'select',
        required: true,
        options: this.services().map((item) => ({
          value: item.id,
          label: this.serviceLabel(item),
        })),
      },
      {
        key: 'clientBonoId',
        label: this.literals.bono,
        type: 'select',
        options: this.bonoOptions(service),
      },
      {
        key: 'startsAt',
        label: this.literals.startsAt,
        type: 'datetime-local',
        required: true,
      },
      {
        key: 'endsAt',
        label: this.literals.endsAt,
        type: 'datetime-local',
        required: true,
      },
      {
        key: 'location',
        label: this.literals.location,
        type: 'text',
        required: true,
        placeholder: this.literals.locationPlaceholder,
      },
      {
        key: 'status',
        label: this.literals.status,
        type: 'select',
        required: true,
        options: this.statusOptions(),
      },
      {
        key: 'notes',
        label: this.literals.sessionNotes,
        type: 'textarea',
      },
    ];
  });

  constructor() {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 48rem)').matches) {
      this.view.set('day');
    }
    this.loadCatalog();
  }

  trainerCountLabel(count: number): string {
    return this.formatAppointmentCount(count, false);
  }

  onView(view: string): void {
    if (view === 'week' || view === 'day') {
      this.view.set(view);
    }
  }

  selectAllTrainers(): void {
    this.selectedTrainerIds.set([]);
  }

  toggleTrainer(trainerId: string): void {
    const selected = this.selectedTrainerIds();
    if (!selected.length) {
      this.selectedTrainerIds.set([trainerId]);
      return;
    }
    if (selected.includes(trainerId)) {
      this.selectedTrainerIds.set(selected.filter((id) => id !== trainerId));
      return;
    }
    this.selectedTrainerIds.set([...selected, trainerId]);
  }

  isTrainerFilterActive(trainerId: string): boolean {
    const selected = this.selectedTrainerIds();
    return selected.includes(trainerId);
  }

  eventsForTrainer(trainerId: string): BonaCalendarEvent[] {
    return this.events().filter((event) => event.resourceId === trainerId);
  }

  onPrevDay(): void {
    this.shiftFocusDate(-1);
  }

  onNextDay(): void {
    this.shiftFocusDate(1);
  }

  onFocusToday(): void {
    this.focusDate.set(new Date());
  }

  onCreate(): void {
    this.openForm(null, {
      ...EMPTY_FORM,
      trainerId: this.defaultTrainerId(),
      location: this.settings()?.defaultLocation ?? '',
      status: 'confirmed',
    });
  }

  onOpenClient(): void {
    const clientId = this.selectedClientId();
    if (!clientId) {
      return;
    }
    const openFicha = (): void => {
      void this.router.navigateByUrl(`/admin/clients/${clientId}`);
    };
    if (!this.isFormDirty()) {
      openFicha();
      return;
    }
    this.confirm
      .open({
        title: this.literals.confirmLeaveTitle,
        message: this.literals.confirmLeaveMessage,
        confirmLabel: this.literals.confirmLeaveConfirm,
      })
      .pipe(filter((ok) => ok), takeUntilDestroyed(this.destroyRef))
      .subscribe(openFicha);
  }

  onSlotSelect(slot: BonaCalendarSlotSelect): void {
    this.openForm(null, {
      ...EMPTY_FORM,
      trainerId: this.visibleTrainers()[0]?.id ?? this.defaultTrainerId(),
      startsAt: toDatetimeLocalValue(slot.start),
      endsAt: toDatetimeLocalValue(slot.end),
      location: this.settings()?.defaultLocation ?? '',
      status: 'confirmed',
    });
  }

  onSlotSelectForTrainer(trainerId: string, slot: BonaCalendarSlotSelect): void {
    this.openForm(null, {
      ...EMPTY_FORM,
      trainerId,
      startsAt: toDatetimeLocalValue(slot.start),
      endsAt: toDatetimeLocalValue(slot.end),
      location: this.settings()?.defaultLocation ?? '',
      status: 'confirmed',
    });
  }

  onTodayClick(id: string): void {
    const appointment = this.appointments().find((item) => item.id === id);
    if (!appointment) {
      return;
    }
    this.openForm(appointment.id, this.toFormValue(appointment));
    this.loadClientBonos(appointment.clientId);
  }

  onEventClick(event: BonaCalendarEvent): void {
    const appointment = this.appointments().find((item) => item.id === event.id);
    if (!appointment) {
      return;
    }
    this.openForm(appointment.id, this.toFormValue(appointment));
    this.loadClientBonos(appointment.clientId);
  }

  onFormChange(value: BonaFormValue): void {
    const previousClient = this.formValue()['clientId'];
    const nextClient = value['clientId'] ?? '';
    const previousService = this.formValue()['serviceId'];
    const nextService = value['serviceId'] ?? '';
    const previousStart = this.formValue()['startsAt'];
    let next = value;
    if (nextClient !== previousClient || nextService !== previousService) {
      next = {
        ...value,
        clientBonoId: this.defaultClientBonoId(nextClient, nextService),
      };
    }
    if (nextService !== previousService || value['startsAt'] !== previousStart) {
      next = { ...next, endsAt: this.endsAtFor(next['serviceId'] ?? '', next['startsAt'] ?? '', next['endsAt'] ?? '') };
    }
    this.formValue.set(next);
    if (nextClient && nextClient !== previousClient) {
      this.loadClientBonos(nextClient);
    }
    if (!nextClient) {
      this.clientBonos.set([]);
    }
  }

  onCancel(): void {
    this.formOpen.set(false);
    this.editingId.set(null);
  }

  onSubmit(value: BonaFormValue): void {
    this.saveAppointment(value);
  }

  onConfirm(): void {
    this.saveAppointment({ ...this.formValue(), status: 'confirmed' });
  }

  onComplete(): void {
    this.confirm
      .open({
        title: this.literals.confirmCompleteTitle,
        message: this.literals.confirmCompleteMessage,
        confirmLabel: this.literals.complete,
      })
      .pipe(
        filter((ok) => ok),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.saveAppointment({ ...this.formValue(), status: 'completed' }));
  }

  onCancelAppointment(): void {
    if (!this.canCancel()) {
      return;
    }
    this.confirm
      .open({
        title: this.literals.confirmCancelTitle,
        message: this.literals.confirmCancelMessage,
        confirmLabel: this.literals.cancelAppointment,
      })
      .pipe(
        filter((ok) => ok),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.saveAppointment({ ...this.formValue(), status: 'cancelled' }));
  }

  private saveAppointment(value: BonaFormValue): void {
    const payload = this.toWriteDto(value);
    if (!payload) {
      return;
    }
    const id = this.editingId();
    const request = id
      ? this.calendarApi.updateAppointment(id, payload)
      : this.calendarApi.createAppointment(payload);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.formOpen.set(false);
        this.editingId.set(null);
        this.toast.success(this.literals.saved);
        this.loadAppointments();
      },
      error: (error) => this.toast.error(this.messageFor(error)),
    });
  }

  private loadCatalog(): void {
    forkJoin({
      trainers: this.calendarApi.getTrainers(),
      appointments: this.calendarApi.getAppointments(),
      clients: this.clientsApi.getClients(),
      services: this.servicesApi.getServices(),
      bonos: this.servicesApi.getBonos(),
      settings: this.calendarApi.getBookingSettings(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ trainers, appointments, clients, services, bonos, settings }) => {
          this.trainers.set(trainers);
          this.appointments.set(appointments);
          this.clients.set(clients);
          this.services.set(services);
          this.bonos.set(bonos);
          this.settings.set(settings);
          this.loading.set(false);
        },
        error: () => {
          this.toast.error(this.literals.errorLoad);
          this.loading.set(false);
        },
      });
  }

  private loadAppointments(): void {
    this.calendarApi
      .getAppointments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((appointments) => this.appointments.set(appointments));
  }

  private loadClientBonos(clientId: string): void {
    this.clientsApi
      .getClientBonos(clientId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((rows) => this.clientBonos.set(rows));
  }

  private openForm(id: string | null, value: BonaFormValue): void {
    this.editingId.set(id);
    this.formValue.set(value);
    this.formBaseline.set({ ...value });
    this.formOpen.set(true);
    if (!value['clientId']) {
      this.clientBonos.set([]);
    }
  }

  private defaultTrainerId(): string {
    return this.trainers()[0]?.id ?? '';
  }

  private isFormDirty(): boolean {
    return this.formSnapshot(this.formValue()) !== this.formSnapshot(this.formBaseline());
  }

  private formSnapshot(value: BonaFormValue): string {
    const keys = Object.keys(EMPTY_FORM).sort();
    return JSON.stringify(keys.map((key) => value[key] ?? ''));
  }

  private dayKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  private formatTime(value: string): string {
    return new Date(value).toLocaleTimeString(this.language.locale(), {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private formatAppointmentCount(count: number, total: boolean): string {
    if (total) {
      return count === 1
        ? this.literals.todayTotalOne
        : this.literals.todayTotalOther.replace('{{count}}', String(count));
    }
    return count === 1
      ? this.literals.todayTrainerOne
      : this.literals.todayTrainerOther.replace('{{count}}', String(count));
  }

  private clientLabel(client: ClientDto): string {
    return `${client.firstName} ${client.lastName}`.trim();
  }

  private serviceLabel(service: ServiceDto): string {
    return service.name;
  }

  private bonoOptions(service: ServiceDto | undefined): BonaFieldOption[] {
    if (!service) {
      return [];
    }
    const options: BonaFieldOption[] = [];
    const clientId = this.formValue()['clientId'] ?? '';
    const currentId = this.formValue()['clientBonoId'] ?? '';
    const now = new Date();
    let hasUsableGift = false;
    for (const contracted of this.clientBonos()) {
      if (contracted.clientId !== clientId) {
        continue;
      }
      const current = contracted.id === currentId;
      if (!current && !isBonoUsable(contracted, now)) {
        continue;
      }
      const bono = this.bonos().find((item) => item.id === contracted.bonoId);
      if (!bono || bono.serviceId !== service.id) {
        continue;
      }
      if (isGiftCredit(contracted)) {
        hasUsableGift = true;
        options.push({
          value: contracted.id,
          label: `${this.literals.gift} · ${contracted.remainingSessions}`,
        });
        continue;
      }
      const name = bono.sessionCount === 1 ? this.literals.singleSession : bono.name;
      options.push({
        value: contracted.id,
        label: `${name} · ${contracted.remainingSessions}`,
      });
    }
    if (!hasUsableGift) {
      options.unshift({ value: '', label: this.literals.gift });
    }
    return options;
  }

  private defaultClientBonoId(clientId: string, serviceId: string): string {
    const service = this.services().find((item) => item.id === serviceId);
    if (!clientId || !service) {
      return '';
    }
    const now = new Date();
    const matching = this.clientBonos().filter((row) => {
      if (row.clientId !== clientId || !isBonoUsable(row, now)) {
        return false;
      }
      const bono = this.bonos().find((item) => item.id === row.bonoId);
      return bono?.serviceId === service.id;
    });
    const purchased = matching.filter((row) => !isGiftCredit(row));
    return pickPreferredBono(purchased, now)?.id ?? pickPreferredBono(matching, now)?.id ?? '';
  }

  private toCalendarEvent(appointment: AppointmentDto): BonaCalendarEvent {
    const client = this.clients().find((item) => item.id === appointment.clientId);
    const trainer = this.trainers().find((item) => item.id === appointment.trainerId);
    return {
      id: appointment.id,
      title: this.appointmentTitle(appointment),
      start: appointment.startsAt,
      end: appointment.endsAt,
      trainer: trainer?.name,
      client: client ? this.clientLabel(client) : undefined,
      location: appointment.location,
      resourceId: appointment.trainerId,
      color: STATUS_COLORS[appointment.status],
      classNames: [`bona-cal-status-${appointment.status}`],
      interactive: true,
    };
  }

  private appointmentTitle(
    appointment: AppointmentDto,
    options?: { includeTrainer?: boolean },
  ): string {
    const client = this.clients().find((item) => item.id === appointment.clientId);
    const service = this.services().find((item) => item.id === appointment.serviceId);
    const parts = [
      client ? this.clientLabel(client) : appointment.clientId,
      service ? this.serviceLabel(service) : appointment.serviceId,
    ];
    const includeTrainer =
      options?.includeTrainer ?? (this.view() === 'week' && this.visibleTrainers().length > 1);
    if (includeTrainer) {
      parts.push(this.trainerName(appointment.trainerId));
    }
    return parts.join(' · ');
  }

  private trainerName(trainerId: string): string {
    return this.trainers().find((trainer) => trainer.id === trainerId)?.name ?? trainerId;
  }

  private shiftFocusDate(days: number): void {
    const next = new Date(this.focusDate());
    next.setDate(next.getDate() + days);
    this.focusDate.set(next);
  }

  private statusLabel(status: AppointmentStatus): string {
    const labels: Record<AppointmentStatus, string> = {
      pending: this.literals.statusPending,
      confirmed: this.literals.statusConfirmed,
      completed: this.literals.statusCompleted,
      cancelled: this.literals.statusCancelled,
    };
    return labels[status];
  }

  private statusOptions(): BonaFieldOption[] {
    const current = this.currentStatus();
    const options: BonaFieldOption[] = [
      { value: 'pending', label: this.literals.statusPending },
      { value: 'confirmed', label: this.literals.statusConfirmed },
    ];
    if (current === 'completed') {
      options.push({ value: 'completed', label: this.literals.statusCompleted });
    }
    return options;
  }

  private toFormValue(appointment: AppointmentDto): BonaFormValue {
    return {
      trainerId: appointment.trainerId,
      clientId: appointment.clientId,
      serviceId: appointment.serviceId,
      clientBonoId: appointment.clientBonoId ?? '',
      startsAt: toDatetimeLocalValue(appointment.startsAt),
      endsAt: toDatetimeLocalValue(appointment.endsAt),
      location: appointment.location,
      status: appointment.status,
      notes: appointment.notes ?? '',
    };
  }

  private toWriteDto(value: BonaFormValue): AppointmentWriteDto | null {
    const trainerId = value['trainerId'] ?? '';
    const clientId = value['clientId'] ?? '';
    const serviceId = value['serviceId'] ?? '';
    const startsAt = fromDatetimeLocalValue(value['startsAt'] ?? '');
    const endsAt = fromDatetimeLocalValue(value['endsAt'] ?? '');
    const location = (value['location'] ?? '').trim();
    const status = (value['status'] ?? 'confirmed') as AppointmentStatus;
    if (!trainerId || !clientId || !serviceId || !startsAt || !endsAt || !location) {
      this.toast.error(this.literals.errorRequired);
      return null;
    }
    const clientBonoId = value['clientBonoId'] ?? '';
    const payload: AppointmentWriteDto = {
      trainerId,
      clientId,
      serviceId,
      startsAt,
      endsAt,
      location,
      status,
      clientBonoId: clientBonoId || null,
      notes: (value['notes'] ?? '').trim(),
    };
    return payload;
  }

  private endsAtFor(serviceId: string, startsAtLocal: string, currentEnds: string): string {
    const service = this.services().find((item) => item.id === serviceId);
    const startIso = fromDatetimeLocalValue(startsAtLocal);
    if (!service || !startIso) {
      return currentEnds;
    }
    return toDatetimeLocalValue(addMinutes(new Date(startIso), service.durationMinutes));
  }

  private messageFor(error: unknown): string {
    if (error instanceof ApiBusinessError) {
      const key = `calendar.errors.${error.code}`;
      const translated = this.translate.instant(key);
      return translated !== key ? translated : this.literals.errorSave;
    }
    return this.literals.errorSave;
  }
}
