import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { BrandingDto, ColorScheme, DEFAULT_BRANDING } from './branding.dto';

@Injectable({ providedIn: 'root' })
export class BrandingService {
  private readonly http = inject(HttpClient);
  private readonly title = inject(Title);
  private readonly document = inject(DOCUMENT);
  private readonly brandingState = signal<BrandingDto>(DEFAULT_BRANDING);

  readonly branding = this.brandingState.asReadonly();
  readonly studioName = computed(() => this.brandingState().studioName);
  readonly slogan = computed(() => this.brandingState().slogan);
  readonly logoHref = computed(() => assetUrl(this.brandingState().logoUrl));

  constructor() {
    this.paint(DEFAULT_BRANDING);
  }

  load(): Promise<void> {
    const base = apiBase();
    if (!base) {
      return Promise.resolve();
    }
    return firstValueFrom(
      this.http.get<BrandingDto>(`${base}/branding`).pipe(timeout({ first: 3000 })),
    )
      .then((row) => {
        this.brandingState.set(row);
        this.paint(row);
      })
      .catch(() => undefined);
  }

  private paint(row: BrandingDto): void {
    const root = this.document.documentElement;
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
    root.style.setProperty('color-scheme', scheme);
    root.setAttribute('data-color-scheme', scheme);
    this.title.setTitle(`${row.studioName} | ${row.slogan}`);
    const description = this.document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute('content', `${row.studioName}. ${row.slogan}`);
    }
    setFavicon(this.document, assetUrl(row.faviconUrl));
  }
}

function resolveScheme(scheme: ColorScheme): 'light' | 'dark' {
  if (scheme !== 'system') {
    return scheme;
  }
  const prefersDark =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

function apiBase(): string {
  return environment.apiUrl.replace(/\/+$/, '');
}

function assetUrl(path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const relative = path.startsWith('/') ? path : `/${path}`;
  return `${apiBase()}${relative}`;
}

function setFavicon(document: Document, href: string | null): void {
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
