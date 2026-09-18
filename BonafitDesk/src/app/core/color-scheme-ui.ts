import { ColorScheme } from '../models/branding.dto';

export function schemeIcon(scheme: ColorScheme): string {
  if (scheme === 'dark') {
    return 'dark_mode';
  }
  if (scheme === 'light') {
    return 'light_mode';
  }
  return 'contrast';
}

export function schemeLabel(
  scheme: ColorScheme,
  literals: { colorSchemeLight: string; colorSchemeDark: string; colorSchemeSystem: string },
): string {
  if (scheme === 'dark') {
    return literals.colorSchemeDark;
  }
  if (scheme === 'light') {
    return literals.colorSchemeLight;
  }
  return literals.colorSchemeSystem;
}
