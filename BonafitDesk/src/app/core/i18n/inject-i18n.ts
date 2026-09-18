import { inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';

export function injectI18n<T extends Record<string, unknown>>(key: string) {
  const translate = inject(TranslateService);
  return toSignal(translate.stream(key).pipe(map((value) => value as T)), {
    initialValue: translate.instant(key) as T,
  });
}
