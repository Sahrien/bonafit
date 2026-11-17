import { PlatformLocation } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Router, Scroll } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { filter } from 'rxjs';
import { BrandingService } from '../../branding/branding.service';
import { ButtonComponent } from '../../components/button/button.component';
import { LogoComponent } from '../../components/logo/logo.component';
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
  private readonly router = inject(Router);
  private readonly platformLocation = inject(PlatformLocation);
  private readonly translate = inject(TranslateService);
  private readonly contactNavigation = inject(ContactNavigationService);
  readonly branding = inject(BrandingService);

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

  constructor() {
    // `/contacto` is the same landing page; scroll to its contact section once
    // the router has finished its own post-render scroll handling. The router
    // emits `Scroll` after change detection and, because its own listener is
    // registered first, resets to the top in the same dispatch. Deferring one
    // macrotask keeps this scroll last, so it also works during hydration.
    this.router.events
      .pipe(
        filter((event): event is Scroll => event instanceof Scroll),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        if (this.platformLocation.pathname.startsWith('/contacto')) {
          // Jump on arrival; a long smooth animation from the hero is noise.
          setTimeout(() => this.contactNavigation.scrollToContact('instant'));
        }
      });
  }

  goToContact() {
    this.contactNavigation.goToContact();
  }
}
