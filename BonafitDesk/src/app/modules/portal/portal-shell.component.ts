import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  BonaShellAppComponent,
  BonaShellNavItem,
} from '../../components/bona-shell-app/bona-shell-app.component';
import { AUTH_PATHS } from '../../core/auth/auth.paths';
import { injectAuthSession } from '../../core/auth/inject-auth-session';
import { CLIENT_LITERALS } from '../../i18n/es';

@Component({
  selector: 'app-portal-shell',
  standalone: true,
  imports: [BonaShellAppComponent, RouterOutlet],
  templateUrl: './portal-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalShellComponent {
  private readonly authSession = injectAuthSession();

  readonly literals = CLIENT_LITERALS;
  readonly userName = this.authSession.userName;
  readonly navItems: BonaShellNavItem[] = [
    { id: 'agenda', label: CLIENT_LITERALS.agenda, link: AUTH_PATHS.clientHome },
    { id: 'bonos', label: CLIENT_LITERALS.bonos, link: '/app/bonos' },
    { id: 'catalog', label: CLIENT_LITERALS.catalog, link: '/app/catalogo' },
    { id: 'forms', label: CLIENT_LITERALS.forms, link: '/app/formularios' },
  ];
  readonly menuItems: BonaShellNavItem[] = [
    { id: 'profile', label: CLIENT_LITERALS.profile, link: AUTH_PATHS.clientProfile },
    { id: 'settings', label: CLIENT_LITERALS.settings, link: AUTH_PATHS.clientSettings },
  ];

  onLogout(): void {
    this.authSession.logout();
  }
}
