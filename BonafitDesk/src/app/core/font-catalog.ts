export const BRAND_FONTS = [
  {
    id: 'inter',
    label: 'Inter',
    stack: "Inter, 'Segoe UI', Roboto, sans-serif",
  },
  {
    id: 'montserrat',
    label: 'Montserrat',
    stack: "Montserrat, 'Segoe UI', Roboto, sans-serif",
  },
  {
    id: 'manrope',
    label: 'Manrope',
    stack: "Manrope, 'Segoe UI', Roboto, sans-serif",
  },
  {
    id: 'jost',
    label: 'Jost',
    stack: "Jost, 'Segoe UI', Roboto, sans-serif",
  },
  {
    id: 'lato',
    label: 'Lato',
    stack: "Lato, 'Segoe UI', Roboto, sans-serif",
  },
  {
    id: 'poppins',
    label: 'Poppins',
    stack: "Poppins, 'Segoe UI', Roboto, sans-serif",
  },
  {
    id: 'nunito-sans',
    label: 'Nunito Sans',
    stack: "'Nunito Sans', 'Segoe UI', Roboto, sans-serif",
  },
  {
    id: 'work-sans',
    label: 'Work Sans',
    stack: "'Work Sans', 'Segoe UI', Roboto, sans-serif",
  },
  {
    id: 'dm-sans',
    label: 'DM Sans',
    stack: "'DM Sans', 'Segoe UI', Roboto, sans-serif",
  },
  {
    id: 'raleway',
    label: 'Raleway',
    stack: "Raleway, 'Segoe UI', Roboto, sans-serif",
  },
  {
    id: 'outfit',
    label: 'Outfit',
    stack: "Outfit, 'Segoe UI', Roboto, sans-serif",
  },
  {
    id: 'josefin-sans',
    label: 'Josefin Sans',
    stack: "'Josefin Sans', 'Segoe UI', Roboto, sans-serif",
  },
  {
    id: 'rubik',
    label: 'Rubik',
    stack: "Rubik, 'Segoe UI', Roboto, sans-serif",
  },
  {
    id: 'lora',
    label: 'Lora',
    stack: "Lora, Georgia, 'Times New Roman', serif",
  },
  {
    id: 'playfair',
    label: 'Playfair Display',
    stack: "'Playfair Display', Georgia, 'Times New Roman', serif",
  },
  {
    id: 'merriweather',
    label: 'Merriweather',
    stack: "Merriweather, Georgia, 'Times New Roman', serif",
  },
  {
    id: 'cormorant-garamond',
    label: 'Cormorant Garamond',
    stack: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
  },
  {
    id: 'crimson-pro',
    label: 'Crimson Pro',
    stack: "'Crimson Pro', Georgia, 'Times New Roman', serif",
  },
  {
    id: 'libre-baskerville',
    label: 'Libre Baskerville',
    stack: "'Libre Baskerville', Georgia, 'Times New Roman', serif",
  },
  {
    id: 'jetbrains-mono',
    label: 'JetBrains Mono',
    stack: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  },
  {
    id: 'bebas-neue',
    label: 'Bebas Neue',
    stack: "'Bebas Neue', Impact, 'Arial Narrow', sans-serif",
  },
  {
    id: 'space-mono',
    label: 'Space Mono',
    stack: "'Space Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  },
] as const;

export type BrandFontId = (typeof BRAND_FONTS)[number]['id'];

export const DEFAULT_BRAND_FONT: BrandFontId = 'inter';

export function brandFontStack(id: string | null | undefined): string {
  return BRAND_FONTS.find((font) => font.id === id)?.stack ?? BRAND_FONTS[0].stack;
}

export function isBrandFontId(value: string): value is BrandFontId {
  return BRAND_FONTS.some((font) => font.id === value);
}

export function brandFontLabel(id: string | null | undefined): string {
  return BRAND_FONTS.find((font) => font.id === id)?.label ?? '';
}
