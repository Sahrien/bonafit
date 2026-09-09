import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MOCK_BOOKING_SETTINGS, MOCK_ACCOUNTS, createMockSession } from '../../testing/fixtures';
import { provideBonaFeedbackTesting } from '../../testing/bona-feedback';
import { AuthApiService } from '../../services/auth-api.service';
import { CalendarApiService } from '../../services/calendar-api.service';
import { AdminSettingsComponent } from './admin-settings.component';
import { SETTINGS_LITERALS } from './settings.literals';

describe('AdminSettingsComponent', () => {
  let calendarApi: jasmine.SpyObj<CalendarApiService>;
  let authApi: jasmine.SpyObj<AuthApiService>;

  beforeEach(async () => {
    calendarApi = jasmine.createSpyObj('CalendarApiService', [
      'getBookingSettings',
      'updateBookingSettings',
    ]);
    authApi = jasmine.createSpyObj('AuthApiService', ['getSession', 'changePassword']);
    calendarApi.getBookingSettings.and.returnValue(of(MOCK_BOOKING_SETTINGS));
    authApi.getSession.and.returnValue(of(createMockSession(MOCK_ACCOUNTS[0])));

    await TestBed.configureTestingModule({
      imports: [AdminSettingsComponent],
      providers: [
        provideNoopAnimations(),
        { provide: CalendarApiService, useValue: calendarApi },
        { provide: AuthApiService, useValue: authApi },
        ...provideBonaFeedbackTesting().providers,
      ],
    }).compileComponents();
  });

  it('loads booking settings', () => {
    const fixture = TestBed.createComponent(AdminSettingsComponent);
    fixture.detectChanges();

    expect(calendarApi.getBookingSettings).toHaveBeenCalled();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain(SETTINGS_LITERALS.title);
    expect(text).toContain(SETTINGS_LITERALS.bookingTitle);
    expect(text).toContain(SETTINGS_LITERALS.passwordTitle);
  });
});
