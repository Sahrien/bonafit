import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  BonaShellClientComponent,
  BonaShellNavItem,
} from '../../components/bona-shell-client/bona-shell-client.component';
import { injectAuthSession } from '../../core/auth/inject-auth-session';
import { CLIENT_LITERALS } from '../../i18n/es';

@Component({
  selector: 'app-portal-shell',
  standalone: true,
  imports: [BonaShellClientComponent, RouterOutlet],
  templateUrl: './portal-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalShellComponent {
  private readonly authSession = injectAuthSession();

  readonly literals = CLIENT_LITERALS;
  readonly userName = this.authSession.userName;
  readonly navItems: BonaShellNavItem[] = [
    { id: 'profile', label: CLIENT_LITERALS.profile, link: '/app/profile' },
    { id: 'bonos', label: CLIENT_LITERALS.bonos, link: '/app/bonos' },
    { id: 'catalog', label: CLIENT_LITERALS.catalog, link: '/app/catalogo' },
  ];

  onLogout(): void {
    this.authSession.logout();
  }
}
