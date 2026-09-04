import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { BonaButtonComponent } from '../bona-button/bona-button.component';

export interface BonaShellNavItem {
  id: string;
  label: string;
  link?: string;
}

@Component({
  selector: 'app-bona-shell-client',
  standalone: true,
  imports: [BonaButtonComponent],
  templateUrl: './bona-shell-client.component.html',
  styleUrl: './bona-shell-client.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BonaShellClientComponent {
  private readonly router = inject(Router);

  readonly brand = input('Bonafit');
  readonly userName = input('');
  readonly navItems = input<BonaShellNavItem[]>([]);
  readonly logoutLabel = input('Salir');

  readonly navSelect = output<string>();
  readonly logout = output<void>();

  onNav(item: BonaShellNavItem): void {
    this.navSelect.emit(item.id);
    if (item.link) {
      void this.router.navigateByUrl(item.link);
    }
  }
}
