import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { of } from 'rxjs';
import { MOCK_BRANDING } from '../testing/fixtures';
import { BrandingApiService } from '../services/branding-api.service';
import { BrandThemeService } from './brand-theme.service';

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
});
