import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';
import { UI_LANGUAGES } from '../../core/i18n/ui-language';

@Component({
  selector: 'app-bona-language-switcher',
  standalone: true,
  template: `
    <div class="lang" role="group" [attr.aria-label]="ariaLabel">
      @for (code of languages; track code) {
        <button
          type="button"
          class="lang__btn"
          [class.is-active]="language.language() === code"
          (click)="language.setLanguage(code)">
          {{ code === 'es' ? 'ES' : 'EN' }}
        </button>
      }
    </div>
  `,
  styles: `
    .lang {
      display: inline-flex;
      gap: 0.25rem;
    }
    .lang__btn {
      min-width: 2.25rem;
      padding: 0.25rem 0.5rem;
      border: 1px solid var(--bona-color-border);
      border-radius: var(--bona-radius-sm, 0.375rem);
      background: transparent;
      color: var(--bona-color-text);
      cursor: pointer;
      font: inherit;
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .lang__btn.is-active {
      background: var(--bona-color-primary);
      border-color: var(--bona-color-primary);
      color: var(--bona-color-on-primary, #fff);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BonaLanguageSwitcherComponent {
  readonly language = inject(LanguageService);
  readonly languages = UI_LANGUAGES;
  readonly ariaLabel = 'Language';
}
