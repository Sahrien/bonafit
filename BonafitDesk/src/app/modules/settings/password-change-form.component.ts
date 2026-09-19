import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { BonaButtonComponent } from '../../components/bona-button/bona-button.component';
import { BonaFieldDefinition } from '../../components/bona-field/bona-field.definition';
import { BonaFormComponent, BonaFormValue } from '../../components/bona-form/bona-form.component';
import { ApiBusinessError, BOOKING_ERROR_CODES } from '../../core/api-business.error';
import { injectI18n } from '../../core/i18n/inject-i18n';
import { AuthApiService } from '../../services/auth-api.service';

@Component({
  selector: 'app-password-change-form',
  standalone: true,
  imports: [BonaFormComponent, BonaButtonComponent],
  template: `
    @if (error()) {
      <p class="password-change-form__error">{{ error() }}</p>
    }
    <app-bona-form
      [fields]="fields()"
      [value]="formValue()"
      [showSubmit]="false"
      actionsAlign="start"
      [disabled]="submitting()"
      (valueChange)="onFormChange($event)"
      (submitted)="onSubmit($event)" />
    <div class="settings-save">
      <app-bona-button
        [text]="literals.submit"
        [disabled]="submitting()"
        (action)="onSubmit(formValue())" />
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .password-change-form__error {
      margin: 0 0 var(--bona-space-4);
      color: var(--bona-color-danger);
    }

    .settings-save {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--bona-space-2);
      margin: var(--bona-space-4) calc(-1 * var(--bona-space-4)) 0;
      padding: var(--bona-space-3) var(--bona-space-4) var(--bona-space-4);
      background: var(--bona-color-surface);
      border-top: 1px solid var(--bona-color-border);
      border-radius: 0 0 var(--bona-radius-lg) var(--bona-radius-lg);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordChangeFormComponent {
  private readonly auth = inject(AuthApiService);

  readonly saved = output<void>();

  private readonly i18n = injectI18n('changePassword');
  get literals() {
    return this.i18n();
  }
  readonly submitting = signal(false);
  readonly error = signal('');
  readonly formValue = signal<BonaFormValue>({ currentPassword: '', newPassword: '' });

  readonly fields = computed<BonaFieldDefinition[]>(() => [
    {
      key: 'currentPassword',
      label: this.literals.currentPassword,
      type: 'password',
      required: true,
    },
    {
      key: 'newPassword',
      label: this.literals.newPassword,
      type: 'password',
      required: true,
    },
  ]);

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
      error: (error: unknown) => {
        this.submitting.set(false);
        this.error.set(
          error instanceof ApiBusinessError && error.code === BOOKING_ERROR_CODES.invalidCurrentPassword
            ? this.literals.errorCurrentPassword
            : this.literals.errorSave,
        );
      },
    });
  }
}
