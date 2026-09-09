import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { BonaToast } from '../../../components/bona-toast/bona-toast.service';
import { ApiBusinessError } from '../../../core/api-business.error';
import { isActiveClientAppointment, isBonoUsable } from '../../../core/booking';
import {
  AppointmentDto,
  AppointmentStatus,
  AvailabilitySlotDto,
} from '../../../models/appointment.dto';
import { BonoDto } from '../../../models/bono.dto';
import { ClientBonoDto } from '../../../models/client-bono.dto';
import { ServiceCategory, ServiceDto } from '../../../models/service.dto';
import { TrainerDto } from '../../../models/trainer.dto';
import { AuthApiService } from '../../../services/auth-api.service';
import { CalendarApiService } from '../../../services/calendar-api.service';
import { ClientsApiService } from '../../../services/clients-api.service';
import { ServicesApiService } from '../../../services/services-api.service';
import { PORTAL_AGENDA_LITERALS, PORTAL_BOOKING_ERROR_LITERALS } from './portal-agenda.literals';

@Component({
  selector: 'app-portal-agenda',
  standalone: true,
  imports: [BonaPageComponent, BonaFormComponent, BonaButtonComponent, BonaGridComponent],
  templateUrl: './portal-agenda.component.html',
  styleUrl: './portal-agenda.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalAgendaComponent {
  private readonly auth = inject(AuthApiService);
  private readonly calendarApi = inject(CalendarApiService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly servicesApi = inject(ServicesApiService);
  private readonly toast = inject(BonaToast);
  private readonly confirm = inject(BonaConfirm);
  private readonly destroyRef = inject(DestroyRef);

  readonly literals = PORTAL_AGENDA_LITERALS;
  readonly loading = signal(true);
  readonly error = signal('');
  readonly feedback = signal('');
  readonly filterValue = signal<BonaFormValue>({ serviceId: '', trainerId: '' });
  readonly changingId = signal<string | null>(null);

  private clientId = '';
  private readonly trainers = signal<TrainerDto[]>([]);
  private readonly services = signal<ServiceDto[]>([]);
  private readonly bonos = signal<BonoDto[]>([]);
  private readonly clientBonos = signal<ClientBonoDto[]>([]);
  private readonly appointments = signal<AppointmentDto[]>([]);
  private readonly slots = signal<AvailabilitySlotDto[]>([]);

  readonly bookableServices = computed(() => {
    const now = new Date();
    return this.services().filter((service) => {
      if (!service.bookableByClient) {
        return false;
      }
      return this.clientBonos().some((row) => {
        const bono = this.bonos().find((item) => item.id === row.bonoId);
        return bono?.serviceId === service.id && isBonoUsable(row, now);
      });
    });
  });

  readonly filterFields = computed((): BonaFieldDefinition[] => [
    {
      key: 'serviceId',
      label: this.literals.service,
      type: 'select',
      options: this.bookableServices().map((service) => ({
        value: service.id,
        label: this.serviceLabel(service),
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

  readonly visibleSlots = computed(() => {
    const trainerId = this.filterValue()['trainerId'] ?? '';
    return this.slots()
      .filter((slot) => !trainerId || slot.trainerId === trainerId)
      .map((slot) => ({
        ...slot,
        id: `${slot.trainerId}:${slot.startsAt}`,
        trainerLabel: this.trainers().find((trainer) => trainer.id === slot.trainerId)?.name ?? slot.trainerId,
        startsLabel: this.formatDate(slot.startsAt),
      }));
  });

  readonly appointmentRows = computed(() =>
    this.appointments()
      .filter((row) => row.status !== 'cancelled')
      .map((row) => ({
        ...row,
        serviceLabel: this.serviceLabel(this.services().find((service) => service.id === row.serviceId)),
        trainerLabel: this.trainers().find((trainer) => trainer.id === row.trainerId)?.name ?? row.trainerId,
        startsLabel: this.formatDate(row.startsAt),
        statusLabel: this.statusLabel(row.status),
      })),
  );

  readonly appointmentColumns: BonaGridColumn[] = [
    { field: 'serviceLabel', header: PORTAL_AGENDA_LITERALS.service },
    { field: 'trainerLabel', header: PORTAL_AGENDA_LITERALS.trainerName },
    { field: 'startsLabel', header: PORTAL_AGENDA_LITERALS.startsAt },
    { field: 'statusLabel', header: PORTAL_AGENDA_LITERALS.status },
  ];

  readonly appointmentActions: BonaGridAction[] = [
    { label: PORTAL_AGENDA_LITERALS.change, action: 'change' },
    { label: PORTAL_AGENDA_LITERALS.cancel, action: 'cancel' },
  ];

  readonly slotColumns: BonaGridColumn[] = [
    { field: 'trainerLabel', header: PORTAL_AGENDA_LITERALS.trainerName },
    { field: 'startsLabel', header: PORTAL_AGENDA_LITERALS.startsAt },
  ];

  readonly slotActions: BonaGridAction[] = [{ label: PORTAL_AGENDA_LITERALS.book, action: 'book' }];
  readonly changeSlotActions: BonaGridAction[] = [
    { label: PORTAL_AGENDA_LITERALS.saveChange, action: 'book' },
  ];

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
          });
        }),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: ({ trainers, services, bonos, clientBonos, appointments }) => {
          this.trainers.set(trainers);
          this.services.set(services);
          this.bonos.set(bonos);
          this.clientBonos.set(clientBonos);
          this.appointments.set(appointments);
          const first = this.bookableServices()[0];
          this.filterValue.set({ serviceId: first?.id ?? '', trainerId: '' });
          this.loading.set(false);
          if (first) {
            this.loadSlots(first.id);
          }
        },
        error: () => {
          this.error.set(this.literals.loadError);
          this.loading.set(false);
        },
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
    if (!appointment || !isActiveClientAppointment(appointment.status)) {
      return;
    }
    if (event.action === 'cancel') {
      this.confirm
        .open({
          title: this.literals.confirmCancelTitle,
          message: this.literals.confirmCancelMessage,
          confirmLabel: this.literals.cancel,
        })
        .pipe(
          filter((ok) => ok),
          switchMap(() =>
            this.calendarApi.updateAppointment(id, { ...appointment, status: 'cancelled' }),
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
      return;
    }
    this.changingId.set(id);
    this.filterValue.set({
      ...this.filterValue(),
      serviceId: appointment.serviceId,
      trainerId: '',
    });
    this.loadSlots(appointment.serviceId, id);
  }

  onCloseChange(): void {
    this.changingId.set(null);
    const serviceId = this.filterValue()['serviceId'] ?? '';
    if (serviceId) {
      this.loadSlots(serviceId);
    }
  }

  private loadSlots(serviceId: string, ignoreAppointmentId?: string): void {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 14);
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
        const serviceId = this.filterValue()['serviceId'] ?? this.bookableServices()[0]?.id ?? '';
        if (serviceId) {
          this.loadSlots(serviceId);
        }
      });
  }

  private serviceLabel(service: ServiceDto | undefined): string {
    if (!service) {
      return '';
    }
    const labels: Record<ServiceCategory, string> = {
      'entrenamiento-personal': this.literals.categoryPersonal,
      hipopresivos: this.literals.categoryHipopresivos,
      masaje: this.literals.categoryMasaje,
    };
    return labels[service.category] ?? service.name;
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
    return new Date(value).toLocaleString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private messageFor(error: unknown): string {
    if (error instanceof ApiBusinessError) {
      return PORTAL_BOOKING_ERROR_LITERALS[error.code] ?? this.literals.errorSave;
    }
    return this.literals.errorSave;
  }
}
