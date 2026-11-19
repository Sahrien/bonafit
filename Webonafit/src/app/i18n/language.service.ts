import { DOCUMENT, PlatformLocation } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import {
  CONTACT_FRAGMENT,
  DEFAULT_LANGUAGE,
  HOME_PATH,
  UiLanguage,
} from '../site';

/** Maps a URL pathname to its UI language (`/` is Spanish, `/en` is English). */
export function languageFromPath(pathname: string): UiLanguage {
  return pathname === '/en' || pathname.startsWith('/en/') ? 'en' : DEFAULT_LANGUAGE;
}

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);
  private readonly platformLocation = inject(PlatformLocation);
  readonly language = signal<UiLanguage>(DEFAULT_LANGUAGE);

  /** Pre-bootstrap: load the bundle for the URL being rendered or hydrated. */
  init(): Promise<void> {
    return this.load(languageFromPath(this.platformLocation.pathname));
  }

  load(language: UiLanguage): Promise<void> {
    this.language.set(language);
    this.document.documentElement.lang = language;
    return firstValueFrom(this.translate.use(language)).then(() => undefined);
  }

  /** Keeps the UI language in sync with client-side navigation. */
  setFromPath(pathname: string): Promise<void> {
    const language = languageFromPath(pathname);
    return language === this.language() ? Promise.resolve() : this.load(language);
  }

  homePath(): string {
    return HOME_PATH[this.language()];
  }

  contactFragment(): string {
    return CONTACT_FRAGMENT[this.language()];
  }
}
