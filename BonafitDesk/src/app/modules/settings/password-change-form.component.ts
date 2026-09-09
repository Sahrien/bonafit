import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { BonaFieldDefinition } from '../../components/bona-field/bona-field.definition';
import { BonaFormComponent, BonaFormValue } from '../../components/bona-form/bona-form.component';
import { CHANGE_PASSWORD_LITERALS } from '../../i18n/es';
import { AuthApiService } from '../../services/auth-api.service';

@Component({
  selector: 'app-password-change-form',
  standalone: true,
  imports: [BonaFormComponent],
  template: `
    @if (error()) {
      <p class="password-change-form__error">{{ error() }}</p>
    }
    <app-bona-form
      [fields]="fields"
      [value]="formValue()"
      [submitText]="literals.submit"
      [disabled]="submitting()"
      (valueChange)="onFormChange($event)"
      (submitted)="onSubmit($event)" />
  `,
  styles: `
    .password-change-form__error {
      margin: 0 0 var(--bona-space-4);
      color: var(--bona-color-danger);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordChangeFormComponent {
  private readonly auth = inject(AuthApiService);

  readonly saved = output<void>();

  readonly literals = CHANGE_PASSWORD_LITERALS;
  readonly submitting = signal(false);
  readonly error = signal('');
  readonly formValue = signal<BonaFormValue>({ currentPassword: '', newPassword: '' });

  readonly fields: BonaFieldDefinition[] = [
    {
      key: 'currentPassword',
      label: CHANGE_PASSWORD_LITERALS.currentPassword,
      type: 'password',
      required: true,
    },
    {
      key: 'newPassword',
      label: CHANGE_PASSWORD_LITERALS.newPassword,
      type: 'password',
      required: true,
    },
  ];

  onFormChange(value: BonaFormValue): void {
    this.formValue.set(value);
  }

  onSubmit(value: BonaFormValue): void {
    const currentPassword = value['currentPassword'] ?? '';
    const newPassword = value['newPassword'] ?? '';
    if (!currentPassword || newPassword.length < 8) {
      this.error.set(this.literals.errorRequired);
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    this.auth.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.formValue.set({ currentPassword: '', newPassword: '' });
        this.saved.emit();
      },
      error: () => {
        this.submitting.set(false);
        this.error.set(this.literals.errorSave);
      },
    });
  }
}
