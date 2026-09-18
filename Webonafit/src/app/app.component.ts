import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
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
  private readonly translate = inject(TranslateService);
  readonly branding = inject(BrandingService);
  readonly language = inject(LanguageService);

  readonly title = 'BONAFIT';
  protected readonly menuOpen = signal(false);
  protected readonly email = 'hola@bonafit.es';
  private readonly navCopy = toSignal(this.translate.stream('nav'), {
    initialValue: this.translate.instant('nav') as Record<string, string>,
  });
  protected readonly nav = computed(() => [
    { label: this.navCopy()['about'], fragment: 'quienes-somos' },
    { label: this.navCopy()['offer'], fragment: 'que-ofrecemos' },
    { label: this.navCopy()['longevity'], fragment: 'longevidad' },
    { label: this.navCopy()['area'], fragment: 'zona' },
    { label: this.navCopy()['contact'], fragment: 'contacto' },
  ]);

  toggleMenu() {
    this.menuOpen.update((open) => !open);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  goToContact() {
    this.closeMenu();
    void this.router.navigate(['/'], { fragment: 'contacto' }).then(() => {
      document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' });
    });
  }
}
