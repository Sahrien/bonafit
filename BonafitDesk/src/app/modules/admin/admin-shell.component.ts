import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  BonaShellAppComponent,
  BonaShellNavItem,
} from '../../components/bona-shell-app/bona-shell-app.component';
import { AUTH_PATHS } from '../../core/auth/auth.paths';
import { injectAuthSession } from '../../core/auth/inject-auth-session';
import { ADMIN_LITERALS } from '../../i18n/es';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [BonaShellAppComponent, RouterOutlet],
  templateUrl: './admin-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShellComponent {
  private readonly authSession = injectAuthSession();

  readonly literals = ADMIN_LITERALS;
  readonly userName = this.authSession.userName;
  readonly navItems: BonaShellNavItem[] = [
    { id: 'calendar', label: ADMIN_LITERALS.calendar, link: AUTH_PATHS.adminHome, icon: 'calendar_month' },
    { id: 'schedules', label: ADMIN_LITERALS.schedules, link: AUTH_PATHS.adminSchedules, icon: 'schedule' },
    { id: 'clients', label: ADMIN_LITERALS.clients, link: '/admin/clients', icon: 'groups' },
    { id: 'services', label: ADMIN_LITERALS.services, link: '/admin/services', icon: 'spa' },
    { id: 'forms', label: ADMIN_LITERALS.forms, link: '/admin/forms', icon: 'assignment' },
  ];
  readonly menuItems: BonaShellNavItem[] = [
    { id: 'settings', label: ADMIN_LITERALS.settings, link: AUTH_PATHS.adminSettings },
    { id: 'schedules', label: ADMIN_LITERALS.schedules, link: AUTH_PATHS.adminSchedules },
  ];

  onLogout(): void {
    this.authSession.logout();
  }
}
