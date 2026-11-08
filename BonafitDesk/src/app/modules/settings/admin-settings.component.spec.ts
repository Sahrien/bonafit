import { provideHttpClient } from '@angular/common/http';
import { provideDeskTranslate } from '../../core/i18n/provide-desk-translate';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { MOCK_BOOKING_SETTINGS, MOCK_BRANDING, MOCK_ACCOUNTS, createMockSession } from '../../testing/fixtures';
import { provideBonaFeedbackTesting } from '../../testing/bona-feedback';
import { AuthApiService } from '../../services/auth-api.service';
import { CalendarApiService } from '../../services/calendar-api.service';
import { BrandingApiService } from '../../services/branding-api.service';
import { BonaConfirm } from '../../components/bona-confirm/bona-confirm.service';
import { BonaToast } from '../../components/bona-toast/bona-toast.service';
import { SCHEDULES_LITERALS } from '../schedules/schedules.literals';
import { AdminSettingsComponent } from './admin-settings.component';
import { SETTINGS_LITERALS } from './settings.literals';

describe('AdminSettingsComponent', () => {
  let calendarApi: jasmine.SpyObj<CalendarApiService>;
  let brandingApi: jasmine.SpyObj<BrandingApiService>;
  let authApi: jasmine.SpyObj<AuthApiService>;

  beforeEach(async () => {
    calendarApi = jasmine.createSpyObj('CalendarApiService', [
      'getBookingSettings',
      'updateBookingSettings',
      'updateTrainer',
    ]);
    brandingApi = jasmine.createSpyObj('BrandingApiService', [
      'getBranding',
      'updateBranding',
      'updateTypography',
      'uploadLogo',
      'deleteLogo',
      'uploadLogoDark',
      'deleteLogoDark',
      'uploadFavicon',
      'deleteFavicon',
    ]);
    authApi = jasmine.createSpyObj('AuthApiService', ['getSession', 'changePassword']);
    calendarApi.getBookingSettings.and.returnValue(of(MOCK_BOOKING_SETTINGS));
    brandingApi.getBranding.and.returnValue(of(MOCK_BRANDING));
    brandingApi.updateBranding.and.returnValue(of(MOCK_BRANDING));
    authApi.getSession.and.returnValue(of(createMockSession(MOCK_ACCOUNTS[0])));

    await TestBed.configureTestingModule({
      imports: [AdminSettingsComponent],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(), provideDeskTranslate(),
        { provide: CalendarApiService, useValue: calendarApi },
        { provide: BrandingApiService, useValue: brandingApi },
        { provide: AuthApiService, useValue: authApi },
        ...provideBonaFeedbackTesting().providers,
      ],
    }).compileComponents();
  });

  it('loads booking settings', () => {
    const fixture = TestBed.createComponent(AdminSettingsComponent);
    fixture.detectChanges();

    expect(calendarApi.getBookingSettings).toHaveBeenCalled();
    expect(brandingApi.getBranding).toHaveBeenCalled();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain(SETTINGS_LITERALS.title);
    expect(text).toContain(SETTINGS_LITERALS.bookingTitle);
    expect(text).toContain(SETTINGS_LITERALS.brandTitle);
    expect(text).toContain(SETTINGS_LITERALS.typographyTitle);
    expect(text).toContain(SETTINGS_LITERALS.cutoffTime);
    expect(text).not.toContain(SCHEDULES_LITERALS.capacityTitle);
    expect(text).toContain(SETTINGS_LITERALS.passwordTitle);
    expect(text).toContain(SETTINGS_LITERALS.saveBrand);
    expect(fixture.nativeElement.querySelectorAll('app-bona-language-switcher').length).toBe(1);
    expect(text).toContain(SETTINGS_LITERALS.noLogo);
    expect(text).toContain(SETTINGS_LITERALS.noLogoDark);
    expect(text).toContain(SETTINGS_LITERALS.noFavicon);
    expect(text).not.toContain(SETTINGS_LITERALS.removeLogo);
    expect(text).not.toContain(SETTINGS_LITERALS.removeLogoDark);
    expect(saveBrandButton(fixture.nativeElement)?.disabled).toBeTrue();
  });

  it('stages logo removal until brand save', () => {
    brandingApi.getBranding.and.returnValue(
      of({ ...MOCK_BRANDING, logoUrl: '/uploads/branding/logo.png' }),
    );
    brandingApi.deleteLogo.and.returnValue(of({ ...MOCK_BRANDING, logoUrl: null }));
    brandingApi.updateBranding.and.returnValue(of({ ...MOCK_BRANDING, logoUrl: null }));
    const fixture = TestBed.createComponent(AdminSettingsComponent);
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector(`button[aria-label="${SETTINGS_LITERALS.removeLogo}"]`)
      .click();
    fixture.detectChanges();

    expect(brandingApi.deleteLogo).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector(`button[aria-label="${SETTINGS_LITERALS.removeLogo}"]`)).toBeFalsy();
    expect(saveBrandButton(fixture.nativeElement)?.disabled).toBeFalse();

    saveBrandButton(fixture.nativeElement)?.click();
    fixture.detectChanges();

    expect(brandingApi.updateBranding).toHaveBeenCalled();
    expect(brandingApi.deleteLogo).toHaveBeenCalled();
  });

  it('stages favicon removal until brand save', () => {
    brandingApi.getBranding.and.returnValue(
      of({ ...MOCK_BRANDING, faviconUrl: '/uploads/branding/favicon.jpg' }),
    );
    brandingApi.deleteFavicon.and.returnValue(of({ ...MOCK_BRANDING, faviconUrl: null }));
    brandingApi.updateBranding.and.returnValue(of({ ...MOCK_BRANDING, faviconUrl: null }));
    const fixture = TestBed.createComponent(AdminSettingsComponent);
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector(`button[aria-label="${SETTINGS_LITERALS.removeFavicon}"]`)
      .click();
    fixture.detectChanges();

    expect(brandingApi.deleteFavicon).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector(`button[aria-label="${SETTINGS_LITERALS.removeFavicon}"]`)).toBeFalsy();

    saveBrandButton(fixture.nativeElement)?.click();
    fixture.detectChanges();

    expect(brandingApi.deleteFavicon).toHaveBeenCalled();
  });

  it('uploads a staged logo only when brand changes are saved', () => {
    const file = new File(['logo'], 'logo.png', { type: 'image/png' });
    brandingApi.uploadLogo.and.returnValue(of({ ...MOCK_BRANDING, logoUrl: '/uploads/branding/logo.png' }));
    const fixture = TestBed.createComponent(AdminSettingsComponent);
    fixture.detectChanges();

    pickFile(fixture.nativeElement, 'logo', file);
    fixture.detectChanges();

    expect(brandingApi.uploadLogo).not.toHaveBeenCalled();
    expect(saveBrandButton(fixture.nativeElement)?.disabled).toBeFalse();

    saveBrandButton(fixture.nativeElement)?.click();
    fixture.detectChanges();

    expect(brandingApi.updateBranding).toHaveBeenCalled();
    expect(brandingApi.uploadLogo).toHaveBeenCalledWith(file);
  });

  it('stages and saves a night logo', () => {
    const file = new File(['logo-dark'], 'logo-dark.png', { type: 'image/png' });
    brandingApi.uploadLogoDark.and.returnValue(
      of({ ...MOCK_BRANDING, logoDarkUrl: '/uploads/branding/logo-dark.png' }),
    );
    const fixture = TestBed.createComponent(AdminSettingsComponent);
    fixture.detectChanges();

    pickFile(fixture.nativeElement, 'logoDark', file);
    fixture.detectChanges();

    expect(brandingApi.uploadLogoDark).not.toHaveBeenCalled();
    expect(saveBrandButton(fixture.nativeElement)?.disabled).toBeFalse();

    saveBrandButton(fixture.nativeElement)?.click();
    fixture.detectChanges();

    expect(brandingApi.uploadLogoDark).toHaveBeenCalledWith(file);
  });

  it('stages night logo removal until brand save', () => {
    brandingApi.getBranding.and.returnValue(
      of({ ...MOCK_BRANDING, logoDarkUrl: '/uploads/branding/logo-dark.png' }),
    );
    brandingApi.deleteLogoDark.and.returnValue(of({ ...MOCK_BRANDING, logoDarkUrl: null }));
    const fixture = TestBed.createComponent(AdminSettingsComponent);
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector(`button[aria-label="${SETTINGS_LITERALS.removeLogoDark}"]`)
      .click();
    fixture.detectChanges();

    expect(brandingApi.deleteLogoDark).not.toHaveBeenCalled();
    expect(
      fixture.nativeElement.querySelector(`button[aria-label="${SETTINGS_LITERALS.removeLogoDark}"]`),
    ).toBeFalsy();
    expect(saveBrandButton(fixture.nativeElement)?.disabled).toBeFalse();

    saveBrandButton(fixture.nativeElement)?.click();
    fixture.detectChanges();

    expect(brandingApi.deleteLogoDark).toHaveBeenCalled();
  });

  it('saves typography from the typography section', () => {
    brandingApi.updateTypography.and.returnValue(
      of({ ...MOCK_BRANDING, headingFont: 'playfair', bodyFont: 'manrope' }),
    );
    const fixture = TestBed.createComponent(AdminSettingsComponent);
    fixture.detectChanges();

    expect(typographySaveButton(fixture.nativeElement)?.disabled).toBeTrue();

    fixture.componentInstance.onHeadingFontChange('playfair');
    fixture.componentInstance.onBodyFontChange('manrope');
    fixture.detectChanges();

    expect(typographySaveButton(fixture.nativeElement)?.disabled).toBeFalse();
    typographySaveButton(fixture.nativeElement)?.click();
    fixture.detectChanges();

    expect(brandingApi.updateTypography).toHaveBeenCalledWith({
      headingFont: 'playfair',
      bodyFont: 'manrope',
    });
  });

  it('saves brand colors from the brand save bar', () => {
    brandingApi.updateBranding.and.returnValue(of({ ...MOCK_BRANDING, primaryHex: '#111111' }));
    const fixture = TestBed.createComponent(AdminSettingsComponent);
    fixture.detectChanges();

    const hex = fixture.nativeElement.querySelector(
      `input.settings-color__hex[aria-label="${SETTINGS_LITERALS.primaryColor}"]`,
    ) as HTMLInputElement;
    hex.value = '#111111';
    hex.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const saveBrand = saveBrandButton(fixture.nativeElement);
    expect(saveBrand?.disabled).toBeFalse();
    saveBrand?.click();
    fixture.detectChanges();

    expect(brandingApi.updateBranding).toHaveBeenCalled();
    expect(brandingApi.updateBranding.calls.mostRecent().args[0].primaryHex).toBe('#111111');
  });

  it('asks for confirmation when leaving with unsaved brand changes', () => {
    const fixture = TestBed.createComponent(AdminSettingsComponent);
    fixture.detectChanges();
    const confirm = TestBed.inject(BonaConfirm) as jasmine.SpyObj<BonaConfirm>;

    expect(fixture.componentInstance.confirmLeaveIfDirty()).toBeTrue();

    const hex = fixture.nativeElement.querySelector(
      `input.settings-color__hex[aria-label="${SETTINGS_LITERALS.primaryColor}"]`,
    ) as HTMLInputElement;
    hex.value = '#111111';
    hex.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.componentInstance.confirmLeaveIfDirty();
    expect(confirm.open).toHaveBeenCalledWith(
      jasmine.objectContaining({
        title: SETTINGS_LITERALS.confirmLeaveTitle,
        message: SETTINGS_LITERALS.confirmLeaveMessage,
      }),
    );
  });

  it('toasts load errors instead of a page banner', () => {
    calendarApi.getBookingSettings.and.returnValue(throwError(() => new Error('fail')));
    const fixture = TestBed.createComponent(AdminSettingsComponent);
    fixture.detectChanges();

    const toast = TestBed.inject(BonaToast) as jasmine.SpyObj<BonaToast>;
    expect(toast.error).toHaveBeenCalledWith(SETTINGS_LITERALS.errorLoad);
    expect(fixture.nativeElement.textContent).not.toContain(SETTINGS_LITERALS.errorLoad);
  });

  it('toasts required booking fields instead of a page banner', () => {
    const fixture = TestBed.createComponent(AdminSettingsComponent);
    fixture.detectChanges();

    const toast = TestBed.inject(BonaToast) as jasmine.SpyObj<BonaToast>;
    fixture.componentInstance.onSaveBooking({ nextDayCutoffTime: '', defaultLocation: '' });
    fixture.detectChanges();

    expect(toast.error).toHaveBeenCalledWith(SETTINGS_LITERALS.errorRequired);
    expect(fixture.nativeElement.textContent).not.toContain(SETTINGS_LITERALS.errorRequired);
  });

  it('saves booking settings without touching trainer capacity', () => {
    calendarApi.updateBookingSettings.and.returnValue(of(MOCK_BOOKING_SETTINGS));
    const fixture = TestBed.createComponent(AdminSettingsComponent);
    fixture.detectChanges();

    fixture.componentInstance.onSaveBooking({
      nextDayCutoffTime: MOCK_BOOKING_SETTINGS.nextDayCutoffTime,
      defaultLocation: MOCK_BOOKING_SETTINGS.defaultLocation,
    });
    fixture.detectChanges();

    expect(calendarApi.updateBookingSettings).toHaveBeenCalledWith({
      nextDayCutoffTime: MOCK_BOOKING_SETTINGS.nextDayCutoffTime,
      defaultLocation: MOCK_BOOKING_SETTINGS.defaultLocation,
    });
    expect(calendarApi.updateTrainer).not.toHaveBeenCalled();
  });
});

function saveBrandButton(root: HTMLElement): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll('app-bona-button button') as NodeListOf<HTMLButtonElement>).find((button) =>
    button.textContent?.includes(SETTINGS_LITERALS.saveBrand),
  );
}

function typographySaveButton(root: HTMLElement): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll('app-bona-button button') as NodeListOf<HTMLButtonElement>).find(
    (button) => button.textContent?.includes(SETTINGS_LITERALS.saveTypography),
  );
}

function pickFile(root: HTMLElement, kind: 'logo' | 'logoDark' | 'favicon', file: File): void {
  const selector =
    kind === 'favicon'
      ? '.settings-asset__tile--favicon'
      : kind === 'logoDark'
        ? '.settings-asset__tile--logo-dark'
        : '.settings-asset__tile--logo:not(.settings-asset__tile--logo-dark)';
  const tile = root.querySelector(selector)?.parentElement;
  const input = tile?.querySelector('input[type="file"]') as HTMLInputElement;
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
  input.dispatchEvent(new Event('change'));
}
