import { inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';
import es from '../../../assets/i18n/es.json';

export type DeskI18n = typeof es;

export function injectI18n<K extends keyof DeskI18n>(key: K) {
  const translate = inject(TranslateService);
  return toSignal(translate.stream(key).pipe(map((value) => value as DeskI18n[K])), {
    initialValue: translate.instant(key) as DeskI18n[K],
  });
}
