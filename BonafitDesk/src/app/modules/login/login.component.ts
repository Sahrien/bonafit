import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BonaFormComponent, BonaFormValue } from '../../components/bona-form/bona-form.component';
import { BonaFieldDefinition } from '../../components/bona-field/bona-field.definition';
import { AUTH_PATHS, homeForRole } from '../../core/auth/auth.paths';
import { LOGIN_LITERALS } from '../../i18n/es';
import { AuthApiService } from '../../services/auth-api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [BonaFormComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly auth = inject(AuthApiService);
  private readonly router = inject(Router);

  readonly literals = LOGIN_LITERALS;
  readonly submitting = signal(false);
  readonly error = signal('');
  readonly formValue = signal<BonaFormValue>({ email: '', password: '' });

  readonly fields: BonaFieldDefinition[] = [
    { key: 'email', label: LOGIN_LITERALS.email, type: 'email', required: true },
    { key: 'password', label: LOGIN_LITERALS.password, type: 'password', required: true },
  ];

  onFormChange(value: BonaFormValue): void {
    this.formValue.set(value);
  }

  onSubmit(value: BonaFormValue): void {
    const email = (value['email'] ?? '').trim();
    const password = value['password'] ?? '';
    if (!email || !password) {
      this.error.set(this.literals.errorRequired);
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    this.auth.login({ email, password }).subscribe({
      next: (session) => {
        this.submitting.set(false);
        const path = session.user.mustChangePassword
          ? AUTH_PATHS.changePassword
          : homeForRole(session.user.role);
        void this.router.navigateByUrl(path);
      },
      error: () => {
        this.submitting.set(false);
        this.error.set(this.literals.invalidCredentials);
      },
    });
  }
}
