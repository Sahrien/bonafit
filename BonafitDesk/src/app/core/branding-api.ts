import { Observable } from 'rxjs';
import { BrandingDto, BrandingTypographyDto, BrandingWriteDto } from '../models/branding.dto';

export interface BrandingApi {
  getBranding(): Observable<BrandingDto>;
  updateBranding(payload: BrandingWriteDto): Observable<BrandingDto>;
  updateTypography(payload: BrandingTypographyDto): Observable<BrandingDto>;
  uploadLogo(file: File): Observable<BrandingDto>;
  deleteLogo(): Observable<BrandingDto>;
  uploadLogoDark(file: File): Observable<BrandingDto>;
  deleteLogoDark(): Observable<BrandingDto>;
  uploadFavicon(file: File): Observable<BrandingDto>;
  deleteFavicon(): Observable<BrandingDto>;
}
