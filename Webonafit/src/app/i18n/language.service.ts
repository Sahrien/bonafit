import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

export type UiLanguage = 'es' | 'en';
const STORAGE_KEY = 'bonafit.language';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  readonly language = signal<UiLanguage>('es');

  async init(): Promise<void> {
    const stored = this.readStored();
    this.translate.setDefaultLang('es');
    await firstValueFrom(this.translate.use(stored));
    this.apply(stored);
  }

  setLanguage(language: UiLanguage): void {
    void this.translate.use(language);
    this.apply(language);
  }

  private apply(language: UiLanguage): void {
    this.language.set(language);
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = language;
  }

  private readStored(): UiLanguage {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'es') {
        return stored;
      }
    } catch {
      return 'es';
    }
    return 'es';
  }
}
