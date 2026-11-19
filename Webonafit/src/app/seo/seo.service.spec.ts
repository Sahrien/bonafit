import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LanguageService } from '../i18n/language.service';
import { provideWebTranslate } from '../i18n/provide-web-translate';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  let seo: SeoService;
  let language: LanguageService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), provideWebTranslate()],
    }).compileComponents();

    seo = TestBed.inject(SeoService);
    language = TestBed.inject(LanguageService);
  });

  afterEach(() => {
    document.head
      .querySelectorAll('link[rel="canonical"], link[rel="alternate"], meta[name="robots"]')
      .forEach((element) => element.remove());
  });

  it('writes the localized title, canonical and hreflang for English', async () => {
    await language.load('en');

    seo.update('/en', 'home');

    expect(document.title).toContain('Personal training');
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    expect(canonical?.getAttribute('href')).toBe('https://bona-fit.es/en');
    const alternates = [...document.head.querySelectorAll<HTMLLinkElement>('link[rel="alternate"]')];
    expect(alternates.map((link) => link.getAttribute('hreflang'))).toEqual(['es', 'en', 'x-default']);
  });

  it('marks the 404 page as noindex and drops canonical/hreflang', async () => {
    await language.load('es');

    seo.update('/no-existe', 'notFound');

    expect(
      document.head.querySelector('meta[name="robots"]')?.getAttribute('content'),
    ).toBe('noindex, follow');
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.head.querySelectorAll('link[rel="alternate"]').length).toBe(0);
  });
});
