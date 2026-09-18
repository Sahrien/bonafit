import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { BrandingDto, ColorScheme, DEFAULT_BRANDING } from './branding.dto';

@Injectable({ providedIn: 'root' })
export class BrandingService {
  private readonly http = inject(HttpClient);
  private readonly title = inject(Title);
  private readonly brandingState = signal<BrandingDto>(DEFAULT_BRANDING);

  readonly branding = this.brandingState.asReadonly();
  readonly studioName = computed(() => this.brandingState().studioName);
  readonly slogan = computed(() => this.brandingState().slogan);
  readonly logoHref = computed(() => assetUrl(this.brandingState().logoUrl));

  constructor() {
    this.paint(DEFAULT_BRANDING);
  }

  load(): Promise<void> {
    const base = environment.apiUrl.replace(/\/+$/, '');
    if (!base) {
      return Promise.resolve();
    }
    return firstValueFrom(this.http.get<BrandingDto>(`${base}/branding`))
      .then((row) => {
        this.brandingState.set(row);
        this.paint(row);
      })
      .catch(() => undefined);
  }

  private paint(row: BrandingDto): void {
    if (typeof document === 'undefined') {
      return;
    }
    const root = document.documentElement;
    const scheme = resolveScheme(row.colorScheme);
    const primary = row.primaryHex;
    const accent = row.accentHex;
    const surface = row.surfaceHex;
    if (scheme === 'dark') {
      root.style.setProperty('--color-cream', `color-mix(in srgb, ${primary} 78%, #050807)`);
      root.style.setProperty('--color-card', `color-mix(in srgb, ${primary} 62%, #0b100e)`);
      root.style.setProperty('--color-forest', surface);
      root.style.setProperty('--color-ink', surface);
      root.style.setProperty('--color-pine', `color-mix(in srgb, ${accent} 45%, ${surface})`);
      root.style.setProperty('--color-sage', `color-mix(in srgb, ${accent} 35%, ${surface})`);
      root.style.setProperty('--color-muted', `color-mix(in srgb, ${surface} 70%, ${accent})`);
      root.style.setProperty('--color-line', `color-mix(in srgb, ${surface} 18%, transparent)`);
    } else {
      root.style.setProperty('--color-forest', primary);
      root.style.setProperty('--color-ink', primary);
      root.style.setProperty('--color-pine', accent);
      root.style.setProperty('--color-sage', `color-mix(in srgb, ${accent} 55%, ${surface})`);
      root.style.setProperty('--color-sage-soft', `color-mix(in srgb, ${accent} 28%, ${surface})`);
      root.style.setProperty('--color-cream', surface);
      root.style.setProperty('--color-card', `color-mix(in srgb, ${surface} 88%, #ffffff)`);
      root.style.setProperty('--color-muted', `color-mix(in srgb, ${primary} 55%, ${accent})`);
      root.style.setProperty('--color-line', `color-mix(in srgb, ${primary} 12%, transparent)`);
    }
    root.style.colorScheme = scheme;
    root.dataset['colorScheme'] = scheme;
    this.title.setTitle(`${row.studioName} | ${row.slogan}`);
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute('content', `${row.studioName}. ${row.slogan}`);
    }
    setFavicon(assetUrl(row.faviconUrl));
  }
}

function resolveScheme(scheme: ColorScheme): 'light' | 'dark' {
  if (scheme === 'system') {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return scheme;
}

function assetUrl(path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const base = environment.apiUrl.replace(/\/+$/, '');
  const relative = path.startsWith('/') ? path : `/${path}`;
  return `${base}${relative}`;
}

function setFavicon(href: string | null): void {
  if (!href) {
    return;
  }
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = href;
}
