import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { BonaButtonComponent } from '../../components/bona-button/bona-button.component';
import {
  BonaCalendarComponent,
  BonaCalendarEvent,
  BonaCalendarSlotSelect,
  BonaCalendarView,
} from '../../components/bona-calendar/bona-calendar.component';
import { BonaFieldDefinition, BonaFieldOption } from '../../components/bona-field/bona-field.definition';
import { BonaFormComponent, BonaFormValue } from '../../components/bona-form/bona-form.component';
import { AppointmentDto, AppointmentWriteDto } from '../../models/appointment.dto';
import { AuthSessionDto } from '../../models/auth-session.dto';
import { BonoDto } from '../../models/bono.dto';
import { ClientBonoDto } from '../../models/client-bono.dto';
import { ClientDto } from '../../models/client.dto';
import { ServiceCategory, ServiceDto } from '../../models/service.dto';
import { TrainerDto } from '../../models/trainer.dto';
import { AuthApiService } from '../../services/auth-api.service';
import { CalendarApiService } from '../../services/calendar-api.service';
import { ClientsApiService } from '../../services/clients-api.service';
import { ServicesApiService } from '../../services/services-api.service';
import { fromDatetimeLocalValue, toDatetimeLocalValue } from './calendar-datetime';
import { CALENDAR_LITERALS } from './calendar.literals';

const EMPTY_FORM: BonaFormValue = {
  trainerId: '',
  clientId: '',
  serviceId: '',
  clientBonoId: '',
  startsAt: '',
  endsAt: '',
  location: '',
};

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [BonaCalendarComponent, BonaFormComponent, BonaButtonComponent],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarComponent {
  private readonly calendarApi = inject(CalendarApiService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly servicesApi = inject(ServicesApiService);
  private readonly authApi = inject(AuthApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly literals = CALENDAR_LITERALS;
  readonly view = signal<BonaCalendarView>('week');
  readonly userName = signal('');
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

  readonly events = computed(() =>
    this.appointments().map((appointment) => this.toCalendarEvent(appointment)),
  );

  readonly editorTitle = computed(() =>
    this.editingId() ? this.literals.editAppointment : this.literals.newAppointment,
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
    ];
  });

  constructor() {
    this.loadCatalog();
  }

  onView(view: BonaCalendarView): void {
    this.view.set(view);
  }

  onCreate(): void {
    this.openForm(null, {
      ...EMPTY_FORM,
      trainerId: this.defaultTrainerId(),
    });
  }

  onSlotSelect(slot: BonaCalendarSlotSelect): void {
    this.openForm(null, {
      ...EMPTY_FORM,
      trainerId: this.defaultTrainerId(),
      startsAt: toDatetimeLocalValue(slot.start),
      endsAt: toDatetimeLocalValue(slot.end),
    });
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
    let next = value;
    if (nextClient !== previousClient || nextService !== previousService) {
      next = { ...value, clientBonoId: nextClient === previousClient && nextService === previousService ? value['clientBonoId'] ?? '' : '' };
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
        this.loadAppointments();
      },
      error: () => this.error.set(this.literals.errorSave),
    });
  }

  onDelete(): void {
    const id = this.editingId();
    if (!id) {
      return;
    }
    this.calendarApi
      .deleteAppointment(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.formOpen.set(false);
          this.editingId.set(null);
          this.loadAppointments();
        },
        error: () => this.error.set(this.literals.errorSave),
      });
  }

  private loadCatalog(): void {
    forkJoin({
      trainers: this.calendarApi.getTrainers(),
      appointments: this.calendarApi.getAppointments(),
      clients: this.clientsApi.getClients(),
      services: this.servicesApi.getServices(),
      bonos: this.servicesApi.getBonos(),
      session: this.authApi.getSession(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ trainers, appointments, clients, services, bonos, session }) => {
        this.trainers.set(trainers);
        this.appointments.set(appointments);
        this.clients.set(clients);
        this.services.set(services);
        this.bonos.set(bonos);
        this.userName.set(this.sessionLabel(session));
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

  private sessionLabel(session: AuthSessionDto | null): string {
    return session?.user.displayName ?? '';
  }

  private clientLabel(client: ClientDto): string {
    return `${client.firstName} ${client.lastName}`.trim();
  }

  private serviceLabel(service: ServiceDto): string {
    const labels: Record<ServiceCategory, string> = {
      'entrenamiento-personal': this.literals.categoryPersonal,
      hipopresivos: this.literals.categoryHipopresivos,
      masaje: this.literals.categoryMasaje,
    };
    return labels[service.category] ?? service.name;
  }

  private bonoOptions(service: ServiceDto | undefined): BonaFieldOption[] {
    if (!service) {
      return [];
    }
    const options: BonaFieldOption[] = [];
    if (service.allowsSingleSession) {
      options.push({ value: '', label: this.literals.singleSession });
    }
    const clientId = this.formValue()['clientId'] ?? '';
    for (const contracted of this.clientBonos()) {
      if (contracted.clientId !== clientId || contracted.remainingSessions <= 0) {
        continue;
      }
      const bono = this.bonos().find((item) => item.id === contracted.bonoId);
      if (!bono || bono.serviceId !== service.id) {
        continue;
      }
      options.push({
        value: contracted.id,
        label: `${bono.name} · ${contracted.remainingSessions}`,
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
      title: `${client ? this.clientLabel(client) : appointment.clientId} · ${service ? this.serviceLabel(service) : appointment.serviceId}`,
      start: appointment.startsAt,
      end: appointment.endsAt,
      trainer: trainer?.name,
      client: client ? this.clientLabel(client) : undefined,
      location: appointment.location,
      resourceId: appointment.trainerId,
    };
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
    };
  }

  private toWriteDto(value: BonaFormValue): AppointmentWriteDto | null {
    const trainerId = value['trainerId'] ?? '';
    const clientId = value['clientId'] ?? '';
    const serviceId = value['serviceId'] ?? '';
    const startsAt = fromDatetimeLocalValue(value['startsAt'] ?? '');
    const endsAt = fromDatetimeLocalValue(value['endsAt'] ?? '');
    const location = (value['location'] ?? '').trim();
    if (!trainerId || !clientId || !serviceId || !startsAt || !endsAt || !location) {
      this.error.set(this.literals.errorRequired);
      return null;
    }
    const service = this.services().find((item) => item.id === serviceId);
    const clientBonoId = value['clientBonoId'] ?? '';
    if (service && !service.allowsSingleSession && !clientBonoId) {
      this.error.set(this.literals.errorBonoRequired);
      return null;
    }
    const payload: AppointmentWriteDto = {
      trainerId,
      clientId,
      serviceId,
      startsAt,
      endsAt,
      location,
    };
    if (clientBonoId) {
      payload.clientBonoId = clientBonoId;
    }
    return payload;
  }
}
