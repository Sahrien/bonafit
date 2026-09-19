import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Observable, concat, forkJoin, last } from 'rxjs';
import { BonaButtonComponent } from '../../components/bona-button/bona-button.component';
import { BonaConfirm } from '../../components/bona-confirm/bona-confirm.service';
import { BonaFieldDefinition } from '../../components/bona-field/bona-field.definition';
import { BonaFormComponent, BonaFormValue } from '../../components/bona-form/bona-form.component';
import { BonaLanguageSwitcherComponent } from '../../components/bona-language-switcher/bona-language-switcher.component';
import { BonaPageComponent } from '../../components/bona-page/bona-page.component';
import { BonaToast } from '../../components/bona-toast/bona-toast.service';
import { BrandThemeService, apiAssetUrl } from '../../core/brand-theme.service';
import { contrastOn } from '../../core/brand-contrast';
import { injectAuthSession } from '../../core/auth/inject-auth-session';
import { injectI18n } from '../../core/i18n/inject-i18n';
import { BrandingDto, BrandingWriteDto, ColorScheme } from '../../models/branding.dto';
import { CalendarApiService } from '../../services/calendar-api.service';
import { BrandingApiService } from '../../services/branding-api.service';
import { PasswordChangeFormComponent } from './password-change-form.component';

const HEX = /^#[0-9A-Fa-f]{6}$/;

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [
    BonaPageComponent,
    BonaFormComponent,
    BonaButtonComponent,
    PasswordChangeFormComponent,
    BonaLanguageSwitcherComponent,
    MatIconButton,
    MatIcon,
  ],
  templateUrl: './admin-settings.component.html',
  styleUrl: './admin-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:beforeunload)': 'onBeforeUnload($event)',
  },
})
export class AdminSettingsComponent {
  private readonly calendarApi = inject(CalendarApiService);
  private readonly brandingApi = inject(BrandingApiService);
  readonly brandTheme = inject(BrandThemeService);
  private readonly toast = inject(BonaToast);
  private readonly confirm = inject(BonaConfirm);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authSession = injectAuthSession();

  private readonly i18n = injectI18n('settings');
  get literals() {
    return this.i18n();
  }
  readonly loading = signal(true);
  readonly error = signal('');
  readonly userName = this.authSession.userName;
  readonly userEmail = this.authSession.userEmail;
  readonly bookingForm = signal<BonaFormValue>({
    nextDayCutoffTime: '18:00',
    defaultLocation: '',
  });
  readonly brandForm = signal<BonaFormValue>({
    studioName: '',
    slogan: '',
    colorScheme: 'light',
  });
  readonly primaryHex = signal('#0f766e');
  readonly accentHex = signal('#c2410c');
  readonly surfaceHex = signal('#f5f3f0');
  private readonly savedLogoHref = signal<string | null>(null);
  private readonly savedFaviconHref = signal<string | null>(null);
  private readonly pendingLogoFile = signal<File | null>(null);
  private readonly pendingLogoUrl = signal<string | null>(null);
  private readonly pendingLogoRemove = signal(false);
  private readonly pendingFaviconFile = signal<File | null>(null);
  private readonly pendingFaviconUrl = signal<string | null>(null);
  private readonly pendingFaviconRemove = signal(false);
  readonly logoHref = computed(() => {
    const pending = this.pendingLogoUrl();
    if (pending) {
      return pending;
    }
    return this.pendingLogoRemove() ? null : this.savedLogoHref();
  });
  readonly faviconHref = computed(() => {
    const pending = this.pendingFaviconUrl();
    if (pending) {
      return pending;
    }
    return this.pendingFaviconRemove() ? null : this.savedFaviconHref();
  });
  private readonly brandSnapshot = signal('');
  readonly brandFingerprint = computed(() =>
    JSON.stringify({
      studioName: (this.brandForm()['studioName'] ?? '').trim(),
      slogan: (this.brandForm()['slogan'] ?? '').trim(),
      colorScheme: this.brandForm()['colorScheme'] ?? 'light',
      primaryHex: this.primaryHex().trim().toLowerCase(),
      accentHex: this.accentHex().trim().toLowerCase(),
      surfaceHex: this.surfaceHex().trim().toLowerCase(),
      logo: this.assetToken(this.pendingLogoFile(), this.pendingLogoRemove()),
      favicon: this.assetToken(this.pendingFaviconFile(), this.pendingFaviconRemove()),
    }),
  );
  readonly brandDirty = computed(() => this.brandFingerprint() !== this.brandSnapshot());
  readonly previewDark = computed(() => this.brandTheme.resolvedScheme() === 'dark');

