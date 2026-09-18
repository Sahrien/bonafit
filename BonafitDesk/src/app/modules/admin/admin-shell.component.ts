import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  BonaShellAppComponent,
  BonaShellNavItem,
} from '../../components/bona-shell-app/bona-shell-app.component';
import { AUTH_PATHS } from '../../core/auth/auth.paths';
import { BrandThemeService } from '../../core/brand-theme.service';
import { schemeIcon, schemeLabel } from '../../core/color-scheme-ui';
import { injectAuthSession } from '../../core/auth/inject-auth-session';
import { injectI18n } from '../../core/i18n/inject-i18n';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [BonaShellAppComponent, RouterOutlet],
  templateUrl: './admin-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShellComponent {
  private readonly authSession = injectAuthSession();
  readonly brandTheme = inject(BrandThemeService);

  private readonly i18n = injectI18n<Record<string, string>>('admin');
  get literals() {
    return this.i18n();
  }
  readonly userName = this.authSession.userName;
  readonly colorSchemeLabel = computed(() => schemeLabel(this.brandTheme.preferredScheme(), this.literals));
  readonly colorSchemeIcon = computed(() => schemeIcon(this.brandTheme.preferredScheme()));
  readonly navItems = computed<BonaShellNavItem[]>(() => [
    { id: 'calendar', label: this.literals.calendar, link: AUTH_PATHS.adminHome, icon: 'calendar_month' },
    { id: 'schedules', label: this.literals.schedules, link: AUTH_PATHS.adminSchedules, icon: 'schedule' },
    { id: 'clients', label: this.literals.clients, link: '/admin/clients', icon: 'groups' },
    { id: 'services', label: this.literals.services, link: '/admin/services', icon: 'spa' },
    { id: 'forms', label: this.literals.forms, link: '/admin/forms', icon: 'assignment' },
  ]);
  readonly menuItems = computed<BonaShellNavItem[]>(() => [
    { id: 'settings', label: this.literals.settings, link: AUTH_PATHS.adminSettings },
    { id: 'schedules', label: this.literals.schedules, link: AUTH_PATHS.adminSchedules },
  ]);

  onLogout(): void {
    this.authSession.logout();
  }
}
