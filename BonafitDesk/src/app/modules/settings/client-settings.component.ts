import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BonaPageComponent } from '../../components/bona-page/bona-page.component';
import { BonaToast } from '../../components/bona-toast/bona-toast.service';
import { PasswordChangeFormComponent } from './password-change-form.component';
import { SETTINGS_LITERALS } from './settings.literals';

@Component({
  selector: 'app-client-settings',
  standalone: true,
  imports: [BonaPageComponent, PasswordChangeFormComponent],
  templateUrl: './client-settings.component.html',
  styleUrl: './admin-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientSettingsComponent {
  private readonly toast = inject(BonaToast);

  readonly literals = SETTINGS_LITERALS;

  onPasswordSaved(): void {
    this.toast.success(this.literals.passwordSaved);
  }
}
