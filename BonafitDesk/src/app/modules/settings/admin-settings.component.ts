import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { BonaFieldDefinition } from '../../components/bona-field/bona-field.definition';
import { BonaFormComponent, BonaFormValue } from '../../components/bona-form/bona-form.component';
import { BonaLanguageSwitcherComponent } from '../../components/bona-language-switcher/bona-language-switcher.component';
import { BonaPageComponent } from '../../components/bona-page/bona-page.component';
import { BonaToast } from '../../components/bona-toast/bona-toast.service';
import { BrandThemeService } from '../../core/brand-theme.service';
import { injectAuthSession } from '../../core/auth/inject-auth-session';
import { injectI18n } from '../../core/i18n/inject-i18n';
import { BrandingWriteDto, ColorScheme } from '../../models/branding.dto';
import { CalendarApiService } from '../../services/calendar-api.service';
import { BrandingApiService } from '../../services/branding-api.service';
import { PasswordChangeFormComponent } from './password-change-form.component';

const HEX = /^#[0-9A-Fa-f]{6}$/;

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [BonaPageComponent, BonaFormComponent, PasswordChangeFormComponent, BonaLanguageSwitcherComponent],
  templateUrl: './admin-settings.component.html',
  styleUrl: './admin-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSettingsComponent {
  private readonly calendarApi = inject(CalendarApiService);
  private readonly brandingApi = inject(BrandingApiService);
  readonly brandTheme = inject(BrandThemeService);
  private readonly toast = inject(BonaToast);
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
  readonly logoHref = this.brandTheme.logoHref;
  readonly faviconHref = this.brandTheme.faviconHref;

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
          this.brandForm.set({
            studioName: branding.studioName,
            slogan: branding.slogan,
            colorScheme: branding.colorScheme,
          });
          this.primaryHex.set(branding.primaryHex);
          this.accentHex.set(branding.accentHex);
          this.surfaceHex.set(branding.surfaceHex);
          this.brandTheme.apply(branding);
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
    this.brandingApi
      .updateBranding(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (branding) => {
          this.brandTheme.apply(branding);
          this.toast.success(this.literals.saved);
        },
        error: () => this.toast.error(this.literals.errorSave),
      });
  }

  onLogoSelected(event: Event): void {
    this.uploadAsset(event, (file) => this.brandingApi.uploadLogo(file));
  }

  onFaviconSelected(event: Event): void {
    this.uploadAsset(event, (file) => this.brandingApi.uploadFavicon(file));
  }

  onPasswordSaved(): void {
    this.toast.success(this.literals.passwordSaved);
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

  private normalizeHex(value: string): string | null {
    const hex = value.trim();
    return HEX.test(hex) ? hex.toLowerCase() : null;
  }

  private uploadAsset(event: Event, send: (file: File) => ReturnType<BrandingApiService['uploadLogo']>): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    send(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (branding) => {
          this.brandTheme.apply(branding);
          this.toast.success(this.literals.saved);
        },
        error: () => this.toast.error(this.literals.errorSave),
      });
  }
}
