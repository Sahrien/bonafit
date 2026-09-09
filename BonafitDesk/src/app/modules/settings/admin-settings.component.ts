import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BonaFieldDefinition } from '../../components/bona-field/bona-field.definition';
import { BonaFormComponent, BonaFormValue } from '../../components/bona-form/bona-form.component';
import { BonaPageComponent } from '../../components/bona-page/bona-page.component';
import { BonaToast } from '../../components/bona-toast/bona-toast.service';
import { injectAuthSession } from '../../core/auth/inject-auth-session';
import { CalendarApiService } from '../../services/calendar-api.service';
import { PasswordChangeFormComponent } from './password-change-form.component';
import { SETTINGS_LITERALS } from './settings.literals';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [BonaPageComponent, BonaFormComponent, PasswordChangeFormComponent],
  templateUrl: './admin-settings.component.html',
  styleUrl: './admin-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSettingsComponent {
  private readonly calendarApi = inject(CalendarApiService);
  private readonly toast = inject(BonaToast);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authSession = injectAuthSession();

  readonly literals = SETTINGS_LITERALS;
  readonly loading = signal(true);
  readonly error = signal('');
  readonly userName = this.authSession.userName;
  readonly userEmail = this.authSession.userEmail;
  readonly bookingForm = signal<BonaFormValue>({
    nextDayCutoffTime: '18:00',
    defaultLocation: '',
  });

  readonly bookingFields: BonaFieldDefinition[] = [
    { key: 'nextDayCutoffTime', label: SETTINGS_LITERALS.cutoffTime, type: 'time', required: true },
    { key: 'defaultLocation', label: SETTINGS_LITERALS.defaultLocation, type: 'text', required: true },
  ];

  constructor() {
    this.calendarApi
      .getBookingSettings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (settings) => {
          this.bookingForm.set({
            nextDayCutoffTime: settings.nextDayCutoffTime,
            defaultLocation: settings.defaultLocation,
          });
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

  onPasswordSaved(): void {
    this.toast.success(this.literals.passwordSaved);
  }
}
