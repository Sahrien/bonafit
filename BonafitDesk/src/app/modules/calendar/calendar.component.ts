import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, forkJoin, switchMap } from 'rxjs';
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
import { addMinutes, isBonoUsable } from '../../core/booking';
import { AppointmentDto, AppointmentStatus, AppointmentWriteDto } from '../../models/appointment.dto';
import { BonoDto } from '../../models/bono.dto';
import { BookingSettingsDto } from '../../models/booking-settings.dto';
import { ClientBonoDto } from '../../models/client-bono.dto';
import { ClientDto } from '../../models/client.dto';
import { ServiceDto } from '../../models/service.dto';
import { TrainerDto } from '../../models/trainer.dto';
import { Router } from '@angular/router';
import { AUTH_PATHS } from '../../core/auth/auth.paths';
import { CalendarApiService } from '../../services/calendar-api.service';
import { ClientsApiService } from '../../services/clients-api.service';
import { ServicesApiService } from '../../services/services-api.service';
import { fromDatetimeLocalValue, toDatetimeLocalValue } from './calendar-datetime';
import { BOOKING_ERROR_LITERALS, CALENDAR_LITERALS } from './calendar.literals';

const EMPTY_FORM: BonaFormValue = {
  trainerId: '',
  clientId: '',
  serviceId: '',
  clientBonoId: '',
  startsAt: '',
  endsAt: '',
  location: '',
  status: 'confirmed',
};

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  pending: 'var(--bona-color-warning)',
  confirmed: 'var(--bona-color-primary)',
  completed: 'var(--bona-color-text-muted)',
  cancelled: 'var(--bona-color-border)',
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

  readonly literals = CALENDAR_LITERALS;
  readonly viewTabs: BonaTabItem[] = [
    { id: 'week', label: CALENDAR_LITERALS.week },
    { id: 'day', label: CALENDAR_LITERALS.day },
  ];
  readonly view = signal<BonaCalendarView>('week');
  readonly loading = signal(true);
  readonly formOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly formValue = signal<BonaFormValue>({ ...EMPTY_FORM });
  readonly error = signal('');

  private readonly trainers = signal<TrainerDto[]>([]);
  private readonly clients = signal<ClientDto[]>([]);
  private readonly services = signal<ServiceDto[]>([]);
  private readonly bonos = signal<BonoDto[]>([]);
  private readonly clientBonos = signal<ClientBonoDto[]>([]);
  private readonly appointments = signal<AppointmentDto[]>([]);
  private readonly settings = signal<BookingSettingsDto | null>(null);

  readonly events = computed(() =>
    this.appointments()
      .filter((appointment) => appointment.status !== 'cancelled')
      .map((appointment) => this.toCalendarEvent(appointment)),
  );

  readonly todayAppointments = computed(() => {
    const todayKey = this.dayKey(new Date());
    return this.appointments()
      .filter(
        (appointment) =>
          appointment.status !== 'cancelled' && this.dayKey(new Date(appointment.startsAt)) === todayKey,
      )
      .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime())
      .map((appointment) => ({
        id: appointment.id,
        time: this.formatTime(appointment.startsAt),
        title: this.toCalendarEvent(appointment).title,
        status: this.statusLabel(appointment.status),
      }));
  });

  readonly editorTitle = computed(() =>
    this.editingId() ? this.literals.editAppointment : this.literals.newAppointment,
  );

  readonly currentStatus = computed(
    () => (this.formValue()['status'] ?? '') as AppointmentStatus | '',
  );

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
        options: [
          { value: 'pending', label: this.literals.statusPending },
          { value: 'confirmed', label: this.literals.statusConfirmed },
          { value: 'completed', label: this.literals.statusCompleted },
          { value: 'cancelled', label: this.literals.statusCancelled },
        ],
      },
    ];
  });

  constructor() {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 48rem)').matches) {
      this.view.set('day');
    }
    this.loadCatalog();
  }

  onView(view: string): void {
    if (view === 'week' || view === 'day') {
      this.view.set(view);
    }
  }

  onCreate(): void {
    this.openForm(null, {
      ...EMPTY_FORM,
      trainerId: this.defaultTrainerId(),
      location: this.settings()?.defaultLocation ?? '',
      status: 'confirmed',
    });
  }

  onOpenSchedules(): void {
    void this.router.navigateByUrl(AUTH_PATHS.adminSchedules);
  }

  onSlotSelect(slot: BonaCalendarSlotSelect): void {
    this.openForm(null, {
      ...EMPTY_FORM,
      trainerId: this.defaultTrainerId(),
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
        clientBonoId:
          nextClient === previousClient && nextService === previousService ? value['clientBonoId'] ?? '' : '',
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
    this.error.set('');
  }

  onSubmit(value: BonaFormValue): void {
    this.saveAppointment(value);
  }

  onConfirm(): void {
    this.saveAppointment({ ...this.formValue(), status: 'confirmed' });
  }

  onComplete(): void {
    this.saveAppointment({ ...this.formValue(), status: 'completed' });
  }

  onCancelAppointment(): void {
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

  onDelete(): void {
    const id = this.editingId();
    if (!id) {
      return;
    }
    this.confirm
      .open({
        title: this.literals.confirmDeleteTitle,
        message: this.literals.confirmDeleteMessage,
        confirmLabel: this.literals.delete,
      })
      .pipe(
        filter((ok) => ok),
        switchMap(() => this.calendarApi.deleteAppointment(id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.formOpen.set(false);
          this.editingId.set(null);
          this.toast.success(this.literals.deleted);
          this.loadAppointments();
        },
        error: (error) => this.error.set(this.messageFor(error)),
      });
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
      error: (error) => this.error.set(this.messageFor(error)),
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
        error: (error) => {
          this.error.set(this.messageFor(error));
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
    this.error.set('');
    this.formOpen.set(true);
    if (!value['clientId']) {
      this.clientBonos.set([]);
    }
  }

  private defaultTrainerId(): string {
    return this.trainers()[0]?.id ?? '';
  }

  private dayKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  private formatTime(value: string): string {
    return new Date(value).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
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
    const options: BonaFieldOption[] = [{ value: '', label: this.literals.singleSession }];
    const clientId = this.formValue()['clientId'] ?? '';
    const now = new Date();
    for (const contracted of this.clientBonos()) {
      if (contracted.clientId !== clientId || !isBonoUsable(contracted, now)) {
        continue;
      }
      const bono = this.bonos().find((item) => item.id === contracted.bonoId);
      if (!bono || bono.serviceId !== service.id) {
        continue;
      }
      const gift = contracted.remainingSessions === 1 && bono.sessionCount !== 1;
      options.push({
        value: contracted.id,
        label: gift
          ? `${this.literals.singleSession} · ${contracted.remainingSessions}`
          : `${bono.name} · ${contracted.remainingSessions}`,
      });
    }
    return options;
  }

  private toCalendarEvent(appointment: AppointmentDto): BonaCalendarEvent {
    const client = this.clients().find((item) => item.id === appointment.clientId);
    const service = this.services().find((item) => item.id === appointment.serviceId);
    const trainer = this.trainers().find((item) => item.id === appointment.trainerId);
    return {
      id: appointment.id,
      title: `${client ? this.clientLabel(client) : appointment.clientId} · ${service ? this.serviceLabel(service) : appointment.serviceId} · ${this.statusLabel(appointment.status)}`,
      start: appointment.startsAt,
      end: appointment.endsAt,
      trainer: trainer?.name,
      client: client ? this.clientLabel(client) : undefined,
      location: appointment.location,
      resourceId: appointment.trainerId,
      color: STATUS_COLORS[appointment.status],
    };
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
      this.error.set(this.literals.errorRequired);
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
      return BOOKING_ERROR_LITERALS[error.code] ?? this.literals.errorSave;
    }
    return this.literals.errorSave;
  }
}
