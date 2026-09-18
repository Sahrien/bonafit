import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BonaFormComponent, BonaFormValue } from '../../components/bona-form/bona-form.component';
import { BonaLanguageSwitcherComponent } from '../../components/bona-language-switcher/bona-language-switcher.component';
import { BonaFieldDefinition } from '../../components/bona-field/bona-field.definition';
import { AUTH_PATHS, homeForRole } from '../../core/auth/auth.paths';
import { injectI18n } from '../../core/i18n/inject-i18n';
import { LanguageService } from '../../core/i18n/language.service';
import { AuthApiService } from '../../services/auth-api.service';
import { BrandThemeService } from '../../core/brand-theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [BonaFormComponent, BonaLanguageSwitcherComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly auth = inject(AuthApiService);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);
  readonly brandTheme = inject(BrandThemeService);

  private readonly i18n = injectI18n('login');
  get literals() {
    return this.i18n();
  }
  readonly submitting = signal(false);
  readonly error = signal('');
  readonly formValue = signal<BonaFormValue>({ email: '', password: '' });

  readonly fields = computed<BonaFieldDefinition[]>(() => [
    {
      key: 'email',
      label: this.literals.email,
      type: 'email',
      required: true,
      autocomplete: 'username',
    },
    {
      key: 'password',
      label: this.literals.password,
      type: 'password',
      required: true,
      autocomplete: 'current-password',
    },
  ]);

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
        this.language.applyFromAccount(session.user.language);
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
