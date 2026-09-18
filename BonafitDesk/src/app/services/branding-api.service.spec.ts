import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_PATHS, apiUrl } from '../core/api-url';
import { configureHttpClientTesting } from '../core/http-testing';
import { MOCK_BRANDING } from '../testing/fixtures';
import { BrandingApiService } from './branding-api.service';

describe('BrandingApiService', () => {
  let api: BrandingApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    http = configureHttpClientTesting();
    api = TestBed.inject(BrandingApiService);
  });

  afterEach(() => {
    http.verify();
  });

  it('GET /branding', async () => {
    const pending = firstValueFrom(api.getBranding());
    http.expectOne({ method: 'GET', url: apiUrl(API_PATHS.branding) }).flush(MOCK_BRANDING);
    expect(await pending).toEqual(MOCK_BRANDING);
  });

  it('PUT /branding', async () => {
    const payload = {
      studioName: 'Norte',
      slogan: 'Fuerza',
      primaryHex: '#112233',
      accentHex: '#aabbcc',
      surfaceHex: '#f5f3f0',
      colorScheme: 'dark' as const,
    };
    const pending = firstValueFrom(api.updateBranding(payload));
    const req = http.expectOne({ method: 'PUT', url: apiUrl(API_PATHS.branding) });
    expect(req.request.body).toEqual(payload);
    req.flush({ ...MOCK_BRANDING, ...payload });
    expect((await pending).studioName).toBe('Norte');
  });

  it('POST /branding/logo', async () => {
    const file = new File(['png'], 'logo.png', { type: 'image/png' });
    const pending = firstValueFrom(api.uploadLogo(file));
    const req = http.expectOne({ method: 'POST', url: apiUrl(API_PATHS.brandingLogo) });
    expect(req.request.body instanceof FormData).toBeTrue();
    req.flush({ ...MOCK_BRANDING, logoUrl: '/uploads/branding/logo.png' });
    expect((await pending).logoUrl).toBe('/uploads/branding/logo.png');
  });
});
