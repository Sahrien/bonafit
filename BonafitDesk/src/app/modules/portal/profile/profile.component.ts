import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, switchMap, take } from 'rxjs';
import { BonaFieldDefinition } from '../../../components/bona-field/bona-field.definition';
import { BonaFormComponent, BonaFormValue } from '../../../components/bona-form/bona-form.component';
import { ClientDto, ClientWriteDto } from '../../../models/client.dto';
import { AuthApiService } from '../../../services/auth-api.service';
import { ClientsApiService } from '../../../services/clients-api.service';
import { PROFILE_LITERALS } from './profile.literals';

@Component({
  selector: 'app-portal-profile',
  standalone: true,
  imports: [BonaFormComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private readonly auth = inject(AuthApiService);
  private readonly clientsApi = inject(ClientsApiService);

  readonly literals = PROFILE_LITERALS;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly feedback = signal('');
  readonly formValue = signal<BonaFormValue>({});

  readonly fields: BonaFieldDefinition[] = [
    { key: 'firstName', label: PROFILE_LITERALS.firstName, type: 'text', required: true },
    { key: 'lastName', label: PROFILE_LITERALS.lastName, type: 'text', required: true },
    { key: 'email', label: PROFILE_LITERALS.email, type: 'email', required: true },
    { key: 'phone', label: PROFILE_LITERALS.phone, type: 'tel' },
    { key: 'notes', label: PROFILE_LITERALS.notes, type: 'textarea' },
  ];

  private clientId = '';

  constructor() {
    this.auth
      .getSession()
      .pipe(
        take(1),
        switchMap((session) => {
          const clientId = session?.user.clientId;
          if (!clientId) {
            this.loading.set(false);
            this.error.set(PROFILE_LITERALS.noSession);
            return EMPTY;
          }
          this.clientId = clientId;
          return this.clientsApi.getClient(clientId);
        }),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (client) => {
          this.formValue.set(this.toFormValue(client));
          this.loading.set(false);
        },
        error: () => {
          this.error.set(PROFILE_LITERALS.loadError);
          this.loading.set(false);
        },
      });
  }

  onSave(value: BonaFormValue): void {
    if (!this.clientId || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.feedback.set('');
    this.clientsApi.updateClient(this.clientId, this.toWriteDto(value)).subscribe({
      next: (client) => {
        this.formValue.set(this.toFormValue(client));
        this.saving.set(false);
        this.feedback.set(PROFILE_LITERALS.saved);
      },
      error: () => {
        this.saving.set(false);
        this.feedback.set(PROFILE_LITERALS.saveError);
      },
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

  private toWriteDto(value: BonaFormValue): ClientWriteDto {
    return {
      firstName: value['firstName'] ?? '',
      lastName: value['lastName'] ?? '',
      email: value['email'] ?? '',
      phone: value['phone'] ?? '',
      notes: value['notes'] ?? '',
    };
  }
}
