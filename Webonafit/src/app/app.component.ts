import { PlatformLocation } from '@angular/common';
import {
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { filter } from 'rxjs';
import { ButtonComponent } from './components/button/button.component';
import { LogoComponent } from './components/logo/logo.component';
import { LanguageService } from './i18n/language.service';
import { ContactNavigationService } from './navigation/contact-navigation.service';
import { SeoService } from './seo/seo.service';
import { CONTACT_FRAGMENT, HOME_PATH, PageId, SITE, UiLanguage } from './site';
import { STUDIO_CONTACT } from './studio-contact';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, ButtonComponent, LogoComponent, TranslatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly platformLocation = inject(PlatformLocation);
  private readonly contactNavigation = inject(ContactNavigationService);
  private readonly seo = inject(SeoService);
  readonly language = inject(LanguageService);
  protected readonly contact = STUDIO_CONTACT;
  protected readonly site = SITE;

  protected readonly menuOpen = signal(false);
  protected readonly langOpen = signal(false);
  private readonly navCopy = toSignal(this.translate.stream('nav'), {
    initialValue: this.translate.instant('nav') as Record<string, string>,
  });
  protected readonly nav = computed(() => {
    const copy = this.navCopy();
    return [
      { label: copy['about'], fragment: 'quienes-somos' },
      { label: copy['offer'], fragment: 'que-ofrecemos' },
      { label: copy['longevity'], fragment: 'longevidad' },
      { label: copy['area'], fragment: 'zona' },
      { label: copy['contact'], fragment: this.language.contactFragment() },
    ];
  });

  constructor() {
    // The URL is the source of truth for the language: `/en` renders and
    // hydrates in English, everything else in Spanish.
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        const pathname = this.platformLocation.pathname;
        void this.language.setFromPath(pathname).then(() => {
          this.seo.update(pathname, this.pageId());
        });
      });
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
    this.closeLang();
    if (language === this.language.language()) {
      return;
    }

    const current = this.router.parseUrl(this.router.url);
    const fragment =
      current.fragment === this.language.contactFragment()
        ? CONTACT_FRAGMENT[language]
        : current.fragment ?? undefined;

    void this.router.navigateByUrl(
      this.router.createUrlTree([HOME_PATH[language]], {
        fragment,
        queryParams: current.queryParams,
      }),
    );
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

  private pageId(): PageId {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route.data['page'] === 'notFound' ? 'notFound' : 'home';
  }
}
