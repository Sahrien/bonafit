import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { EMPTY, filter, forkJoin, switchMap, take } from 'rxjs';
import { BonaButtonComponent } from '../../../components/bona-button/bona-button.component';
import { BonaConfirm } from '../../../components/bona-confirm/bona-confirm.service';
import { BonaFieldDefinition } from '../../../components/bona-field/bona-field.definition';
import { BonaFormComponent, BonaFormValue } from '../../../components/bona-form/bona-form.component';
import {
  BonaGridAction,
  BonaGridActionEvent,
  BonaGridColumn,
  BonaGridComponent,
} from '../../../components/bona-grid/bona-grid.component';
import { BonaPageComponent } from '../../../components/bona-page/bona-page.component';
import { BonaSummaryCardComponent } from '../../../components/bona-summary-card/bona-summary-card.component';
import { BonaToast } from '../../../components/bona-toast/bona-toast.service';
import { ApiBusinessError } from '../../../core/api-business.error';
import {
  canCancelAppointment,
  hasActiveClientAppointmentForService,
  isBonoUsable,
  isGiftCredit,
  pickNextClientAppointment,
} from '../../../core/booking';
import {
  AppointmentDto,
  AppointmentStatus,
  AppointmentWriteDto,
  AvailabilitySlotDto,
} from '../../../models/appointment.dto';
import { BonoDto } from '../../../models/bono.dto';
import { BookingSettingsDto } from '../../../models/booking-settings.dto';
import { ClientBonoDto } from '../../../models/client-bono.dto';
import { ServiceDto } from '../../../models/service.dto';
import { TrainerDto } from '../../../models/trainer.dto';
import { TranslateService } from '@ngx-translate/core';
import { injectI18n } from '../../../core/i18n/inject-i18n';
import { LanguageService } from '../../../core/i18n/language.service';
import { AuthApiService } from '../../../services/auth-api.service';
import { CalendarApiService } from '../../../services/calendar-api.service';
import { ClientsApiService } from '../../../services/clients-api.service';
import { ServicesApiService } from '../../../services/services-api.service';

