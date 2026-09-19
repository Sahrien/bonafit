import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { API_PATHS, apiUrl } from '../api-url';
import { AuthTokenStore } from '../auth/auth-token.store';
import {
  DEFAULT_UI_LANGUAGE,
  isUiLanguage,
  LANGUAGE_STORAGE_KEY,
  localeTag,
  UiLanguage,
} from './ui-language';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly tokens = inject(AuthTokenStore);
  private readonly http = inject(HttpClient);

  readonly language = signal<UiLanguage>(DEFAULT_UI_LANGUAGE);
  readonly locale = computed(() => localeTag(this.language()));

  async init(): Promise<void> {
    const stored = this.readStored();
    this.translate.setDefaultLang(DEFAULT_UI_LANGUAGE);
    await firstValueFrom(this.translate.use(stored));
    this.apply(stored);
  }

  setLanguage(language: UiLanguage, persistAccount = true): void {
    void this.translate.use(language);
    this.apply(language);
    if (persistAccount && this.tokens.get()) {
      this.http.patch(apiUrl(API_PATHS.authMe), { language }).subscribe();
    }
  }

  applyFromAccount(language: string | undefined): void {
    if (isUiLanguage(language)) {
      this.setLanguage(language, false);
    }
  }

  keepCurrentOrApplyAccount(accountLanguage: string | undefined): void {
    const chosen = this.language();
    if (isUiLanguage(accountLanguage) && accountLanguage !== chosen) {
      this.setLanguage(chosen, true);
      return;
    }
    this.applyFromAccount(accountLanguage);
  }

  private apply(language: UiLanguage): void {
    this.language.set(language);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }

  private readStored(): UiLanguage {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (isUiLanguage(stored)) {
        return stored;
      }
    } catch {
      return DEFAULT_UI_LANGUAGE;
    }
    return DEFAULT_UI_LANGUAGE;
  }
}
