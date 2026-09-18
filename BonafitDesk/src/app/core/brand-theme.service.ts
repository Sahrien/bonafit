import { Injectable, computed, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { BrandingDto, ColorScheme, DEFAULT_BRANDING } from '../models/branding.dto';
import { BrandingApiService } from '../services/branding-api.service';
import { contrastOn } from './brand-contrast';

const BRANDING_CACHE_KEY = 'bona.branding';
const SCHEME_OVERRIDE_KEY = 'bona.colorScheme';

@Injectable({ providedIn: 'root' })
export class BrandThemeService {
  private readonly api = inject(BrandingApiService);
  private readonly title = inject(Title);

  private readonly brandingState = signal<BrandingDto>(readCachedBranding());
  private readonly schemeOverride = signal<ColorScheme | null>(readSchemeOverride());

  readonly branding = this.brandingState.asReadonly();
  readonly studioName = computed(() => this.brandingState().studioName);
  readonly slogan = computed(() => this.brandingState().slogan);
  readonly logoHref = computed(() => apiAssetUrl(this.brandingState().logoUrl));
  readonly faviconHref = computed(() => apiAssetUrl(this.brandingState().faviconUrl));
  readonly preferredScheme = computed(
    () => this.schemeOverride() ?? this.brandingState().colorScheme,
  );
  readonly resolvedScheme = computed(() => resolveScheme(this.preferredScheme()));
  readonly schemeToggleLabel = computed(() => this.preferredScheme());

  constructor() {
    this.paint(this.brandingState());
    if (typeof window !== 'undefined') {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (this.preferredScheme() === 'system') {
          this.paint(this.brandingState());
        }
      });
    }
  }

  load(): Promise<void> {
    return firstValueFrom(this.api.getBranding())
      .then((row) => {
        this.apply(row);
      })
      .catch(() => undefined);
  }

  apply(row: BrandingDto): void {
    this.brandingState.set(row);
    writeCachedBranding(row);
    this.paint(row);
  }

  cycleColorScheme(): void {
    const order: ColorScheme[] = ['light', 'dark', 'system'];
    const current = this.preferredScheme();
    const next = order[(order.indexOf(current) + 1) % order.length];
    this.schemeOverride.set(next);
    writeSchemeOverride(next);
    this.paint(this.brandingState());
  }

  private paint(row: BrandingDto): void {
    if (typeof document === 'undefined') {
      return;
    }
    const root = document.documentElement;
    const primary = row.primaryHex;
    const accent = row.accentHex;
    const onPrimary = contrastOn(primary);
    const onAccent = contrastOn(accent);
    const scheme = resolveScheme(this.schemeOverride() ?? row.colorScheme);

    root.style.setProperty('--bona-color-primary', primary);
    root.style.setProperty('--bona-color-primary-contrast', onPrimary);
    root.style.setProperty('--bona-color-rail', primary);
    root.style.setProperty('--bona-color-accent', accent);
    root.style.setProperty('--bona-color-accent-contrast', onAccent);
    root.style.setProperty('--mat-sys-primary', primary);
    root.style.setProperty('--mat-sys-on-primary', onPrimary);
    root.style.setProperty(
      '--mat-sys-primary-container',
      `color-mix(in srgb, ${primary} 22%, var(--mat-sys-surface))`,
    );
    root.style.setProperty('--mat-sys-tertiary', accent);
    root.style.setProperty('--mat-sys-on-tertiary', onAccent);
    root.style.colorScheme = scheme;
    root.dataset['bonaScheme'] = scheme;

    this.title.setTitle(row.studioName);
    setFavicon(apiAssetUrl(row.faviconUrl));
  }
}

export function apiAssetUrl(path: string | null | undefined): string | null {
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

function resolveScheme(scheme: ColorScheme): 'light' | 'dark' {
  if (scheme === 'system') {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return scheme;
}

function readCachedBranding(): BrandingDto {
  if (typeof localStorage === 'undefined') {
    return DEFAULT_BRANDING;
  }
  try {
    const raw = localStorage.getItem(BRANDING_CACHE_KEY);
    if (!raw) {
      return DEFAULT_BRANDING;
    }
    return { ...DEFAULT_BRANDING, ...(JSON.parse(raw) as BrandingDto) };
  } catch {
    return DEFAULT_BRANDING;
  }
}

function writeCachedBranding(row: BrandingDto): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(row));
}

function readSchemeOverride(): ColorScheme | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  const value = localStorage.getItem(SCHEME_OVERRIDE_KEY);
  return value === 'light' || value === 'dark' || value === 'system' ? value : null;
}

function writeSchemeOverride(scheme: ColorScheme): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(SCHEME_OVERRIDE_KEY, scheme);
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
