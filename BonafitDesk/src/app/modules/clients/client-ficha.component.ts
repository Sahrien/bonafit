import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { filter, forkJoin, map, switchMap } from 'rxjs';
import { BonaButtonComponent } from '../../components/bona-button/bona-button.component';
import { BonaConfirm } from '../../components/bona-confirm/bona-confirm.service';
import { BonaFieldDefinition } from '../../components/bona-field/bona-field.definition';
import { BonaFormComponent, BonaFormValue } from '../../components/bona-form/bona-form.component';
import {
  BonaGridAction,
  BonaGridActionEvent,
  BonaGridColumn,
  BonaGridComponent,
} from '../../components/bona-grid/bona-grid.component';
import { BonaPageComponent } from '../../components/bona-page/bona-page.component';
import { MatIcon } from '@angular/material/icon';
import { BonaToast } from '../../components/bona-toast/bona-toast.service';
import { ApiBusinessError } from '../../core/api-business.error';
import { AppointmentDto, AppointmentStatus, AppointmentWriteDto } from '../../models/appointment.dto';
import { BonoDto } from '../../models/bono.dto';
import { ClientBonoDto, ClientBonoPatchDto, ContractBonoDto } from '../../models/client-bono.dto';
import { ClientCouponDto, ClientCouponWriteDto } from '../../models/client-coupon.dto';
import { ClientDto, ClientWriteDto } from '../../models/client.dto';
import { ServiceDto } from '../../models/service.dto';
import { TrainerDto } from '../../models/trainer.dto';
import { CalendarApiService } from '../../services/calendar-api.service';
import { ClientsApiService } from '../../services/clients-api.service';
import { ServicesApiService } from '../../services/services-api.service';
import { fromDatetimeLocalValue, toDatetimeLocalValue } from '../calendar/calendar-datetime';
import { injectI18n } from '../../core/i18n/inject-i18n';
import { LanguageService } from '../../core/i18n/language.service';

const NEW_CLIENT_ID = 'new';

const EMPTY_GIFT: BonaFormValue = {
  serviceId: '',
  kind: 'pack',
  bonoId: '',
};

const EMPTY_COUPON: BonaFormValue = {
  kind: 'percent',
  value: '',
  scope: 'any',
  serviceId: '',
  bonoId: '',
};

const GIFT_PACK = 'pack';
const GIFT_SINGLE = 'single';

const EMPTY_FORM: BonaFormValue = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  notes: '',
  instantConfirm: 'false',
};

const HISTORY_PAGE_SIZE = 10;

