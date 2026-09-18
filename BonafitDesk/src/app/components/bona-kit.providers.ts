import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideDeskTranslate } from '../core/i18n/provide-desk-translate';

export function provideBonaKit(): EnvironmentProviders {
  return makeEnvironmentProviders([provideAnimations(), provideDeskTranslate()]);
}
