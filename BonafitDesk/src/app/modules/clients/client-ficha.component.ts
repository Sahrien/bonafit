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
import { map } from 'rxjs';
import { BonaButtonComponent } from '../../components/bona-button/bona-button.component';
import { BonaFieldDefinition } from '../../components/bona-field/bona-field.definition';
import { BonaFormComponent, BonaFormValue } from '../../components/bona-form/bona-form.component';
import { ClientDto, ClientWriteDto } from '../../models/client.dto';
import { ClientsApiService } from '../../services/clients-api.service';
import { CLIENTS_LITERALS } from './clients.literals';

const NEW_CLIENT_ID = 'new';

const EMPTY_FORM: BonaFormValue = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  notes: '',
};

@Component({
  selector: 'app-client-ficha',
  standalone: true,
  imports: [BonaFormComponent, BonaButtonComponent],
  templateUrl: './client-ficha.component.html',
  styleUrl: './client-ficha.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientFichaComponent {
  private readonly clientsApi = inject(ClientsApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly literals = CLIENTS_LITERALS;
  readonly formValue = signal<BonaFormValue>({ ...EMPTY_FORM });
  readonly error = signal('');
  readonly saving = signal(false);

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
  ];

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
          void this.router.navigate(['/admin/clients', client.id]);
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

  private load(id: string): void {
    this.error.set('');
    if (!id || id === NEW_CLIENT_ID) {
      this.formValue.set({ ...EMPTY_FORM });
      return;
    }
    this.clientsApi
      .getClient(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (client) => this.formValue.set(this.toFormValue(client)),
        error: () => this.error.set(this.literals.errorLoad),
      });
  }

  private toFormValue(client: ClientDto): BonaFormValue {
    return {
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
      notes: client.notes,
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
    };
  }
}