  readonly bookingFields = computed<BonaFieldDefinition[]>(() => [
    { key: 'nextDayCutoffTime', label: this.literals.cutoffTime, type: 'time', required: true },
    { key: 'defaultLocation', label: this.literals.defaultLocation, type: 'text', required: true },
  ]);

  readonly brandFields = computed<BonaFieldDefinition[]>(() => [
    { key: 'studioName', label: this.literals.studioName, type: 'text', required: true },
    { key: 'slogan', label: this.literals.slogan, type: 'text' },
    {
      key: 'colorScheme',
      label: this.literals.colorScheme,
      type: 'select',
      options: [
        { value: 'light', label: this.literals.colorSchemeLight },
        { value: 'dark', label: this.literals.colorSchemeDark },
        { value: 'system', label: this.literals.colorSchemeSystem },
      ],
    },
  ]);

  constructor() {
    this.destroyRef.onDestroy(() => this.revokePendingUrls());
    forkJoin({
      booking: this.calendarApi.getBookingSettings(),
      branding: this.brandingApi.getBranding(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ booking, branding }) => {
          this.bookingForm.set({
            nextDayCutoffTime: booking.nextDayCutoffTime,
            defaultLocation: booking.defaultLocation,
          });
          this.applyBrandFields(branding);
          this.brandTheme.apply(branding);
          this.captureBrandSnapshot();
          this.loading.set(false);
        },
        error: () => {
          this.error.set(this.literals.errorSave);
          this.loading.set(false);
        },
      });
  }

  onBookingChange(value: BonaFormValue): void {
    this.bookingForm.set(value);
  }

  onBrandChange(value: BonaFormValue): void {
    this.brandForm.set(value);
  }

  onPrimaryColor(event: Event): void {
    this.primaryHex.set((event.target as HTMLInputElement).value);
  }

  onAccentColor(event: Event): void {
    this.accentHex.set((event.target as HTMLInputElement).value);
  }

  onSurfaceColor(event: Event): void {
    this.surfaceHex.set((event.target as HTMLInputElement).value);
  }

  onPrimaryHex(event: Event): void {
    this.primaryHex.set((event.target as HTMLInputElement).value);
  }

  onAccentHex(event: Event): void {
    this.accentHex.set((event.target as HTMLInputElement).value);
  }

  onSurfaceHex(event: Event): void {
    this.surfaceHex.set((event.target as HTMLInputElement).value);
  }

  pickerHex(value: string): string {
    return this.normalizeHex(value) ?? '#000000';
  }

  hexInvalid(value: string): boolean {
    return value.trim().length > 0 && !this.normalizeHex(value);
  }

  accentOnColor(): string {
    return contrastOn(this.pickerHex(this.accentHex()));
  }

  onSaveBooking(value: BonaFormValue): void {
    const nextDayCutoffTime = (value['nextDayCutoffTime'] ?? '').trim();
    const defaultLocation = (value['defaultLocation'] ?? '').trim();
    if (!nextDayCutoffTime || !defaultLocation) {
      this.error.set(this.literals.errorRequired);
      return;
    }
    this.error.set('');
    this.calendarApi
      .updateBookingSettings({ nextDayCutoffTime, defaultLocation })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (settings) => {
          this.bookingForm.set({
            nextDayCutoffTime: settings.nextDayCutoffTime,
            defaultLocation: settings.defaultLocation,
          });
          this.toast.success(this.literals.saved);
        },
        error: () => this.toast.error(this.literals.errorSave),
      });
  }

  onSaveBrand(value: BonaFormValue): void {
    const payload = this.brandPayload(value);
    if (!payload) {
      return;
    }
    this.error.set('');
    concat(...this.brandSaveOps(payload))
      .pipe(last(), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (branding) => {
          this.applyBrandFields(branding);
          this.clearPendingAssets();
          this.brandTheme.apply(branding);
          this.captureBrandSnapshot();
          this.toast.success(this.literals.saved);
        },
        error: () => this.toast.error(this.literals.errorSave),
      });
  }

  onLogoSelected(event: Event): void {
    this.stageAsset(event, 'logo');
  }

  onRemoveLogo(): void {
    this.stageRemove('logo');
  }

  onFaviconSelected(event: Event): void {
    this.stageAsset(event, 'favicon');
  }

  onRemoveFavicon(): void {
    this.stageRemove('favicon');
  }

  onPasswordSaved(): void {
    this.toast.success(this.literals.passwordSaved);
  }

  confirmLeaveIfDirty(): boolean | Observable<boolean> {
    if (!this.brandDirty()) {
      return true;
    }
    return this.confirm.open({
      title: this.literals.confirmLeaveTitle,
      message: this.literals.confirmLeaveMessage,
      confirmLabel: this.literals.confirmLeaveConfirm,
    });
  }

  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.brandDirty()) {
      return;
    }
    event.preventDefault();
    event.returnValue = true;
  }

  private brandSaveOps(payload: BrandingWriteDto): Array<Observable<BrandingDto>> {
    const ops: Array<Observable<BrandingDto>> = [this.brandingApi.updateBranding(payload)];
    const logoFile = this.pendingLogoFile();
    if (logoFile) {
      ops.push(this.brandingApi.uploadLogo(logoFile));
    } else if (this.pendingLogoRemove()) {
      ops.push(this.brandingApi.deleteLogo());
    }
    const faviconFile = this.pendingFaviconFile();
    if (faviconFile) {
      ops.push(this.brandingApi.uploadFavicon(faviconFile));
    } else if (this.pendingFaviconRemove()) {
      ops.push(this.brandingApi.deleteFavicon());
    }
    return ops;
  }

  private brandPayload(value: BonaFormValue): BrandingWriteDto | null {
    const studioName = (value['studioName'] ?? '').trim();
    const slogan = (value['slogan'] ?? '').trim();
    const colorScheme = (value['colorScheme'] ?? 'light') as ColorScheme;
    const primaryHex = this.normalizeHex(this.primaryHex());
    const accentHex = this.normalizeHex(this.accentHex());
    const surfaceHex = this.normalizeHex(this.surfaceHex());
    if (!studioName || !primaryHex || !accentHex || !surfaceHex) {
      this.error.set(!studioName ? this.literals.errorRequired : this.literals.errorColor);
      return null;
    }
    return { studioName, slogan, primaryHex, accentHex, surfaceHex, colorScheme };
  }

  private applyBrandFields(branding: BrandingDto): void {
    this.brandForm.set({
      studioName: branding.studioName,
      slogan: branding.slogan,
      colorScheme: branding.colorScheme,
    });
    this.primaryHex.set(branding.primaryHex);
    this.accentHex.set(branding.accentHex);
    this.surfaceHex.set(branding.surfaceHex);
    this.savedLogoHref.set(apiAssetUrl(branding.logoUrl));
    this.savedFaviconHref.set(apiAssetUrl(branding.faviconUrl));
  }

  private captureBrandSnapshot(): void {
    this.brandSnapshot.set(this.brandFingerprint());
  }

  private normalizeHex(value: string): string | null {
    const hex = value.trim();
    return HEX.test(hex) ? hex.toLowerCase() : null;
  }

  private assetToken(file: File | null, remove: boolean): string {
    if (file) {
      return `file:${file.name}:${file.size}:${file.lastModified}`;
    }
    return remove ? 'remove' : 'keep';
  }

  private stageAsset(event: Event, kind: 'logo' | 'favicon'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    if (kind === 'logo') {
      this.revokeUrl(this.pendingLogoUrl());
      this.pendingLogoFile.set(file);
      this.pendingLogoUrl.set(URL.createObjectURL(file));
      this.pendingLogoRemove.set(false);
      return;
    }
    this.revokeUrl(this.pendingFaviconUrl());
    this.pendingFaviconFile.set(file);
    this.pendingFaviconUrl.set(URL.createObjectURL(file));
    this.pendingFaviconRemove.set(false);
  }

  private stageRemove(kind: 'logo' | 'favicon'): void {
    if (kind === 'logo') {
      if (this.pendingLogoFile() || this.pendingLogoUrl()) {
        this.revokeUrl(this.pendingLogoUrl());
        this.pendingLogoFile.set(null);
        this.pendingLogoUrl.set(null);
        return;
      }
      if (this.savedLogoHref()) {
        this.pendingLogoRemove.set(true);
      }
      return;
    }
    if (this.pendingFaviconFile() || this.pendingFaviconUrl()) {
      this.revokeUrl(this.pendingFaviconUrl());
      this.pendingFaviconFile.set(null);
      this.pendingFaviconUrl.set(null);
      return;
    }
    if (this.savedFaviconHref()) {
      this.pendingFaviconRemove.set(true);
    }
  }

  private clearPendingAssets(): void {
    this.revokePendingUrls();
    this.pendingLogoFile.set(null);
    this.pendingLogoUrl.set(null);
    this.pendingLogoRemove.set(false);
    this.pendingFaviconFile.set(null);
    this.pendingFaviconUrl.set(null);
    this.pendingFaviconRemove.set(false);
  }

  private revokePendingUrls(): void {
    this.revokeUrl(this.pendingLogoUrl());
    this.revokeUrl(this.pendingFaviconUrl());
  }

  private revokeUrl(href: string | null): void {
    if (href?.startsWith('blob:')) {
      URL.revokeObjectURL(href);
    }
  }
}
