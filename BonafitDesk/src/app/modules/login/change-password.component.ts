import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BonaFormComponent, BonaFormValue } from '../../components/bona-form/bona-form.component';
import { BonaFieldDefinition } from '../../components/bona-field/bona-field.definition';
import { AUTH_PATHS, homeForRole } from '../../core/auth/auth.paths';
import { CHANGE_PASSWORD_LITERALS } from '../../i18n/es';
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
