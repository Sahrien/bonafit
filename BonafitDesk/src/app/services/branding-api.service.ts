import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_PATHS, apiUrl } from '../core/api-url';
import { BrandingApi } from '../core/branding-api';
import { BrandingDto, BrandingWriteDto } from '../models/branding.dto';

@Injectable({ providedIn: 'root' })
export class BrandingApiService implements BrandingApi {
  private readonly http = inject(HttpClient);

  getBranding(): Observable<BrandingDto> {
    return this.http.get<BrandingDto>(apiUrl(API_PATHS.branding));
  }

  updateBranding(payload: BrandingWriteDto): Observable<BrandingDto> {
    return this.http.put<BrandingDto>(apiUrl(API_PATHS.branding), payload);
  }

  uploadLogo(file: File): Observable<BrandingDto> {
    return this.uploadAsset(API_PATHS.brandingLogo, file);
  }

  uploadFavicon(file: File): Observable<BrandingDto> {
    return this.uploadAsset(API_PATHS.brandingFavicon, file);
  }

  private uploadAsset(path: string, file: File): Observable<BrandingDto> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.post<BrandingDto>(apiUrl(path), body);
  }
}
