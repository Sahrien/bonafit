import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type UiLanguage = 'es' | 'en';
export const DEFAULT_LANGUAGE: UiLanguage = 'es';

const STORAGE_KEY = 'bonafit.language';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly language = signal<UiLanguage>(DEFAULT_LANGUAGE);

  /**
   * Applies the visitor's stored choice after hydration. The server always
   * renders `DEFAULT_LANGUAGE`; switching earlier would mismatch the HTML that
   * Angular is hydrating.
   */
  restoreStoredLanguage(): void {
    if (!this.isBrowser) {
      return;
    }
    const stored = this.readStored();
    if (stored !== this.language()) {
      this.setLanguage(stored);
    }
  }

  setLanguage(language: UiLanguage): void {
    void this.translate.use(language);
    this.apply(language, true);
  }

  private apply(language: UiLanguage, persist: boolean): void {
    this.language.set(language);
    this.document.documentElement.lang = language;
    if (!persist || !this.isBrowser) {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      /* Storage can be unavailable (private mode, blocked cookies). */
    }
  }

  private readStored(): UiLanguage {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'es') {
        return stored;
      }
    } catch {
      return DEFAULT_LANGUAGE;
    }
    return DEFAULT_LANGUAGE;
  }
}
