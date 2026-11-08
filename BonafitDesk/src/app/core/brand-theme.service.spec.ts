import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { of } from 'rxjs';
import { MOCK_BRANDING } from '../testing/fixtures';
import { BrandingApiService } from '../services/branding-api.service';
import { BrandThemeService, apiAssetUrl } from './brand-theme.service';

describe('BrandThemeService', () => {
  let api: jasmine.SpyObj<BrandingApiService>;

  beforeEach(() => {
    localStorage.clear();
    api = jasmine.createSpyObj('BrandingApiService', ['getBranding']);
    api.getBranding.and.returnValue(
      of({ ...MOCK_BRANDING, studioName: 'Norte', primaryHex: '#112233' }),
    );
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), { provide: BrandingApiService, useValue: api }],
    });
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.style.removeProperty('--bona-color-primary');
    document.documentElement.style.removeProperty('--bona-font-heading');
    document.documentElement.style.removeProperty('--bona-font-body');
    document.documentElement.style.removeProperty('--bona-font-family');
    document.documentElement.style.colorScheme = '';
  });

  it('applies studio colors and document title', async () => {
    const theme = TestBed.inject(BrandThemeService);
    await theme.load();
    expect(document.documentElement.style.getPropertyValue('--bona-color-primary').trim()).toBe(
      '#112233',
    );
    expect(TestBed.inject(Title).getTitle()).toBe('Norte');
    expect(theme.studioName()).toBe('Norte');
  });

  it('applies the selected heading and body fonts', async () => {
    api.getBranding.and.returnValue(
      of({ ...MOCK_BRANDING, headingFont: 'playfair', bodyFont: 'manrope' }),
    );
    const theme = TestBed.inject(BrandThemeService);
    await theme.load();

    const root = document.documentElement.style;
    expect(root.getPropertyValue('--bona-font-heading')).toContain('Playfair Display');
    expect(root.getPropertyValue('--bona-font-body')).toContain('Manrope');
    expect(root.getPropertyValue('--bona-font-family')).toContain('Manrope');
  });

  it('exposes the uploaded favicon as the header mark', async () => {
    api.getBranding.and.returnValue(
      of({ ...MOCK_BRANDING, faviconUrl: '/uploads/branding/favicon.svg' }),
    );
    const theme = TestBed.inject(BrandThemeService);
    await theme.load();

    expect(theme.markHref()).toBe(apiAssetUrl('/uploads/branding/favicon.svg'));
  });

  it('uses the night logo in dark mode', async () => {
    api.getBranding.and.returnValue(
      of({
        ...MOCK_BRANDING,
        colorScheme: 'dark',
        logoUrl: '/uploads/branding/logo-day.svg',
        logoDarkUrl: '/uploads/branding/logo-night.svg',
      }),
    );
    const theme = TestBed.inject(BrandThemeService);
    await theme.load();

    expect(theme.logoHref()).toBe(apiAssetUrl('/uploads/branding/logo-night.svg'));
  });

  it('falls back to the day logo when there is no night logo', async () => {
    api.getBranding.and.returnValue(
      of({
        ...MOCK_BRANDING,
        colorScheme: 'dark',
        logoUrl: '/uploads/branding/logo-day.svg',
        logoDarkUrl: null,
      }),
    );
    const theme = TestBed.inject(BrandThemeService);
    await theme.load();

    expect(theme.logoHref()).toBe(apiAssetUrl('/uploads/branding/logo-day.svg'));
  });
});
