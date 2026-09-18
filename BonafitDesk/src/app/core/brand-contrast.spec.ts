import { contrastOn, relativeLuminance } from './brand-contrast';

describe('brand contrast', () => {
  it('treats teal as dark enough for white text', () => {
    expect(relativeLuminance('#0f766e')).toBeLessThan(0.179);
    expect(contrastOn('#0f766e')).toBe('#ffffff');
  });

  it('treats cream as light enough for dark text', () => {
    expect(contrastOn('#f5f3f0')).toBe('#1c1917');
  });
});