@Component({
  selector: 'app-client-ficha',
  standalone: true,
  imports: [
    BonaPageComponent,
    BonaFormComponent,
    BonaButtonComponent,
    BonaGridComponent,
    MatIcon,
  ],
  templateUrl: './client-ficha.component.html',
  styleUrl: './client-ficha.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientFichaComponent {
  private readonly clientsApi = inject(ClientsApiService);
  private readonly servicesApi = inject(ServicesApiService);
  private readonly calendarApi = inject(CalendarApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly confirm = inject(BonaConfirm);
  private readonly toast = inject(BonaToast);
  private readonly destroyRef = inject(DestroyRef);
  private readonly language = inject(LanguageService);

  private readonly i18n = injectI18n('clients');
  get literals() {
    return this.i18n();
  }
  readonly formValue = signal<BonaFormValue>({ ...EMPTY_FORM });
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly temporaryPassword = signal('');
  readonly bonoFormOpen = signal(false);
  readonly bonoForm = signal<BonaFormValue>({ remainingSessions: '', expiresAt: '' });
  readonly giftForm = signal<BonaFormValue>({ ...EMPTY_GIFT });
  readonly couponForm = signal<BonaFormValue>({ ...EMPTY_COUPON });
  readonly sessionNoteFormOpen = signal(false);
  readonly sessionNoteForm = signal<BonaFormValue>({ notes: '' });
  readonly historyOpen = signal(false);
  readonly historyPageSize = HISTORY_PAGE_SIZE;
  private readonly editingBonoId = signal<string | null>(null);
  private readonly editingSessionId = signal<string | null>(null);
  private readonly historyLoadedFor = signal<string | null>(null);
  private readonly clientBonos = signal<ClientBonoDto[]>([]);
  private readonly coupons = signal<ClientCouponDto[]>([]);
  private readonly bonos = signal<BonoDto[]>([]);
  private readonly services = signal<ServiceDto[]>([]);
  private readonly trainers = signal<TrainerDto[]>([]);
  private readonly appointments = signal<AppointmentDto[]>([]);

  private readonly clientId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('id') ?? '' },
  );

  readonly isNew = computed(() => this.clientId() === NEW_CLIENT_ID || !this.clientId());
  readonly title = computed(() =>
    this.isNew() ? this.literals.fichaNewTitle : this.literals.fichaTitle,
  );

  readonly fields = computed<BonaFieldDefinition[]>(() => [
    { key: 'firstName', label: this.literals.firstName, type: 'text', required: true },
    { key: 'lastName', label: this.literals.lastName, type: 'text', required: true },
    { key: 'email', label: this.literals.email, type: 'email', required: true },
    { key: 'phone', label: this.literals.phone, type: 'tel' },
    { key: 'notes', label: this.literals.notes, type: 'textarea' },
    {
      key: 'instantConfirm',
      label: this.literals.instantConfirm,
      type: 'select',
      options: [
        { value: 'true', label: this.literals.yes },
        { value: 'false', label: this.literals.no },
      ],
    },
  ]);

  readonly bonoColumns = computed<BonaGridColumn[]>(() => [
    { field: 'serviceName', header: this.literals.service },
    { field: 'name', header: this.literals.bono },
    { field: 'remainingSessions', header: this.literals.remainingSessions, type: 'number' },
    { field: 'expiresAtLabel', header: this.literals.expiresAt },
  ]);

  readonly bonoActions = computed<BonaGridAction[]>(() => [
    { label: this.literals.editBono, action: 'edit' },
    { label: this.literals.unassign, action: 'unassign' },
  ]);

  readonly bonoFields = computed<BonaFieldDefinition[]>(() => [
    { key: 'remainingSessions', label: this.literals.remainingSessions, type: 'number', required: true },
    { key: 'expiresAt', label: this.literals.expiresAt, type: 'datetime-local' },
  ]);

  readonly bonoRows = computed(() =>
    this.clientBonos().map((row) => {
      const bono = this.bonos().find((item) => item.id === row.bonoId);
      const service = this.services().find((item) => item.id === bono?.serviceId);
      return {
        ...row,
        serviceName: service?.name ?? '',
        name: this.assignedBonoLabel(row, bono),
        expiresAtLabel: row.expiresAt ?? this.literals.noExpiry,
      };
    }),
  );

  readonly historyColumns = computed<BonaGridColumn[]>(() => [
    {
      field: 'whenLabel',
      header: this.literals.sessionWhen,
      sortField: 'startsAt',
      type: 'date',
    },
    { field: 'serviceName', header: this.literals.service },
    { field: 'trainerName', header: this.literals.trainer },
    { field: 'statusLabel', header: this.literals.sessionStatus },
    { field: 'notes', header: this.literals.sessionNotes },
  ]);

  readonly historyActions = computed<BonaGridAction[]>(() => [
    { label: this.literals.editSessionNote, action: 'editNote' },
  ]);

  readonly sessionNoteFields = computed<BonaFieldDefinition[]>(() => [
    { key: 'notes', label: this.literals.sessionNotes, type: 'textarea' },
  ]);

  readonly historyRows = computed(() =>
    [...this.appointments()]
      .sort((left, right) => Date.parse(right.startsAt) - Date.parse(left.startsAt))
      .map((row) => {
        const service = this.services().find((item) => item.id === row.serviceId);
        const trainer = this.trainers().find((item) => item.id === row.trainerId);
        return {
          id: row.id,
          startsAt: row.startsAt,
          whenLabel: this.formatSessionWhen(row.startsAt),
          serviceName: service?.name ?? '',
          trainerName: trainer?.name ?? '',
          statusLabel: this.statusLabel(row.status),
          notes: row.notes ?? '',
        };
      }),
  );

  readonly giftFields = computed((): BonaFieldDefinition[] => {
    const serviceId = this.giftForm()['serviceId'] ?? '';
    const kind = this.giftForm()['kind'] ?? GIFT_PACK;
    const fields: BonaFieldDefinition[] = [
      {
        key: 'serviceId',
        label: this.literals.service,
        type: 'select',
        required: true,
        options: this.services()
          .filter((service) => service.active)
          .map((service) => ({ value: service.id, label: service.name })),
      },
      {
        key: 'kind',
        label: this.literals.giftKind,
        type: 'select',
        required: true,
        options: [
          { value: GIFT_PACK, label: this.literals.giftPack },
          { value: GIFT_SINGLE, label: this.literals.giftSingle },
        ],
      },
    ];
    if (kind === GIFT_PACK) {
      fields.push({
        key: 'bonoId',
        label: this.literals.bono,
        type: 'select',
        required: true,
        options: this.bonos()
          .filter((bono) => bono.serviceId === serviceId)
          .map((bono) => ({ value: bono.id, label: bono.name })),
      });
    }
    return fields;
  });

  readonly couponColumns = computed<BonaGridColumn[]>(() => [
    { field: 'kindLabel', header: this.literals.couponKind },
    { field: 'valueLabel', header: this.literals.couponValue },
    { field: 'scopeLabel', header: this.literals.couponScope },
    { field: 'statusLabel', header: this.literals.couponStatus },
  ]);

  readonly couponActions = computed<BonaGridAction[]>(() => [
    { label: this.literals.delete, action: 'delete', visible: (item) => !item['usedAt'] },
  ]);

  readonly couponRows = computed(() =>
    this.coupons().map((row) => ({
      ...row,
      kindLabel: row.kind === 'percent' ? this.literals.couponPercent : this.literals.couponAmount,
      valueLabel: row.kind === 'percent' ? `${row.value}%` : String(row.value),
      scopeLabel: this.couponScopeLabel(row),
      statusLabel: row.usedAt ? this.literals.couponUsed : this.literals.couponUnused,
    })),
  );

  readonly couponFields = computed((): BonaFieldDefinition[] => {
    const scope = this.couponForm()['scope'] ?? 'any';
    const fields: BonaFieldDefinition[] = [
      {
        key: 'kind',
        label: this.literals.couponKind,
        type: 'select',
        required: true,
        options: [
          { value: 'percent', label: this.literals.couponPercent },
          { value: 'amount', label: this.literals.couponAmount },
        ],
      },
      { key: 'value', label: this.literals.couponValue, type: 'number', required: true },
      {
        key: 'scope',
        label: this.literals.couponScope,
        type: 'select',
        required: true,
        options: [
          { value: 'any', label: this.literals.couponAny },
          { value: 'service', label: this.literals.couponService },
          { value: 'bono', label: this.literals.couponBono },
        ],
      },
    ];
    if (scope === 'service' || scope === 'bono') {
      fields.push({
        key: 'serviceId',
        label: this.literals.service,
        type: 'select',
        required: true,
        options: this.services()
          .filter((service) => service.active)
          .map((service) => ({ value: service.id, label: service.name })),
      });
    }
    if (scope === 'bono') {
      const serviceId = this.couponForm()['serviceId'] ?? '';
      fields.push({
        key: 'bonoId',
        label: this.literals.bono,
        type: 'select',
        required: true,
        options: this.bonos()
          .filter((bono) => bono.serviceId === serviceId)
          .map((bono) => ({ value: bono.id, label: bono.name })),
      });
    }
    return fields;
  });

  constructor() {
    effect(() => {
      const id = this.clientId();
      untracked(() => this.load(id));
    });
  }

  onFormChange(value: BonaFormValue): void {
    this.formValue.set(value);
  }

  onBack(): void {
    void this.router.navigateByUrl('/admin/clients');
  }

  onSubmit(value: BonaFormValue): void {
    const payload = this.toWriteDto(value);
    if (!payload) {
      return;
    }
    this.saving.set(true);
    const id = this.clientId();
    const request = this.isNew()
      ? this.clientsApi.createClient(payload)
      : this.clientsApi.updateClient(id, payload);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (client) => {
        this.saving.set(false);
        if (this.isNew()) {
          void this.router.navigate(['/admin/clients', client.id], {
            state: { temporaryPassword: client.temporaryPassword ?? '' },
          });
          return;
        }
        this.formValue.set(this.toFormValue(client));
        this.toast.success(this.literals.saved);
      },
      error: () => {
        this.saving.set(false);
        this.toast.error(this.literals.errorSave);
      },
    });
  }

  onDelete(): void {
    if (this.isNew()) {
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
        switchMap(() => this.clientsApi.deleteClient(this.clientId())),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.toast.success(this.literals.deleted);
          this.onBack();
        },
        error: () => this.toast.error(this.literals.errorSave),
      });
  }

  onGiftFormChange(value: BonaFormValue): void {
    const previousService = this.giftForm()['serviceId'] ?? '';
    const nextService = value['serviceId'] ?? '';
    if (nextService !== previousService) {
      this.giftForm.set({ ...value, bonoId: '' });
      return;
    }
    this.giftForm.set(value);
  }

  onGiftSubmit(value: BonaFormValue): void {
    const payload = this.toGiftPayload(value);
    if (!payload) {
      return;
    }
    const kind = value['kind'] ?? GIFT_PACK;
    this.confirm
      .open({
        title: this.literals.confirmGiftTitle,
        message:
          kind === GIFT_SINGLE
            ? this.literals.confirmGiftSingleMessage
            : this.literals.confirmGiftPackMessage,
        confirmLabel: this.literals.gift,
      })
      .pipe(
        filter((ok) => ok),
        switchMap(() => this.clientsApi.contractBono(payload)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.toast.success(this.literals.gifted);
          this.giftForm.set({ ...EMPTY_GIFT, serviceId: value['serviceId'] ?? '' });
          this.loadBonos(payload.clientId);
        },
        error: () => this.toast.error(this.literals.giftError),
      });
  }

  onCouponFormChange(value: BonaFormValue): void {
    const previousScope = this.couponForm()['scope'] ?? 'any';
    const previousService = this.couponForm()['serviceId'] ?? '';
    const nextScope = value['scope'] ?? 'any';
    const nextService = value['serviceId'] ?? '';
    if (nextScope !== previousScope) {
      this.couponForm.set({ ...value, serviceId: '', bonoId: '' });
      return;
    }
    if (nextService !== previousService) {
      this.couponForm.set({ ...value, bonoId: '' });
      return;
    }
    this.couponForm.set(value);
  }

  onCouponSubmit(value: BonaFormValue): void {
    const clientId = this.clientId();
    const payload = this.toCouponPayload(value);
    if (!clientId || this.isNew() || !payload) {
      return;
    }
    this.clientsApi
      .createCoupon(clientId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success(this.literals.couponGifted);
          this.couponForm.set({ ...EMPTY_COUPON });
          this.loadCoupons(clientId);
        },
        error: () => this.toast.error(this.literals.errorSave),
      });
  }

  onCouponAction(event: BonaGridActionEvent<Record<string, unknown>>): void {
    const id = String(event.item['id'] ?? '');
    const clientId = this.clientId();
    if (event.action !== 'delete' || !id || !clientId) {
      return;
    }
    this.confirm
      .open({
        title: this.literals.confirmDeleteCouponTitle,
        message: this.literals.confirmDeleteCouponMessage,
        confirmLabel: this.literals.delete,
      })
      .pipe(
        filter((ok) => ok),
        switchMap(() => this.clientsApi.deleteCoupon(clientId, id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.toast.success(this.literals.deleted);
          this.loadCoupons(clientId);
        },
        error: () => this.toast.error(this.literals.errorSave),
      });
  }

  onBonoAction(event: BonaGridActionEvent<Record<string, unknown>>): void {
    const id = String(event.item['id'] ?? '');
    if (event.action === 'unassign' && id) {
      this.unassignBono(id);
      return;
    }
    const row = this.clientBonos().find((item) => item.id === id);
    if (!row || event.action !== 'edit') {
      return;
    }
    this.editingBonoId.set(row.id);
    this.bonoForm.set({
      remainingSessions: String(row.remainingSessions),
      expiresAt: row.expiresAt ? toDatetimeLocalValue(row.expiresAt) : '',
    });
    this.bonoFormOpen.set(true);
  }

  onBonoFormChange(value: BonaFormValue): void {
    this.bonoForm.set(value);
  }

  onSaveBono(value: BonaFormValue): void {
    const id = this.editingBonoId();
    if (!id) {
      return;
    }
    const remainingSessions = Number(value['remainingSessions']);
    if (Number.isNaN(remainingSessions) || remainingSessions < 0) {
      this.toast.error(this.literals.errorRequired);
      return;
    }
    const expiresLocal = (value['expiresAt'] ?? '').trim();
    const payload: ClientBonoPatchDto = {
      remainingSessions,
      expiresAt: expiresLocal ? fromDatetimeLocalValue(expiresLocal) : null,
    };
    this.clientsApi
      .updateClientBono(id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.bonoFormOpen.set(false);
          this.editingBonoId.set(null);
          this.loadBonos(this.clientId());
          this.toast.success(this.literals.saved);
        },
        error: () => this.toast.error(this.literals.errorSave),
      });
  }

  onCancelBono(): void {
    this.bonoFormOpen.set(false);
    this.editingBonoId.set(null);
  }

  onToggleHistory(): void {
    if (this.historyOpen()) {
      this.historyOpen.set(false);
      this.onCancelSessionNote();
      return;
    }
    this.historyOpen.set(true);
    this.ensureHistory();
  }

  onHistoryAction(event: BonaGridActionEvent<Record<string, unknown>>): void {
    const id = String(event.item['id'] ?? '');
    const appointment = this.appointments().find((item) => item.id === id);
    if (!appointment || event.action !== 'editNote') {
      return;
    }
    this.editingSessionId.set(appointment.id);
    this.sessionNoteForm.set({ notes: appointment.notes ?? '' });
    this.sessionNoteFormOpen.set(true);
  }

  onSessionNoteFormChange(value: BonaFormValue): void {
    this.sessionNoteForm.set(value);
  }

  onSaveSessionNote(value: BonaFormValue): void {
    const id = this.editingSessionId();
    const appointment = this.appointments().find((item) => item.id === id);
    if (!appointment) {
      return;
    }
    const payload = this.toAppointmentWrite(appointment, (value['notes'] ?? '').trim());
    this.calendarApi
      .updateAppointment(appointment.id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.appointments.update((rows) =>
            rows.map((row) => (row.id === updated.id ? updated : row)),
          );
          this.onCancelSessionNote();
          this.toast.success(this.literals.saved);
        },
        error: () => this.toast.error(this.literals.errorSave),
      });
  }

  onCancelSessionNote(): void {
    this.sessionNoteFormOpen.set(false);
    this.editingSessionId.set(null);
  }

  private unassignBono(id: string): void {
    this.confirm
      .open({
        title: this.literals.confirmUnassignTitle,
        message: this.literals.confirmUnassignMessage,
        confirmLabel: this.literals.unassign,
      })
      .pipe(
        filter((ok) => ok),
        switchMap(() => this.clientsApi.deleteClientBono(id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          if (this.editingBonoId() === id) {
            this.bonoFormOpen.set(false);
            this.editingBonoId.set(null);
          }
          this.toast.success(this.literals.unassigned);
          this.loadBonos(this.clientId());
        },
        error: (error: unknown) => {
          if (error instanceof ApiBusinessError && error.code === 'client-bono.hasRelations') {
            this.toast.error(this.literals.errorAssigned);
            return;
          }
          this.toast.error(this.literals.giftError);
        },
      });
  }

  private load(id: string): void {
    this.bonoFormOpen.set(false);
    this.sessionNoteFormOpen.set(false);
    this.historyOpen.set(false);
    this.historyLoadedFor.set(null);
    this.appointments.set([]);
    this.giftForm.set({ ...EMPTY_GIFT });
    this.couponForm.set({ ...EMPTY_COUPON });
    if (!id || id === NEW_CLIENT_ID) {
      this.formValue.set({ ...EMPTY_FORM });
      this.clientBonos.set([]);
      this.coupons.set([]);
      this.temporaryPassword.set('');
      this.loading.set(false);
      return;
    }
    const createdPassword =
      typeof history.state?.['temporaryPassword'] === 'string'
        ? String(history.state['temporaryPassword'])
        : '';
    this.temporaryPassword.set(createdPassword);
    forkJoin({
      client: this.clientsApi.getClient(id),
      clientBonos: this.clientsApi.getClientBonos(id),
      coupons: this.clientsApi.getCoupons(id),
      bonos: this.servicesApi.getBonos(),
      services: this.servicesApi.getServices(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ client, clientBonos, coupons, bonos, services }) => {
          this.formValue.set(this.toFormValue(client));
          this.clientBonos.set(clientBonos);
          this.coupons.set(coupons);
          this.bonos.set(bonos);
          this.services.set(services);
          this.loading.set(false);
        },
        error: () => {
          this.toast.error(this.literals.errorLoad);
          this.loading.set(false);
        },
      });
  }

  private ensureHistory(): void {
    const clientId = this.clientId();
    if (!clientId || this.isNew() || this.historyLoadedFor() === clientId) {
      return;
    }
    this.loadHistory(clientId);
  }

  private loadHistory(clientId: string): void {
    forkJoin({
      trainers: this.calendarApi.getTrainers(),
      appointments: this.calendarApi.getAppointments({ clientId }),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ trainers, appointments }) => {
          this.trainers.set(trainers);
          this.appointments.set(appointments);
          this.historyLoadedFor.set(clientId);
        },
      });
  }

  private loadBonos(clientId: string): void {
    this.clientsApi
      .getClientBonos(clientId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((rows) => this.clientBonos.set(rows));
  }

  private loadCoupons(clientId: string): void {
    this.clientsApi
      .getCoupons(clientId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((rows) => this.coupons.set(rows));
  }

  private couponScopeLabel(row: ClientCouponDto): string {
    if (row.bonoId) {
      return this.bonos().find((bono) => bono.id === row.bonoId)?.name ?? this.literals.couponBono;
    }
    if (row.serviceId) {
      return this.services().find((service) => service.id === row.serviceId)?.name ?? this.literals.couponService;
    }
    return this.literals.couponAny;
  }

  private toCouponPayload(value: BonaFormValue): ClientCouponWriteDto | null {
    const kind = value['kind'] === 'amount' ? 'amount' : 'percent';
    const amount = Number(value['value']);
    if (Number.isNaN(amount) || amount <= 0) {
      this.toast.error(this.literals.errorRequired);
      return null;
    }
    const scope = value['scope'] ?? 'any';
    const payload: ClientCouponWriteDto = { kind, value: amount };
    if (scope === 'service' || scope === 'bono') {
      const serviceId = value['serviceId'] ?? '';
      if (!serviceId) {
        this.toast.error(this.literals.errorRequired);
        return null;
      }
      payload.serviceId = scope === 'service' ? serviceId : undefined;
      if (scope === 'bono') {
        const bonoId = value['bonoId'] ?? '';
        if (!bonoId) {
          this.toast.error(this.literals.errorRequired);
          return null;
        }
        payload.bonoId = bonoId;
      }
    }
    return payload;
  }

  private formatSessionWhen(iso: string): string {
    return new Date(iso).toLocaleString(this.language.locale(), {
      timeZone: 'Europe/Madrid',
      dateStyle: 'short',
      timeStyle: 'short',
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

  private toAppointmentWrite(row: AppointmentDto, notes: string): AppointmentWriteDto {
    return {
      trainerId: row.trainerId,
      clientId: row.clientId,
      serviceId: row.serviceId,
      clientBonoId: row.clientBonoId ?? null,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      location: row.location,
      status: row.status,
      notes,
    };
  }

  private assignedBonoLabel(row: ClientBonoDto, bono: BonoDto | undefined): string {
    if (row.isGift) {
      return this.literals.giftCredit;
    }
    if (bono?.sessionCount === 1) {
      return this.literals.singleSession;
    }
    return bono?.name ?? row.bonoId;
  }

  private toGiftPayload(value: BonaFormValue): ContractBonoDto | null {
    const clientId = this.clientId();
    if (!clientId || this.isNew()) {
      return null;
    }
    const serviceId = (value['serviceId'] ?? '').trim();
    const kind = value['kind'] ?? GIFT_PACK;
    if (!serviceId) {
      this.toast.error(this.literals.errorRequired);
      return null;
    }
    if (kind === GIFT_SINGLE) {
      return { clientId, serviceId, remainingSessions: 1, isGift: true };
    }
    const bonoId = (value['bonoId'] ?? '').trim();
    if (!bonoId) {
      this.toast.error(this.literals.errorRequired);
      return null;
    }
    return { clientId, bonoId, isGift: true };
  }

  private toFormValue(client: ClientDto): BonaFormValue {
    return {
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
      notes: client.notes,
      instantConfirm: client.instantConfirm ? 'true' : 'false',
    };
  }

  private toWriteDto(value: BonaFormValue): ClientWriteDto | null {
    const firstName = (value['firstName'] ?? '').trim();
    const lastName = (value['lastName'] ?? '').trim();
    const email = (value['email'] ?? '').trim();
    if (!firstName || !lastName || !email) {
      this.toast.error(this.literals.errorRequired);
      return null;
    }
    return {
      firstName,
      lastName,
      email,
      phone: (value['phone'] ?? '').trim(),
      notes: (value['notes'] ?? '').trim(),
      instantConfirm: value['instantConfirm'] === 'true',
    };
  }
}
