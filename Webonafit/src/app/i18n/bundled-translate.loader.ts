import { Injectable } from '@angular/core';
import { TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import en from '../../assets/i18n/en.json';
import es from '../../assets/i18n/es.json';

@Injectable()
export class BundledTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<object> {
    return of(lang === 'en' ? en : es);
  }
}
