import { Component, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { BrandingService } from './branding/branding.service';
import { ButtonComponent } from './components/button/button.component';
import { LogoComponent } from './components/logo/logo.component';
import { LanguageService } from './i18n/language.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, ButtonComponent, LogoComponent, TranslatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly router = inject(Router);
  readonly branding = inject(BrandingService);
  readonly language = inject(LanguageService);

  readonly title = 'BONAFIT';
  protected readonly scrolled = signal(false);
  protected readonly email = 'hola@bonafit.es';

  @HostListener('window:scroll')
  onWindowScroll() {
    this.scrolled.set(window.scrollY > 12);
  }

  goToContact() {
    void this.router.navigate(['/'], { fragment: 'contacto' }).then(() => {
      document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' });
    });
  }
}
