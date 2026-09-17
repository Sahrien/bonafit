import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatAnchor, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatToolbar } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface BonaShellNavItem {
  id: string;
  label: string;
  link: string;
  icon?: string;
}

@Component({
  selector: 'app-bona-shell-app',
  standalone: true,
  imports: [
    MatToolbar,
    MatButton,
    MatAnchor,
    MatIcon,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './bona-shell-app.component.html',
  styleUrl: './bona-shell-app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BonaShellAppComponent {
  readonly brand = input('Bonafit');
  readonly brandSubtitle = input('');
  readonly userName = input('');
  readonly navItems = input<BonaShellNavItem[]>([]);
  readonly menuItems = input<BonaShellNavItem[]>([]);
  readonly logoutLabel = input('Salir');
  readonly menuLabel = input('Menú');
  readonly profileMenuLabel = input('Cuenta');

  readonly logout = output<void>();
}
