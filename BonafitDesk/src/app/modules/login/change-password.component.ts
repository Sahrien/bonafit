import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BonaFormComponent, BonaFormValue } from '../../components/bona-form/bona-form.component';
import { BonaFieldDefinition } from '../../components/bona-field/bona-field.definition';
import { AUTH_PATHS, homeForRole } from '../../core/auth/auth.paths';
import { injectI18n } from '../../core/i18n/inject-i18n';
import { AuthApiService } from '../../services/auth-api.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [BonaFormComponent],
  templateUrl: './change-password.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangePasswordComponent {
  private readonly auth = inject(AuthApiService);
  private readonly router = inject(Router);

  private readonly i18n = injectI18n<Record<string, string>>('changePassword');
  get literals() {
    return this.i18n();
  }
  readonly submitting = signal(false);
  readonly error = signal('');
  readonly formValue = signal<BonaFormValue>({ newPassword: '' });

  readonly fields = computed<BonaFieldDefinition[]>(() => [
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
    const newPassword = value['newPassword'] ?? '';
    if (newPassword.length < 8) {
      this.error.set(this.literals.errorNewPassword);
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    this.auth.changePassword({ newPassword }).subscribe({
      next: () => {
        this.auth.getSession().subscribe((session) => {
          this.submitting.set(false);
          if (!session) {
            void this.router.navigateByUrl(AUTH_PATHS.login);
            return;
          }
          void this.router.navigateByUrl(homeForRole(session.user.role));
        });
      },
      error: () => {
        this.submitting.set(false);
        this.error.set(this.literals.errorSave);
      },
    });
  }
}
