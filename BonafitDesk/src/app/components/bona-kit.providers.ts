import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';

/**
 * Optional bootstrap providers for the bona-* kit.
 * Register in app.config.ts (wave 2 shells) so Material ripples and form-field
 * animations are available: `providers: [provideBonaKit(), ...]`.
 */
export function provideBonaKit(): EnvironmentProviders {
  return makeEnvironmentProviders([provideAnimations()]);
}
