import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { BonaButtonComponent } from '../../components/bona-button/bona-button.component';
import { BonaFieldDefinition } from '../../components/bona-field/bona-field.definition';
import { BonaFormComponent, BonaFormValue } from '../../components/bona-form/bona-form.component';
import { BonaToast } from '../../components/bona-toast/bona-toast.service';
import { ApiBusinessError, BOOKING_ERROR_CODES } from '../../core/api-business.error';
import { injectI18n } from '../../core/i18n/inject-i18n';
import { AuthApiService } from '../../services/auth-api.service';

@Component({
  selector: 'app-password-change-form',
  standalone: true,
  imports: [BonaFormComponent, BonaButtonComponent],
  template: `
    <app-bona-form
      [fields]="fields()"
      [value]="formValue()"
      [showSubmit]="false"
      actionsAlign="start"
      [disabled]="submitting()"
      (valueChange)="onFormChange($event)"
      (submitted)="onSubmit($event)" />
    <div class="page-section__save">
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordChangeFormComponent {
  private readonly auth = inject(AuthApiService);
  private readonly toast = inject(BonaToast);

  readonly saved = output<void>();

  private readonly i18n = injectI18n('changePassword');
  get literals() {
    return this.i18n();
  }
  readonly submitting = signal(false);
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
      this.toast.error(this.literals.errorRequired);
      return;
    }
    this.submitting.set(true);
    this.auth.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.formValue.set({ currentPassword: '', newPassword: '' });
        this.saved.emit();
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.toast.error(
          error instanceof ApiBusinessError && error.code === BOOKING_ERROR_CODES.invalidCurrentPassword
            ? this.literals.errorCurrentPassword
            : this.literals.errorSave,
        );
      },
    });
  }
}
