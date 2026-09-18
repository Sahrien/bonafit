export function relativeLuminance(hex: string): number {
  const value = hex.replace('#', '');
  if (value.length !== 6) {
    return 0;
  }
  const channel = (start: number) => {
    const raw = Number.parseInt(value.slice(start, start + 2), 16) / 255;
    return raw <= 0.04045 ? raw / 12.92 : ((raw + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

export function contrastOn(hex: string): string {
  return relativeLuminance(hex) > 0.179 ? '#1c1917' : '#ffffff';
}
