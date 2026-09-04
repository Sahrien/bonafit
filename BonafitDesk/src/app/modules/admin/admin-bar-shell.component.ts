import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BonaShellAdminComponent } from '../../components/bona-shell-admin/bona-shell-admin.component';
import { injectAuthSession } from '../../core/auth/inject-auth-session';
import { ADMIN_LITERALS } from '../../i18n/es';

@Component({
  selector: 'app-admin-bar-shell',
  standalone: true,
  imports: [BonaShellAdminComponent, RouterOutlet],
  templateUrl: './admin-bar-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBarShellComponent {
  private readonly authSession = injectAuthSession();

  readonly literals = ADMIN_LITERALS;
  readonly userName = this.authSession.userName;

  onBack(): void {
    this.authSession.goAdminHome();
  }

  onLogout(): void {
    this.authSession.logout();
  }
}
