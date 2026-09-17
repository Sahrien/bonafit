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
import { BonaToast } from '../../components/bona-toast/bona-toast.service';
import { ApiBusinessError } from '../../core/api-business.error';
import { BonoDto } from '../../models/bono.dto';
import { ClientBonoDto, ClientBonoPatchDto, ContractBonoDto } from '../../models/client-bono.dto';
import { ClientDto, ClientWriteDto } from '../../models/client.dto';
import { ServiceDto } from '../../models/service.dto';
import { ClientsApiService } from '../../services/clients-api.service';
import { ServicesApiService } from '../../services/services-api.service';
import { fromDatetimeLocalValue, toDatetimeLocalValue } from '../calendar/calendar-datetime';
import { CLIENTS_LITERALS } from './clients.literals';

const NEW_CLIENT_ID = 'new';

const EMPTY_GIFT: BonaFormValue = {
  serviceId: '',
  kind: 'pack',
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

@Component({
  selector: 'app-client-ficha',
  standalone: true,
  imports: [BonaPageComponent, BonaFormComponent, BonaButtonComponent, BonaGridComponent],
  templateUrl: './client-ficha.component.html',
  styleUrl: './client-ficha.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientFichaComponent {
  private readonly clientsApi = inject(ClientsApiService);
  private readonly servicesApi = inject(ServicesApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly confirm = inject(BonaConfirm);
  private readonly toast = inject(BonaToast);
  private readonly destroyRef = inject(DestroyRef);

  readonly literals = CLIENTS_LITERALS;
  readonly formValue = signal<BonaFormValue>({ ...EMPTY_FORM });
  readonly error = signal('');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly temporaryPassword = signal('');
  readonly bonoFormOpen = signal(false);
  readonly bonoForm = signal<BonaFormValue>({ remainingSessions: '', expiresAt: '' });
  readonly giftForm = signal<BonaFormValue>({ ...EMPTY_GIFT });
  private readonly editingBonoId = signal<string | null>(null);
  private readonly clientBonos = signal<ClientBonoDto[]>([]);
  private readonly bonos = signal<BonoDto[]>([]);
  private readonly services = signal<ServiceDto[]>([]);

  private readonly clientId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('id') ?? '' },
  );

  readonly isNew = computed(() => this.clientId() === NEW_CLIENT_ID || !this.clientId());
  readonly title = computed(() =>
    this.isNew() ? this.literals.fichaNewTitle : this.literals.fichaTitle,
  );

  readonly fields: BonaFieldDefinition[] = [
    { key: 'firstName', label: CLIENTS_LITERALS.firstName, type: 'text', required: true },
    { key: 'lastName', label: CLIENTS_LITERALS.lastName, type: 'text', required: true },
    { key: 'email', label: CLIENTS_LITERALS.email, type: 'email', required: true },
    { key: 'phone', label: CLIENTS_LITERALS.phone, type: 'tel' },
    { key: 'notes', label: CLIENTS_LITERALS.notes, type: 'textarea' },
    {
      key: 'instantConfirm',
      label: CLIENTS_LITERALS.instantConfirm,
      type: 'select',
      options: [
        { value: 'true', label: CLIENTS_LITERALS.yes },
        { value: 'false', label: CLIENTS_LITERALS.no },
      ],
    },
  ];

  readonly bonoColumns: BonaGridColumn[] = [
    { field: 'serviceName', header: CLIENTS_LITERALS.service },
    { field: 'name', header: CLIENTS_LITERALS.bono },
    { field: 'remainingSessions', header: CLIENTS_LITERALS.remainingSessions, type: 'number' },
    { field: 'expiresAtLabel', header: CLIENTS_LITERALS.expiresAt },
  ];

  readonly bonoActions: BonaGridAction[] = [
    { label: CLIENTS_LITERALS.editBono, action: 'edit' },
    { label: CLIENTS_LITERALS.unassign, action: 'unassign' },
  ];

  readonly bonoFields: BonaFieldDefinition[] = [
    { key: 'remainingSessions', label: CLIENTS_LITERALS.remainingSessions, type: 'number', required: true },
    { key: 'expiresAt', label: CLIENTS_LITERALS.expiresAt, type: 'datetime-local' },
  ];

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
      },
      error: () => {
        this.saving.set(false);
        this.error.set(this.literals.errorSave);
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
      this.error.set(this.literals.errorRequired);
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
        },
        error: () => this.error.set(this.literals.errorSave),
      });
  }

  onCancelBono(): void {
    this.bonoFormOpen.set(false);
    this.editingBonoId.set(null);
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
    this.error.set('');
    this.bonoFormOpen.set(false);
    this.giftForm.set({ ...EMPTY_GIFT });
    if (!id || id === NEW_CLIENT_ID) {
      this.formValue.set({ ...EMPTY_FORM });
      this.clientBonos.set([]);
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
      bonos: this.servicesApi.getBonos(),
      services: this.servicesApi.getServices(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ client, clientBonos, bonos, services }) => {
          this.formValue.set(this.toFormValue(client));
          this.clientBonos.set(clientBonos);
          this.bonos.set(bonos);
          this.services.set(services);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(this.literals.errorLoad);
          this.loading.set(false);
        },
      });
  }

  private loadBonos(clientId: string): void {
    this.clientsApi
      .getClientBonos(clientId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((rows) => this.clientBonos.set(rows));
  }

  private assignedBonoLabel(row: ClientBonoDto, bono: BonoDto | undefined): string {
    if (row.remainingSessions === 1 && (bono?.sessionCount ?? 1) !== 1) {
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
      this.error.set(this.literals.errorRequired);
      return null;
    }
    if (kind === GIFT_SINGLE) {
      return { clientId, serviceId, remainingSessions: 1 };
    }
    const bonoId = (value['bonoId'] ?? '').trim();
    if (!bonoId) {
      this.error.set(this.literals.errorRequired);
      return null;
    }
    return { clientId, bonoId };
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
      this.error.set(this.literals.errorRequired);
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
