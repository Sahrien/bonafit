import { RESPONSE_INIT, ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonComponent } from '../../components/button/button.component';
import { LanguageService } from '../../i18n/language.service';

@Component({
  selector: 'app-not-found',
  imports: [ButtonComponent, TranslatePipe],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);

  constructor() {
    // Runtime SSR can answer with a real 404; the static host serves the SPA
    // shell and this page renders client-side.
    const responseInit = inject(RESPONSE_INIT, { optional: true });
    if (responseInit) {
      responseInit.status = 404;
    }
  }

  goHome(): void {
    void this.router.navigateByUrl(this.language.homePath());
  }
}
