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
import { forkJoin, map } from 'rxjs';
import { BonaButtonComponent } from '../../components/bona-button/bona-button.component';
import { BonaFieldDefinition } from '../../components/bona-field/bona-field.definition';
import { BonaFormComponent, BonaFormValue } from '../../components/bona-form/bona-form.component';
import {
  BonaGridAction,
  BonaGridActionEvent,
  BonaGridColumn,
  BonaGridComponent,
} from '../../components/bona-grid/bona-grid.component';
import { BonoDto } from '../../models/bono.dto';
import { ClientBonoDto, ClientBonoPatchDto } from '../../models/client-bono.dto';
import { ClientDto, ClientWriteDto } from '../../models/client.dto';
import { ClientsApiService } from '../../services/clients-api.service';
import { ServicesApiService } from '../../services/services-api.service';
import { fromDatetimeLocalValue, toDatetimeLocalValue } from '../calendar/calendar-datetime';
import { CLIENTS_LITERALS } from './clients.literals';

const NEW_CLIENT_ID = 'new';

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
  imports: [BonaFormComponent, BonaButtonComponent, BonaGridComponent],
  templateUrl: './client-ficha.component.html',
  styleUrl: './client-ficha.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientFichaComponent {
  private readonly clientsApi = inject(ClientsApiService);
  private readonly servicesApi = inject(ServicesApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly literals = CLIENTS_LITERALS;
  readonly formValue = signal<BonaFormValue>({ ...EMPTY_FORM });
  readonly error = signal('');
  readonly saving = signal(false);
  readonly temporaryPassword = signal('');
  readonly bonoFormOpen = signal(false);
  readonly bonoForm = signal<BonaFormValue>({ remainingSessions: '', expiresAt: '' });
  private readonly editingBonoId = signal<string | null>(null);
  private readonly clientBonos = signal<ClientBonoDto[]>([]);
  private readonly bonos = signal<BonoDto[]>([]);

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
    { field: 'name', header: CLIENTS_LITERALS.bonosTitle },
    { field: 'remainingSessions', header: CLIENTS_LITERALS.remainingSessions, type: 'number' },
    { field: 'expiresAtLabel', header: CLIENTS_LITERALS.expiresAt },
  ];

  readonly bonoActions: BonaGridAction[] = [
    { label: CLIENTS_LITERALS.editBono, action: 'edit' },
  ];

  readonly bonoFields: BonaFieldDefinition[] = [
    { key: 'remainingSessions', label: CLIENTS_LITERALS.remainingSessions, type: 'number', required: true },
    { key: 'expiresAt', label: CLIENTS_LITERALS.expiresAt, type: 'datetime-local' },
  ];

  readonly bonoRows = computed(() =>
    this.clientBonos().map((row) => ({
      ...row,
      name: this.bonos().find((bono) => bono.id === row.bonoId)?.name ?? row.bonoId,
      expiresAtLabel: row.expiresAt ?? this.literals.noExpiry,
    })),
  );

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
    this.clientsApi
      .deleteClient(this.clientId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.onBack(),
        error: () => this.error.set(this.literals.errorSave),
      });
  }

  onBonoAction(event: BonaGridActionEvent<Record<string, unknown>>): void {
    const id = String(event.item['id'] ?? '');
    const row = this.clientBonos().find((item) => item.id === id);
    if (!row) {
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

  private load(id: string): void {
    this.error.set('');
    this.bonoFormOpen.set(false);
    if (!id || id === NEW_CLIENT_ID) {
      this.formValue.set({ ...EMPTY_FORM });
      this.clientBonos.set([]);
      this.temporaryPassword.set('');
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
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ client, clientBonos, bonos }) => {
          this.formValue.set(this.toFormValue(client));
          this.clientBonos.set(clientBonos);
          this.bonos.set(bonos);
        },
        error: () => this.error.set(this.literals.errorLoad),
      });
  }

  private loadBonos(clientId: string): void {
    this.clientsApi
      .getClientBonos(clientId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((rows) => this.clientBonos.set(rows));
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
