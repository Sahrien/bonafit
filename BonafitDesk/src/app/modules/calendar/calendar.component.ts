import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { BonaBoardComponent, BonaBoardColumn, BonaBoardItem } from '../../components/bona-board/bona-board.component';
import { BonaButtonComponent } from '../../components/bona-button/bona-button.component';
import {
  BonaCalendarComponent,
  BonaCalendarEvent,
  BonaCalendarEventDrop,
  BonaCalendarSlotSelect,
  BonaCalendarView,
} from '../../components/bona-calendar/bona-calendar.component';
import { BonaFilterMenuComponent, BonaFilterMenuItem } from '../../components/bona-filter-menu/bona-filter-menu.component';
import { BonaIconButtonComponent } from '../../components/bona-icon-button/bona-icon-button.component';
import { BonaPageComponent } from '../../components/bona-page/bona-page.component';
import { BonaTabItem, BonaTabsComponent } from '../../components/bona-tabs/bona-tabs.component';
import { BonaToast } from '../../components/bona-toast/bona-toast.service';
import { BonaFormValue } from '../../components/bona-form/bona-form.component';
import { ApiBusinessError } from '../../core/api-business.error';
import { injectI18n } from '../../core/i18n/inject-i18n';
import { LanguageService } from '../../core/i18n/language.service';
import { AppointmentDto, AppointmentStatus, AppointmentWriteDto } from '../../models/appointment.dto';
import { BonoDto } from '../../models/bono.dto';
import { BookingSettingsDto } from '../../models/booking-settings.dto';
import { ClientDto } from '../../models/client.dto';
import { ServiceDto } from '../../models/service.dto';
import { TrainerDto } from '../../models/trainer.dto';
import { TranslateService } from '@ngx-translate/core';
import { CalendarApiService } from '../../services/calendar-api.service';
import { ClientsApiService } from '../../services/clients-api.service';
import { ServicesApiService } from '../../services/services-api.service';
import { EMPTY_APPOINTMENT_FORM } from './appointment-editor/appointment-editor.component';
import { AppointmentEditor } from './appointment-editor/appointment-editor.service';
import { toDatetimeLocalValue } from './calendar-datetime';
import { isInstantInRange, periodRange } from './calendar-range';

