import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { languageFromPath } from '../i18n/language.service';
import { DEFAULT_LANGUAGE, HOME_PATH, PageId, SITE, UiLanguage } from '../site';

/**
 * Writes canonical, hreflang and localized metadata into `<head>`. It runs
 * during prerender, so the generated HTML ships the correct tags per language.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly translate = inject(TranslateService);

  update(pathname: string, page: PageId): void {
    if (page === 'notFound') {
      this.setNotFound(languageFromPath(pathname));
      return;
    }

    const language = languageFromPath(pathname);
    const title = this.translate.instant('seo.title') as string;
    const description = this.translate.instant('seo.description') as string;

    this.title.setTitle(title);
    this.setMeta('description', description);
    this.removeMeta('robots');

    this.setLink('canonical', absoluteUrl(HOME_PATH[language]));
    this.setAlternate('es', absoluteUrl(HOME_PATH.es));
    this.setAlternate('en', absoluteUrl(HOME_PATH.en));
    this.setAlternate('x-default', absoluteUrl(HOME_PATH[DEFAULT_LANGUAGE]));
  }

  private setNotFound(language: UiLanguage): void {
    this.title.setTitle(`${this.translate.instant('notFound.title')} | ${SITE.name}`);
    this.setMeta('description', this.translate.instant('notFound.text'));
    this.setMeta('robots', 'noindex, follow');

    this.removeLink('canonical');
    this.removeLink('alternate');
    this.document.documentElement.lang = language;
  }

  private setMeta(name: string, content: string): void {
    let element = this.document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
    if (!element) {
      element = this.document.createElement('meta');
      element.setAttribute('name', name);
      this.document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  }

  private removeMeta(name: string): void {
    this.document.head.querySelectorAll(`meta[name="${name}"]`).forEach(removeElement);
  }

  private setLink(rel: string, href: string, hreflang?: string): void {
    const selector = hreflang
      ? `link[rel="${rel}"][hreflang="${hreflang}"]`
      : `link[rel="${rel}"]:not([hreflang])`;
    let element = this.document.head.querySelector<HTMLLinkElement>(selector);
    if (!element) {
      element = this.document.createElement('link');
      element.setAttribute('rel', rel);
      this.document.head.appendChild(element);
    }
    element.setAttribute('href', href);
    if (hreflang) {
      element.setAttribute('hreflang', hreflang);
    }
  }

  private setAlternate(hreflang: string, href: string): void {
    this.setLink('alternate', href, hreflang);
  }

  private removeLink(rel: string): void {
    this.document.head
      .querySelectorAll(`link[rel="${rel}"]`)
      .forEach(removeElement);
  }
}

function absoluteUrl(path: string): string {
  return `${SITE.url}${path}`;
}

function removeElement(element: Element): void {
  element.parentNode?.removeChild(element);
}
