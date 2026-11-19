import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonComponent } from '../../components/button/button.component';
import { LogoComponent } from '../../components/logo/logo.component';
import { LanguageService } from '../../i18n/language.service';
import { ContactNavigationService } from '../../navigation/contact-navigation.service';
import { ContactComponent } from '../contact/contact.component';

@Component({
  selector: 'app-home',
  imports: [ButtonComponent, LogoComponent, ContactComponent, TranslatePipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly translate = inject(TranslateService);
  private readonly contactNavigation = inject(ContactNavigationService);
  readonly language = inject(LanguageService);

  protected readonly territories = toSignal(this.translate.stream('home.territories'), {
    initialValue: this.translate.instant('home.territories') as string[],
  });
  protected readonly offers = toSignal(this.translate.stream('home.offers'), {
    initialValue: this.translate.instant('home.offers') as Array<{ title: string; text: string }>,
  });
  protected readonly complements = toSignal(this.translate.stream('home.complements'), {
    initialValue: this.translate.instant('home.complements') as string[],
  });
  protected readonly outcomes = toSignal(this.translate.stream('home.outcomes'), {
    initialValue: this.translate.instant('home.outcomes') as string[],
  });
  protected readonly primaryAreas = toSignal(this.translate.stream('home.primaryAreas'), {
    initialValue: this.translate.instant('home.primaryAreas') as string[],
  });
  protected readonly nearbyAreas = toSignal(this.translate.stream('home.nearbyAreas'), {
    initialValue: this.translate.instant('home.nearbyAreas') as string[],
  });

  goToContact() {
    this.contactNavigation.goToContact();
  }
}
