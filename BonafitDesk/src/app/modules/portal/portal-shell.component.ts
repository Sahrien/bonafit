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
  selector: 'app-portal-shell',
  standalone: true,
  imports: [BonaShellAppComponent, RouterOutlet],
  templateUrl: './portal-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalShellComponent {
  private readonly authSession = injectAuthSession();
  readonly brandTheme = inject(BrandThemeService);

  private readonly i18n = injectI18n<Record<string, string>>('client');
  get literals() {
    return this.i18n();
  }
  readonly userName = this.authSession.userName;
  readonly colorSchemeLabel = computed(() => schemeLabel(this.brandTheme.preferredScheme(), this.literals));
  readonly colorSchemeIcon = computed(() => schemeIcon(this.brandTheme.preferredScheme()));
  readonly navItems = computed<BonaShellNavItem[]>(() => [
    { id: 'agenda', label: this.literals.agenda, link: AUTH_PATHS.clientHome, icon: 'event' },
    { id: 'bonos', label: this.literals.bonos, link: '/app/bonos', icon: 'loyalty' },
    { id: 'catalog', label: this.literals.catalog, link: '/app/catalogo', icon: 'storefront' },
    { id: 'forms', label: this.literals.forms, link: '/app/formularios', icon: 'assignment' },
  ]);
  readonly menuItems = computed<BonaShellNavItem[]>(() => [
    { id: 'profile', label: this.literals.profile, link: AUTH_PATHS.clientProfile },
    { id: 'settings', label: this.literals.settings, link: AUTH_PATHS.clientSettings },
  ]);

  onLogout(): void {
    this.authSession.logout();
  }
}
