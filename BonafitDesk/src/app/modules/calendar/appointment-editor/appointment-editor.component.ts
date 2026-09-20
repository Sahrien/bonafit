import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { BonaButtonComponent } from '../../../components/bona-button/bona-button.component';
import { BonaConfirm } from '../../../components/bona-confirm/bona-confirm.service';
import { BonaDialogLayoutComponent } from '../../../components/bona-dialog/bona-dialog-layout.component';
import { BonaFieldDefinition, BonaFieldOption } from '../../../components/bona-field/bona-field.definition';
import { BonaFormComponent, BonaFormValue } from '../../../components/bona-form/bona-form.component';
import { BonaToast } from '../../../components/bona-toast/bona-toast.service';
import { ApiBusinessError } from '../../../core/api-business.error';
import { addMinutes, canAdminCancelAppointment, isBonoUsable, isGiftCredit, pickPreferredBono } from '../../../core/booking';
import { injectI18n } from '../../../core/i18n/inject-i18n';
import { AppointmentDto, AppointmentStatus, AppointmentWriteDto } from '../../../models/appointment.dto';
import { BonoDto } from '../../../models/bono.dto';
import { BookingSettingsDto } from '../../../models/booking-settings.dto';
import { ClientBonoDto } from '../../../models/client-bono.dto';
import { ClientDto } from '../../../models/client.dto';
import { ServiceDto } from '../../../models/service.dto';
import { TrainerDto } from '../../../models/trainer.dto';
import { CalendarApiService } from '../../../services/calendar-api.service';
import { ClientsApiService } from '../../../services/clients-api.service';
import { fromDatetimeLocalValue, toDatetimeLocalValue } from '../calendar-datetime';