@Component({
  selector: 'app-portal-agenda',
  standalone: true,
  imports: [
    BonaPageComponent,
    BonaFormComponent,
    BonaButtonComponent,
    BonaGridComponent,
    BonaSummaryCardComponent,
  ],
  templateUrl: './portal-agenda.component.html',
  styleUrl: './portal-agenda.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalAgendaComponent {
  private readonly auth = inject(AuthApiService);
  private readonly router = inject(Router);
  private readonly calendarApi = inject(CalendarApiService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly servicesApi = inject(ServicesApiService);
  private readonly toast = inject(BonaToast);
  private readonly confirm = inject(BonaConfirm);
  private readonly destroyRef = inject(DestroyRef);
  private readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);

  private readonly i18n = injectI18n('agenda');
  get literals() {
    return this.i18n();
  }
  readonly loading = signal(true);
  readonly error = signal('');
  readonly feedback = signal('');
  readonly filterValue = signal<BonaFormValue>({ serviceId: '', trainerId: '' });
  readonly changingId = signal<string | null>(null);
  readonly selectedDayKey = signal('');
  readonly selectedTimeKey = signal('');
  readonly selectedTrainerId = signal('');

  private clientId = '';
  private readonly trainers = signal<TrainerDto[]>([]);
  private readonly services = signal<ServiceDto[]>([]);
  private readonly bonos = signal<BonoDto[]>([]);
  private readonly clientBonos = signal<ClientBonoDto[]>([]);
  private readonly appointments = signal<AppointmentDto[]>([]);
  private readonly slots = signal<AvailabilitySlotDto[]>([]);
  private readonly bookingSettings = signal<BookingSettingsDto | null>(null);

  readonly contractedBookableServices = computed(() => {
    const now = new Date();
    return this.services().filter((service) => {
      if (!service.bookableByClient) {
        return false;
      }
      return this.clientBonos().some((row) => {
        if (isGiftCredit(row)) {
          return false;
        }
        const bono = this.bonos().find((item) => item.id === row.bonoId);
        return bono?.serviceId === service.id && isBonoUsable(row, now);
      });
    });
  });

  readonly bookableServices = computed(() => {
    const changingId = this.changingId();
    if (changingId) {
      const appointment = this.appointments().find((row) => row.id === changingId);
      const service = this.services().find((item) => item.id === appointment?.serviceId);
      if (service?.bookableByClient && service.active) {
        return [service];
      }
      return [];
    }
    return this.contractedBookableServices().filter(
      (service) => !hasActiveClientAppointmentForService(this.appointments(), service.id),
    );
  });

  readonly bookingBlockedHint = computed(() => {
    if (this.bookableServices().length > 0) {
      return '';
    }
    if (this.contractedBookableServices().length === 0) {
      return this.literals.noService;
    }
    return this.literals.allServicesBooked;
  });

  readonly filterFields = computed((): BonaFieldDefinition[] => [
    {
      key: 'serviceId',
      label: this.literals.service,
      type: 'select',
      options: this.bookableServices().map((service) => ({
        value: service.id,
        label: this.serviceBookingLabel(service),
      })),
    },
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

  readonly remainingSessions = computed(() => {
    const now = new Date();
    return this.clientBonos().reduce(
      (sum, row) => (isGiftCredit(row) || !isBonoUsable(row, now) ? sum : sum + row.remainingSessions),
      0,
    );
  });

  readonly remainingHint = computed(() => {
    const count = this.remainingSessions();
    if (count <= 0) {
      return this.literals.remainingNone;
    }
    return this.literals.remainingHint.replace('{{count}}', String(count));
  });

  readonly nextAppointment = computed(() => pickNextClientAppointment(this.appointments(), new Date()));

  readonly nextAppointmentTitle = computed(() => {
    const appointment = this.nextAppointment();
    if (!appointment) {
      return this.literals.noNextAppointment;
    }
    return this.serviceLabel(this.services().find((service) => service.id === appointment.serviceId));
  });

  readonly nextAppointmentMeta = computed(() => {
    const appointment = this.nextAppointment();
    if (!appointment) {
      if (this.contractedBookableServices().length === 0) {
        return this.literals.noNextHint;
      }
      if (this.bookableServices().length === 0) {
        return this.literals.allServicesBooked;
      }
      return this.literals.noNextPickSlot;
    }
    const trainer = this.trainers().find((item) => item.id === appointment.trainerId)?.name ?? appointment.trainerId;
    return `${this.formatDate(appointment.startsAt)} · ${trainer} · ${this.statusLabel(appointment.status)}`;
  });

  readonly canCancelNext = computed(() => {
    const appointment = this.nextAppointment();
    if (!appointment) {
      return false;
    }
    return this.canOfferCancel(appointment.status, appointment.startsAt);
  });

  readonly nextCardActions = computed(() => {
    if (!this.canCancelNext()) {
      return [];
    }
    return [{ name: 'cancel', label: this.literals.cancel, variant: 'primary' as const }];
  });

  readonly visibleSlots = computed(() => {
    const trainerId = this.filterValue()['trainerId'] ?? '';
    return this.slots()
      .filter((slot) => !trainerId || slot.trainerId === trainerId)
      .map((slot) => ({
        ...slot,
        id: `${slot.trainerId}:${slot.startsAt}`,
        trainerLabel: this.trainers().find((trainer) => trainer.id === slot.trainerId)?.name ?? slot.trainerId,
        startsLabel: this.formatDate(slot.startsAt),
        timeLabel: this.formatTime(slot.startsAt),
        dayKey: this.dayKey(slot.startsAt),
        dayLabel: this.formatDay(slot.startsAt),
      }));
  });

  readonly slotGroups = computed(() => {
    const slots = this.visibleSlots();
    const groups: { key: string; label: string; chipLabel: string; slots: typeof slots }[] = [];
    for (const slot of slots) {
      const existing = groups.find((group) => group.key === slot.dayKey);
      if (existing) {
        existing.slots.push(slot);
      } else {
        groups.push({
          key: slot.dayKey,
          label: slot.dayLabel,
          chipLabel: this.formatDayChip(slot.startsAt),
          slots: [slot],
        });
      }
    }
    return groups;
  });

  readonly selectedDayGroup = computed(() => {
    const groups = this.slotGroups();
    const key = this.selectedDayKey();
    return groups.find((group) => group.key === key) ?? groups[0] ?? null;
  });

  readonly dayTimes = computed(() => {
    const day = this.selectedDayGroup();
    if (!day) {
      return [];
    }
    const times: { key: string; label: string }[] = [];
    const seen = new Set<string>();
    for (const slot of day.slots) {
      if (seen.has(slot.timeLabel)) {
        continue;
      }
      seen.add(slot.timeLabel);
      times.push({ key: slot.timeLabel, label: slot.timeLabel });
    }
    return times;
  });

  readonly trainersAtSelectedTime = computed(() => {
    const day = this.selectedDayGroup();
    const timeKey = this.selectedTimeKey() || this.dayTimes()[0]?.key;
    if (!day || !timeKey) {
      return [];
    }
    return day.slots.filter((slot) => slot.timeLabel === timeKey);
  });

  readonly selectedSlot = computed(() => {
    const trainers = this.trainersAtSelectedTime();
    if (trainers.length === 0) {
      return null;
    }
    if (trainers.length === 1) {
      return trainers[0];
    }
    const trainerId = this.selectedTrainerId();
    return trainers.find((slot) => slot.trainerId === trainerId) ?? trainers[0];
  });

  readonly appointmentRows = computed(() =>
    [...this.appointments()]
      .filter((row) => row.status !== 'cancelled')
      .sort((left, right) => Date.parse(right.startsAt) - Date.parse(left.startsAt))
      .map((row) => ({
        ...row,
        serviceLabel: this.serviceLabel(this.services().find((service) => service.id === row.serviceId)),
        trainerLabel: this.trainers().find((trainer) => trainer.id === row.trainerId)?.name ?? row.trainerId,
        startsLabel: this.formatDate(row.startsAt),
        statusLabel: this.statusLabel(row.status),
      })),
  );

  readonly appointmentColumns = computed<BonaGridColumn[]>(() => [
    { field: 'serviceLabel', header: this.literals.service },
    { field: 'trainerLabel', header: this.literals.trainerName },
    {
      field: 'startsLabel',
      header: this.literals.startsAt,
      sortField: 'startsAt',
      type: 'date',
    },
    { field: 'statusLabel', header: this.literals.status },
  ]);

  readonly appointmentActions = computed<BonaGridAction[]>(() => [
    {
      label: this.literals.change,
      action: 'change',
      visible: (item) => this.canOfferCancel(item['status'] as AppointmentStatus, String(item['startsAt'] ?? '')),
    },
    {
      label: this.literals.cancel,
      action: 'cancel',
      visible: (item) => this.canOfferCancel(item['status'] as AppointmentStatus, String(item['startsAt'] ?? '')),
    },
  ]);

  constructor() {
    this.auth
      .getSession()
      .pipe(
        take(1),
        switchMap((session) => {
          const clientId = session?.user.clientId;
          if (!clientId) {
            this.loading.set(false);
            this.error.set(this.literals.noSession);
            return EMPTY;
          }
          this.clientId = clientId;
          return forkJoin({
            trainers: this.calendarApi.getTrainers(),
            services: this.servicesApi.getServices(),
            bonos: this.servicesApi.getBonos(),
            clientBonos: this.clientsApi.getClientBonos(clientId),
            appointments: this.calendarApi.getAppointments({ clientId }),
            settings: this.calendarApi.getBookingSettings(),
          });
        }),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: ({ trainers, services, bonos, clientBonos, appointments, settings }) => {
          this.trainers.set(trainers);
          this.services.set(services);
          this.bonos.set(bonos);
          this.clientBonos.set(clientBonos);
          this.appointments.set(appointments);
          this.bookingSettings.set(settings);
          this.loading.set(false);
          this.selectFirstBookableService();
        },
        error: () => {
          this.error.set(this.literals.loadError);
          this.loading.set(false);
        },
      });

    effect(() => {
      const groups = this.slotGroups();
      const current = this.selectedDayKey();
      if (!groups.some((group) => group.key === current)) {
        untracked(() => this.selectedDayKey.set(groups[0]?.key ?? ''));
      }
    });

    effect(() => {
      const times = this.dayTimes();
      const current = this.selectedTimeKey();
      if (!times.some((time) => time.key === current)) {
        untracked(() => this.selectedTimeKey.set(times[0]?.key ?? ''));
      }
    });

    effect(() => {
      const trainers = this.trainersAtSelectedTime();
      const current = this.selectedTrainerId();
      if (!trainers.some((slot) => slot.trainerId === current)) {
        untracked(() => this.selectedTrainerId.set(trainers[0]?.trainerId ?? ''));
      }
    });
  }

  onFilterChange(value: BonaFormValue): void {
    const previousService = this.filterValue()['serviceId'];
    this.filterValue.set(value);
    const serviceId = value['serviceId'] ?? '';
    if (serviceId && serviceId !== previousService) {
      this.loadSlots(serviceId, this.changingId() ?? undefined);
    }
  }

  onSlotAction(event: BonaGridActionEvent<Record<string, unknown>>): void {
    const trainerId = String(event.item['trainerId'] ?? '');
    const startsAt = String(event.item['startsAt'] ?? '');
    const endsAt = String(event.item['endsAt'] ?? '');
    const serviceId = this.filterValue()['serviceId'] ?? '';
    if (!trainerId || !startsAt || !serviceId) {
      return;
    }
    const changingId = this.changingId();
    const payload = {
      trainerId,
      clientId: this.clientId,
      serviceId,
      startsAt,
      endsAt,
    };
    this.confirm
      .open({
        title: changingId ? this.literals.confirmChangeTitle : this.literals.confirmBookTitle,
        message: changingId ? this.literals.confirmChangeMessage : this.literals.confirmBookMessage,
        confirmLabel: changingId ? this.literals.saveChange : this.literals.book,
      })
      .pipe(
        filter((ok) => ok),
        switchMap(() =>
          changingId
            ? this.calendarApi.updateAppointment(changingId, payload)
            : this.calendarApi.createAppointment(payload),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.toast.success(this.literals.booked);
          this.changingId.set(null);
          this.reload();
        },
        error: (error) => this.error.set(this.messageFor(error)),
      });
  }

  onAppointmentAction(event: BonaGridActionEvent<Record<string, unknown>>): void {
    const id = String(event.item['id'] ?? '');
    const appointment = this.appointments().find((row) => row.id === id);
    if (!appointment) {
      return;
    }
    if (event.action === 'cancel') {
      this.cancelAppointment(appointment);
      return;
    }
    if (event.action !== 'change' || !this.canOfferCancel(appointment.status, appointment.startsAt)) {
      return;
    }
    this.changingId.set(id);
    this.filterValue.set({
      ...this.filterValue(),
      serviceId: appointment.serviceId,
      trainerId: '',
    });
    this.loadSlots(appointment.serviceId, id);
    this.scrollToBooking();
  }

  onSelectDay(key: string): void {
    this.selectedDayKey.set(key);
    this.selectedTimeKey.set('');
    this.selectedTrainerId.set('');
  }

  onSelectTime(key: string): void {
    this.selectedTimeKey.set(key);
    this.selectedTrainerId.set('');
  }

  onSelectTrainer(trainerId: string): void {
    this.selectedTrainerId.set(trainerId);
  }

  onBookSelected(): void {
    const slot = this.selectedSlot();
    if (slot) {
      this.onBookSlot(slot);
    }
  }

  onCancelNext(): void {
    const appointment = this.nextAppointment();
    if (appointment) {
      this.cancelAppointment(appointment);
    }
  }

  onNextCardAction(name: string): void {
    if (name === 'cancel') {
      this.onCancelNext();
    }
  }

  onCloseChange(): void {
    this.changingId.set(null);
    this.selectFirstBookableService();
  }

  onGoBooking(): void {
    this.scrollToBooking();
  }

  onGoCatalog(): void {
    void this.router.navigateByUrl('/app/catalogo');
  }

  onBookSlot(slot: { trainerId: string; startsAt: string; endsAt: string }): void {
    this.onSlotAction({
      action: 'book',
      item: slot,
    });
  }

  private cancelAppointment(appointment: AppointmentDto): void {
    if (!this.canOfferCancel(appointment.status, appointment.startsAt)) {
      return;
    }
    this.confirm
      .open({
        title: this.literals.confirmCancelTitle,
        message: this.literals.confirmCancelMessage,
        confirmLabel: this.literals.cancel,
      })
      .pipe(
        filter((ok) => ok),
        switchMap(() =>
          this.calendarApi.updateAppointment(appointment.id, this.appointmentWrite(appointment, 'cancelled')),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.toast.success(this.literals.cancelled);
          this.changingId.set(null);
          this.reload();
        },
        error: (error) => this.error.set(this.messageFor(error)),
      });
  }

  private loadSlots(serviceId: string, ignoreAppointmentId?: string): void {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 28);
    this.calendarApi
      .getAvailability({
        serviceId,
        clientId: this.clientId,
        from: from.toISOString(),
        to: to.toISOString(),
        ignoreAppointmentId,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (slots) => this.slots.set(slots),
        error: () => this.error.set(this.literals.loadError),
      });
  }

  private reload(): void {
    forkJoin({
      clientBonos: this.clientsApi.getClientBonos(this.clientId),
      appointments: this.calendarApi.getAppointments({ clientId: this.clientId }),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ clientBonos, appointments }) => {
        this.clientBonos.set(clientBonos);
        this.appointments.set(appointments);
        this.selectFirstBookableService();
      });
  }

  private selectFirstBookableService(): void {
    const first = this.bookableServices()[0];
    this.filterValue.set({ serviceId: first?.id ?? '', trainerId: '' });
    if (first) {
      this.loadSlots(first.id);
    } else {
      this.slots.set([]);
    }
  }

  private scrollToBooking(): void {
    document.getElementById('portal-agenda-book')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private appointmentWrite(
    appointment: AppointmentDto,
    status?: AppointmentStatus,
  ): AppointmentWriteDto {
    return {
      trainerId: appointment.trainerId,
      clientId: appointment.clientId,
      serviceId: appointment.serviceId,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      location: appointment.location,
      clientBonoId: appointment.clientBonoId,
      notes: appointment.notes,
      ...(status ? { status } : {}),
    };
  }

  private canOfferCancel(status: AppointmentStatus, startsAt: string): boolean {
    const cutoff = this.bookingSettings()?.nextDayCutoffTime;
    if (!cutoff) {
      return false;
    }
    return canCancelAppointment(status, new Date(startsAt), new Date(), cutoff);
  }

  private serviceLabel(service: ServiceDto | undefined): string {
    if (!service) {
      return '';
    }
    return service.name;
  }

  private serviceBookingLabel(service: ServiceDto): string {
    const now = new Date();
    const remaining = this.clientBonos().reduce((sum, row) => {
      const bono = this.bonos().find((item) => item.id === row.bonoId);
      if (isGiftCredit(row) || bono?.serviceId !== service.id || !isBonoUsable(row, now)) {
        return sum;
      }
      return sum + row.remainingSessions;
    }, 0);
    return `${service.name} · ${remaining} ${this.literals.remainingSessions.toLowerCase()}`;
  }

  private dayKey(value: string): string {
    const date = new Date(value);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  private formatDay(value: string): string {
    return new Date(value).toLocaleDateString(this.language.locale(), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }

  private formatDayChip(value: string): string {
    return new Date(value).toLocaleDateString(this.language.locale(), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  private formatTime(value: string): string {
    return new Date(value).toLocaleTimeString(this.language.locale(), {
      hour: '2-digit',
      minute: '2-digit',
    });
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

  private formatDate(value: string): string {
    return new Date(value).toLocaleString(this.language.locale(), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private messageFor(error: unknown): string {
    if (error instanceof ApiBusinessError) {
      const key = `agenda.errors.${error.code}`;
      const translated = this.translate.instant(key);
      return translated !== key ? translated : this.literals.errorSave;
    }
    return this.literals.errorSave;
  }
}
