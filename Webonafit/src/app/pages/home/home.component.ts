import { afterNextRender, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { BrandingService } from '../../branding/branding.service';
import { ButtonComponent } from '../../components/button/button.component';
import { LogoComponent } from '../../components/logo/logo.component';
import { RevealDirective } from '../../directives/reveal.directive';
import { ContactComponent } from '../contact/contact.component';

interface Offer {
  title: string;
  text: string;
  image: string;
  alt: string;
}

interface Step {
  title: string;
  text: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-home',
  imports: [ButtonComponent, ContactComponent, LogoComponent, RevealDirective, TranslatePipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  readonly branding = inject(BrandingService);

  protected readonly whatsappHref =
    'https://wa.me/34622184709?text=Hola%20BONAFIT%2C%20me%20gustar%C3%ADa%20informaci%C3%B3n%20sobre%20las%20sesiones.';

  protected readonly territories = toSignal(this.translate.stream('home.territories'), {
    initialValue: this.translate.instant('home.territories') as string[],
  });
  protected readonly heroProof = toSignal(this.translate.stream('home.heroProof'), {
    initialValue: this.translate.instant('home.heroProof') as string[],
  });
  protected readonly offers = toSignal(this.translate.stream('home.offers'), {
    initialValue: this.translate.instant('home.offers') as Offer[],
  });
  protected readonly steps = toSignal(this.translate.stream('home.steps'), {
    initialValue: this.translate.instant('home.steps') as Step[],
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
  protected readonly faqItems = toSignal(this.translate.stream('home.faqItems'), {
    initialValue: this.translate.instant('home.faqItems') as FaqItem[],
  });

  constructor() {
    afterNextRender(() => {
      if (this.router.url.startsWith('/contacto')) {
        document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  goToContact() {
    void this.router.navigate(['/'], { fragment: 'contacto' }).then(() => {
      document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' });
    });
  }
}