export const EMPTY_APPOINTMENT_FORM: BonaFormValue = {
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

export interface AppointmentEditorData {
  appointment?: AppointmentDto | null;
  preset?: BonaFormValue;
  trainers: TrainerDto[];
  clients: ClientDto[];
  services: ServiceDto[];
  bonos: BonoDto[];
  settings: BookingSettingsDto | null;
}

@Component({
  selector: 'app-appointment-editor',
  standalone: true,
  imports: [
    BonaDialogLayoutComponent,
    BonaFormComponent,
    BonaButtonComponent,
    MatIconButton,
    MatIcon,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
  ],
  templateUrl: './appointment-editor.component.html',
  styleUrl: './appointment-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppointmentEditorComponent {
  private readonly data = inject<AppointmentEditorData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<AppointmentEditorComponent, boolean>);
  private readonly calendarApi = inject(CalendarApiService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly router = inject(Router);
  private readonly confirm = inject(BonaConfirm);
  private readonly toast = inject(BonaToast);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);
  private readonly i18n = injectI18n('calendar');

  get literals() {
    return this.i18n();
  }

  readonly editingId = signal(this.data.appointment?.id ?? null);
  readonly formValue = signal<BonaFormValue>(this.initialValue());
  private readonly formBaseline = signal<BonaFormValue>(this.initialValue());
  readonly moreOpen = signal(false);
  private readonly clientBonos = signal<ClientBonoDto[]>([]);
  private readonly trainers = this.data.trainers;
  private readonly clients = this.data.clients;
  private readonly services = this.data.services;
  private readonly bonos = this.data.bonos;

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
    const service = this.services.find((item) => item.id === serviceId);
    const primary: BonaFieldDefinition[] = [
      {
        key: 'clientId',
        label: this.literals.client,
        type: 'select',
        required: true,
        options: this.clients.map((client) => ({
          value: client.id,
          label: this.clientLabel(client),
        })),
      },
      {
        key: 'serviceId',
        label: this.literals.service,
        type: 'select',
        required: true,
        options: this.services.map((item) => ({
          value: item.id,
          label: item.name,
        })),
      },
      {
        key: 'trainerId',
        label: this.literals.trainer,
        type: 'select',
        required: true,
        options: this.trainers.map((trainer) => ({ value: trainer.id, label: trainer.name })),
      },
      {
        key: 'startsAt',
        label: this.literals.startsAt,
        type: 'datetime-local',
        required: true,
      },
    ];
    if (!this.moreOpen()) {
      return primary;
    }
    return [
      ...primary,
      {
        key: 'clientBonoId',
        label: this.literals.bono,
        type: 'select',
        options: this.bonoOptions(service),
      },
      {
        key: 'location',
        label: this.literals.location,
        type: 'text',
        required: true,
        placeholder: this.literals.locationPlaceholder,
      },
      {
        key: 'notes',
        label: this.literals.sessionNotes,
        type: 'textarea',
      },
    ];
  });

  constructor() {
    const clientId = this.formValue()['clientId'];
    if (clientId) {
      this.loadClientBonos(clientId);
    }
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
    this.formValue.set({ ...this.formValue(), ...next });
    if (nextClient && nextClient !== previousClient) {
      this.loadClientBonos(nextClient);
    }
    if (!nextClient) {
      this.clientBonos.set([]);
    }
  }

  onToggleMore(): void {
    this.moreOpen.update((open) => !open);
  }

  onClose(): void {
    this.dialogRef.close(false);
  }

  onSubmit(value: BonaFormValue): void {
    this.saveAppointment({ ...this.formValue(), ...value });
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

  onOpenClient(): void {
    const clientId = this.selectedClientId();
    if (!clientId) {
      return;
    }
    const openFicha = (): void => {
      this.dialogRef.close(false);
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

  private initialValue(): BonaFormValue {
    if (this.data.appointment) {
      return this.toFormValue(this.data.appointment);
    }
    return { ...EMPTY_APPOINTMENT_FORM, ...this.data.preset };
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
        this.toast.success(this.literals.saved);
        this.dialogRef.close(true);
      },
      error: (error) => this.toast.error(this.messageFor(error)),
    });
  }

  private loadClientBonos(clientId: string): void {
    this.clientsApi
      .getClientBonos(clientId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((rows) => this.clientBonos.set(rows));
  }

  private isFormDirty(): boolean {
    return this.formSnapshot(this.formValue()) !== this.formSnapshot(this.formBaseline());
  }

  private formSnapshot(value: BonaFormValue): string {
    const keys = Object.keys(EMPTY_APPOINTMENT_FORM).sort();
    return JSON.stringify(keys.map((key) => value[key] ?? ''));
  }

  private clientLabel(client: ClientDto): string {
    return `${client.firstName} ${client.lastName}`.trim();
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
      const bono = this.bonos.find((item) => item.id === contracted.bonoId);
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
    const service = this.services.find((item) => item.id === serviceId);
    if (!clientId || !service) {
      return '';
    }
    const now = new Date();
    const matching = this.clientBonos().filter((row) => {
      if (row.clientId !== clientId || !isBonoUsable(row, now)) {
        return false;
      }
      const bono = this.bonos.find((item) => item.id === row.bonoId);
      return bono?.serviceId === service.id;
    });
    const purchased = matching.filter((row) => !isGiftCredit(row));
    return pickPreferredBono(purchased, now)?.id ?? pickPreferredBono(matching, now)?.id ?? '';
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
    const location = (value['location'] ?? '').trim();
    const status = (value['status'] ?? 'confirmed') as AppointmentStatus;
    const endsAt =
      fromDatetimeLocalValue(this.endsAtFor(serviceId, value['startsAt'] ?? '', value['endsAt'] ?? '')) ||
      fromDatetimeLocalValue(value['endsAt'] ?? '');
    if (!trainerId || !clientId || !serviceId || !startsAt || !endsAt || !location) {
      this.toast.error(this.literals.errorRequired);
      return null;
    }
    const clientBonoId = value['clientBonoId'] ?? '';
    return {
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
  }

  private endsAtFor(serviceId: string, startsAtLocal: string, currentEnds: string): string {
    const service = this.services.find((item) => item.id === serviceId);
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
