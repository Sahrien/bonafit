import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BonaButtonComponent } from '../../components/bona-button/bona-button.component';
import { BonaModuleComponent } from '../../components/bona-module/bona-module.component';
import { BonaShellAdminComponent } from '../../components/bona-shell-admin/bona-shell-admin.component';
import { injectAuthSession } from '../../core/auth/inject-auth-session';
import { ADMIN_LITERALS } from '../../i18n/es';

interface AdminModuleCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  path: string;
}

@Component({
  selector: 'app-admin-home',
  standalone: true,
  imports: [BonaShellAdminComponent, BonaModuleComponent, BonaButtonComponent],
  templateUrl: './admin-home.component.html',
  styleUrl: './admin-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminHomeComponent {
  private readonly router = inject(Router);
  private readonly authSession = injectAuthSession();

  readonly literals = ADMIN_LITERALS;
  readonly modules: AdminModuleCard[] = [
    {
      id: 'calendar',
      title: ADMIN_LITERALS.calendarTitle,
      description: ADMIN_LITERALS.calendarDescription,
      icon: 'C',
      path: '/admin/calendar',
    },
    {
      id: 'clients',
      title: ADMIN_LITERALS.clientsTitle,
      description: ADMIN_LITERALS.clientsDescription,
      icon: 'U',
      path: '/admin/clients',
    },
    {
      id: 'services',
      title: ADMIN_LITERALS.servicesTitle,
      description: ADMIN_LITERALS.servicesDescription,
      icon: 'S',
      path: '/admin/services',
    },
  ];

  onOpen(path: string): void {
    void this.router.navigateByUrl(path);
  }

  onLogout(): void {
    this.authSession.logout();
  }
}
