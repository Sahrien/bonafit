import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BonaLanguageSwitcherComponent } from '../../components/bona-language-switcher/bona-language-switcher.component';
import { BonaPageComponent } from '../../components/bona-page/bona-page.component';
import { BonaToast } from '../../components/bona-toast/bona-toast.service';
import { injectI18n } from '../../core/i18n/inject-i18n';
import { PasswordChangeFormComponent } from './password-change-form.component';

@Component({
  selector: 'app-client-settings',
  standalone: true,
  imports: [BonaPageComponent, PasswordChangeFormComponent, BonaLanguageSwitcherComponent],
  templateUrl: './client-settings.component.html',
  styleUrl: './admin-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientSettingsComponent {
  private readonly toast = inject(BonaToast);

  private readonly i18n = injectI18n<Record<string, string>>('settings');
  get literals() {
    return this.i18n();
  }

  onPasswordSaved(): void {
    this.toast.success(this.literals.passwordSaved);
  }
}
