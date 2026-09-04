import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { BonaButtonComponent } from '../bona-button/bona-button.component';

export type BonaShellAdminMode = 'menu' | 'bar';

@Component({
  selector: 'app-bona-shell-admin',
  standalone: true,
  imports: [BonaButtonComponent],
  templateUrl: './bona-shell-admin.component.html',
  styleUrl: './bona-shell-admin.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BonaShellAdminComponent {
  readonly mode = input<BonaShellAdminMode>('menu');
  readonly userName = input('');
  readonly backLabel = input('Volver al menú');
  readonly logoutLabel = input('Salir');

  readonly back = output<void>();
  readonly logout = output<void>();
}
