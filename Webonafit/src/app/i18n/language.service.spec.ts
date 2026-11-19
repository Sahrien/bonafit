import { languageFromPath } from './language.service';

describe('languageFromPath', () => {
  it('defaults to Spanish for the unprefixed site', () => {
    expect(languageFromPath('/')).toBe('es');
    expect(languageFromPath('/contacto')).toBe('es');
  });

  it('recognizes English URLs', () => {
    expect(languageFromPath('/en')).toBe('en');
    expect(languageFromPath('/en/')).toBe('en');
    expect(languageFromPath('/en/contacto')).toBe('en');
  });

  it('does not treat lookalike prefixes as English', () => {
    expect(languageFromPath('/enero')).toBe('es');
  });
});
