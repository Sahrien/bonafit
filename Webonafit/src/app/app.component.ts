import {
  afterNextRender,
  Component,
  computed,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterOutlet } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { BrandingService } from './branding/branding.service';
import { ButtonComponent } from './components/button/button.component';
import { LogoComponent } from './components/logo/logo.component';
import { LanguageService, UiLanguage } from './i18n/language.service';
import { ContactNavigationService } from './navigation/contact-navigation.service';
import { STUDIO_CONTACT } from './studio-contact';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, ButtonComponent, LogoComponent, TranslatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly translate = inject(TranslateService);
  private readonly contactNavigation = inject(ContactNavigationService);
  readonly branding = inject(BrandingService);
  readonly language = inject(LanguageService);
  protected readonly contact = STUDIO_CONTACT;

  protected readonly menuOpen = signal(false);
  protected readonly langOpen = signal(false);
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

  constructor() {
    // The server always renders Spanish; apply an English preference only
    // after hydration so the DOM Angular is hydrating stays identical.
    afterNextRender(() => this.language.restoreStoredLanguage());
  }

  toggleMenu() {
    this.menuOpen.update((open) => !open);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  toggleLang(event?: Event) {
    event?.stopPropagation();
    this.langOpen.update((open) => !open);
  }

  closeLang() {
    this.langOpen.set(false);
  }

  selectLanguage(language: UiLanguage, event?: Event) {
    event?.stopPropagation();
    this.language.setLanguage(language);
    this.closeLang();
  }

  onLangTriggerKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.langOpen.set(true);
      queueMicrotask(() => {
        document.querySelector<HTMLButtonElement>('.lang__option')?.focus();
      });
    } else if (event.key === 'Escape') {
      this.closeLang();
    }
  }

  onLangFocusOut(event: FocusEvent) {
    const root = event.currentTarget as HTMLElement | null;
    const next = event.relatedTarget as Node | null;
    if (!root || (next && root.contains(next))) {
      return;
    }
    this.closeLang();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.langOpen()) {
      this.closeLang();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.langOpen()) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target?.closest('.lang')) {
      return;
    }
    this.closeLang();
  }

  goToContact() {
    this.closeMenu();
    this.contactNavigation.goToContact();
  }
}
