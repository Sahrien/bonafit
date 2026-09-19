import { Observable } from 'rxjs';
import { BrandingDto, BrandingWriteDto } from '../models/branding.dto';

export interface BrandingApi {
  getBranding(): Observable<BrandingDto>;
  updateBranding(payload: BrandingWriteDto): Observable<BrandingDto>;
  uploadLogo(file: File): Observable<BrandingDto>;
  deleteLogo(): Observable<BrandingDto>;
  uploadFavicon(file: File): Observable<BrandingDto>;
  deleteFavicon(): Observable<BrandingDto>;
}
