import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { BonaButtonComponent } from '../../components/bona-button/bona-button.component';
import { BonaInputTextFieldComponent } from '../../components/bona-input-text-field/bona-input-text-field.component';
import { homeForRole } from '../../core/auth/auth.paths';
import { LOGIN_LITERALS } from '../../i18n/es';
import { AuthUserDto, UserRole } from '../../models/auth-session.dto';
import { AuthApiService } from '../../services/auth-api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [BonaButtonComponent, BonaInputTextFieldComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly auth = inject(AuthApiService);
  private readonly router = inject(Router);

  readonly literals = LOGIN_LITERALS;
  readonly filter = signal('');
  private readonly accounts = toSignal(this.auth.listAccounts(), {
    initialValue: [] as AuthUserDto[],
  });

  readonly filteredAccounts = computed(() => {
    const query = this.filter().trim().toLowerCase();
    const rows = this.accounts();
    if (!query) {
      return rows;
    }
    return rows.filter((row) => {
      const role = this.roleLabel(row.role).toLowerCase();
      return row.displayName.toLowerCase().includes(query) || role.includes(query);
    });
  });

  roleLabel(role: UserRole): string {
    return role === 'admin' ? this.literals.roleAdmin : this.literals.roleClient;
  }

  accountAction(account: AuthUserDto): string {
    return `${this.literals.enter}: ${account.displayName} · ${this.roleLabel(account.role)}`;
  }

  onSelect(account: AuthUserDto): void {
    this.auth.login(account.id).subscribe((session) => {
      void this.router.navigateByUrl(homeForRole(session.user.role));
    });
  }
}