export type CalendarDisplayMode = 'calendar' | 'board';

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
    BonaFilterMenuComponent,
    BonaIconButtonComponent,
    BonaBoardComponent,
    BonaButtonComponent,
  ],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarComponent {
  private readonly calendarApi = inject(CalendarApiService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly servicesApi = inject(ServicesApiService);
  private readonly appointmentEditor = inject(AppointmentEditor);
  private readonly toast = inject(BonaToast);
  private readonly destroyRef = inject(DestroyRef);
  readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);
  private readonly i18n = injectI18n('calendar');

  get literals() {
    return this.i18n();
  }

  readonly viewTabs = computed<BonaTabItem[]>(() => [
    { id: 'week', label: this.literals.week },
    { id: 'day', label: this.literals.day },
  ]);
  readonly displayTabs = computed<BonaTabItem[]>(() => [
    { id: 'calendar', label: this.literals.displayCalendar },
    { id: 'board', label: this.literals.displayBoard },
  ]);
  readonly boardColumns = computed<BonaBoardColumn[]>(() => [
    { id: 'pending', label: this.literals.statusPending },
    { id: 'confirmed', label: this.literals.statusConfirmed },
    { id: 'completed', label: this.literals.statusCompleted },
  ]);

  readonly view = signal<BonaCalendarView>('week');
  readonly display = signal<CalendarDisplayMode>('calendar');
  readonly selectedTrainerIds = signal<string[]>([]);
  readonly selectedServiceIds = signal<string[]>([]);
  readonly focusDate = signal(new Date());
  readonly loading = signal(true);

  private readonly trainers = signal<TrainerDto[]>([]);
  private readonly clients = signal<ClientDto[]>([]);
  private readonly services = signal<ServiceDto[]>([]);
  private readonly bonos = signal<BonoDto[]>([]);
  private readonly appointments = signal<AppointmentDto[]>([]);
  private readonly settings = signal<BookingSettingsDto | null>(null);

  readonly catalogTrainers = computed(() => this.trainers());
  readonly trainerFilterItems = computed<BonaFilterMenuItem[]>(() =>
    this.trainers().map((trainer) => ({ id: trainer.id, label: trainer.name })),
  );
  readonly serviceFilterItems = computed<BonaFilterMenuItem[]>(() =>
    this.services().map((service) => ({ id: service.id, label: service.name })),
  );

  readonly visibleTrainers = computed(() => {
    const selected = this.selectedTrainerIds();
    const trainers = this.trainers();
    if (!selected.length) {
      return trainers;
    }
    return trainers.filter((trainer) => selected.includes(trainer.id));
  });

  readonly periodTitle = computed(() => {
    const locale = this.language.locale();
    const focus = this.focusDate();
    if (this.view() === 'day') {
      return focus.toLocaleDateString(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
    }
    const { start, end } = periodRange('week', focus);
    const last = new Date(end);
    last.setDate(last.getDate() - 1);
    const startLabel = start.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    const endLabel = last.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
    return `${startLabel} – ${endLabel}`;
  });

  readonly filteredAppointments = computed(() => {
    const visibleTrainers = new Set(this.visibleTrainers().map((trainer) => trainer.id));
    const selectedServices = this.selectedServiceIds();
    return this.appointments().filter((appointment) => {
      if (appointment.status === 'cancelled') {
        return false;
      }
      if (!visibleTrainers.has(appointment.trainerId)) {
        return false;
      }
      if (selectedServices.length && !selectedServices.includes(appointment.serviceId)) {
        return false;
      }
      return true;
    });
  });

  readonly events = computed(() => this.filteredAppointments().map((appointment) => this.toCalendarEvent(appointment)));

  readonly boardItems = computed<BonaBoardItem[]>(() => {
    const { start, end } = periodRange(this.view(), this.focusDate());
    return this.filteredAppointments()
      .filter((appointment) => isInstantInRange(appointment.startsAt, start, end))
      .map((appointment) => ({
        id: appointment.id,
        columnId: appointment.status,
        title: this.appointmentTitle(appointment, { includeTrainer: false }),
        subtitle: this.boardSubtitle(appointment),
      }));
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

  onDisplay(display: string): void {
    if (display === 'calendar' || display === 'board') {
      this.display.set(display);
    }
  }

  onTrainerFilter(ids: string[]): void {
    this.selectedTrainerIds.set(ids);
  }

  onServiceFilter(ids: string[]): void {
    this.selectedServiceIds.set(ids);
  }

  eventsForTrainer(trainerId: string): BonaCalendarEvent[] {
    return this.events().filter((event) => event.resourceId === trainerId);
  }

  onPrevPeriod(): void {
    this.shiftFocusDate(this.view() === 'week' ? -7 : -1);
  }

  onNextPeriod(): void {
    this.shiftFocusDate(this.view() === 'week' ? 7 : 1);
  }

  onFocusToday(): void {
    this.focusDate.set(new Date());
  }

  onCreate(): void {
    this.openEditor(null, {
      ...EMPTY_APPOINTMENT_FORM,
      trainerId: this.defaultTrainerId(),
      location: this.settings()?.defaultLocation ?? '',
      status: 'confirmed',
    });
  }

  onSlotSelect(slot: BonaCalendarSlotSelect): void {
    this.openEditor(null, this.presetFromSlot(this.visibleTrainers()[0]?.id ?? this.defaultTrainerId(), slot));
  }

  onSlotSelectForTrainer(trainerId: string, slot: BonaCalendarSlotSelect): void {
    this.openEditor(null, this.presetFromSlot(trainerId, slot));
  }

  onEventClick(event: BonaCalendarEvent): void {
    this.openAppointment(event.id);
  }

  onBoardItemClick(item: BonaBoardItem): void {
    this.openAppointment(item.id);
  }

  onEventDrop(drop: BonaCalendarEventDrop): void {
    const appointment = this.appointments().find((item) => item.id === drop.event.id);
    if (!appointment || appointment.status === 'completed' || appointment.status === 'cancelled') {
      drop.revert();
      return;
    }
    const durationMs = new Date(appointment.endsAt).getTime() - new Date(appointment.startsAt).getTime();
    const startsAt = drop.start.toISOString();
    const endsAt = (drop.end ?? new Date(drop.start.getTime() + durationMs)).toISOString();
    this.calendarApi
      .updateAppointment(appointment.id, this.toWriteFromAppointment(appointment, { startsAt, endsAt }))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success(this.literals.saved);
          this.loadAppointments();
        },
        error: (error) => {
          drop.revert();
          this.toast.error(this.messageFor(error));
        },
      });
  }

  private openAppointment(id: string): void {
    const appointment = this.appointments().find((item) => item.id === id);
    if (!appointment) {
      return;
    }
    this.openEditor(appointment);
  }

  private openEditor(appointment: AppointmentDto | null, preset?: BonaFormValue): void {
    this.appointmentEditor
      .open({
        appointment,
        preset,
        trainers: this.trainers(),
        clients: this.clients(),
        services: this.services(),
        bonos: this.bonos(),
        settings: this.settings(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => {
        if (saved) {
          this.loadAppointments();
        }
      });
  }

  private presetFromSlot(trainerId: string, slot: BonaCalendarSlotSelect): BonaFormValue {
    return {
      ...EMPTY_APPOINTMENT_FORM,
      trainerId,
      startsAt: toDatetimeLocalValue(slot.start),
      endsAt: toDatetimeLocalValue(slot.end),
      location: this.settings()?.defaultLocation ?? '',
      status: 'confirmed',
    };
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

  private defaultTrainerId(): string {
    return this.trainers()[0]?.id ?? '';
  }

  private toCalendarEvent(appointment: AppointmentDto): BonaCalendarEvent {
    const client = this.clients().find((item) => item.id === appointment.clientId);
    const trainer = this.trainers().find((item) => item.id === appointment.trainerId);
    const draggable = appointment.status === 'pending' || appointment.status === 'confirmed';
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
      startEditable: draggable,
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
      service ? service.name : appointment.serviceId,
    ];
    const includeTrainer =
      options?.includeTrainer ?? (this.view() === 'week' && this.visibleTrainers().length > 1);
    if (includeTrainer) {
      parts.push(this.trainerName(appointment.trainerId));
    }
    return parts.join(' · ');
  }

  private boardSubtitle(appointment: AppointmentDto): string {
    const time = new Date(appointment.startsAt).toLocaleTimeString(this.language.locale(), {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${time} · ${this.trainerName(appointment.trainerId)}`;
  }

  private trainerName(trainerId: string): string {
    return this.trainers().find((trainer) => trainer.id === trainerId)?.name ?? trainerId;
  }

  private clientLabel(client: ClientDto): string {
    return `${client.firstName} ${client.lastName}`.trim();
  }

  private shiftFocusDate(days: number): void {
    const next = new Date(this.focusDate());
    next.setDate(next.getDate() + days);
    this.focusDate.set(next);
  }

  private toWriteFromAppointment(
    appointment: AppointmentDto,
    patch: Partial<AppointmentWriteDto>,
  ): AppointmentWriteDto {
    return {
      trainerId: appointment.trainerId,
      clientId: appointment.clientId,
      serviceId: appointment.serviceId,
      clientBonoId: appointment.clientBonoId ?? null,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      location: appointment.location,
      status: appointment.status,
      notes: appointment.notes ?? '',
      ...patch,
    };
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
