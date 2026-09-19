import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AUTH_PATHS } from '../../core/auth/auth.paths';
import { LanguageService } from '../../core/i18n/language.service';
import { provideDeskTranslate } from '../../core/i18n/provide-desk-translate';
import { LOGIN_LITERALS } from '../../i18n/es';
import { AuthApiService } from '../../services/auth-api.service';
import { MOCK_ACCOUNTS, createMockSession } from '../../testing/fixtures';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let auth: jasmine.SpyObj<AuthApiService>;
  let router: Router;

  beforeEach(async () => {
    auth = jasmine.createSpyObj('AuthApiService', ['login']);
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideDeskTranslate(),
        provideRouter([]),
        { provide: AuthApiService, useValue: auth },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl');
    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  });

  it('submits email and password typed in the fields', () => {
    const session = createMockSession(MOCK_ACCOUNTS[0]);
    auth.login.and.returnValue(of(session));

    const email = fixture.nativeElement.querySelector('[data-field-key="email"]') as HTMLInputElement;
    const password = fixture.nativeElement.querySelector('[data-field-key="password"]') as HTMLInputElement;
    email.value = 'lucia@bonafit.com';
    password.value = 'ChangeMe123!';

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(auth.login).toHaveBeenCalledWith({
      email: 'lucia@bonafit.com',
      password: 'ChangeMe123!',
    });
  });

  it('logs in with email and password and goes to the admin home', () => {
    const session = createMockSession(MOCK_ACCOUNTS[0]);
    auth.login.and.returnValue(of(session));

    fixture.componentInstance.onSubmit({
      email: 'lucia@bonafit.com',
      password: 'ChangeMe123!',
    });
    fixture.detectChanges();

    expect(auth.login).toHaveBeenCalledWith({
      email: 'lucia@bonafit.com',
      password: 'ChangeMe123!',
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith(AUTH_PATHS.adminHome);
  });

  it('does not revert the language chosen on the login screen', () => {
    const language = TestBed.inject(LanguageService);
    language.setLanguage('en', false);
    const session = createMockSession({ ...MOCK_ACCOUNTS[0], language: 'es' });
    auth.login.and.returnValue(of(session));

    fixture.componentInstance.onSubmit({
      email: 'lucia@bonafit.com',
      password: 'ChangeMe123!',
    });
    fixture.detectChanges();

    expect(language.language()).toBe('en');
  });

  it('sends users who must change password to that screen', () => {
    const session = createMockSession({ ...MOCK_ACCOUNTS[2], mustChangePassword: true });
    auth.login.and.returnValue(of(session));

    fixture.componentInstance.onSubmit({
      email: 'marina.lopez@example.com',
      password: 'temp-pass',
    });

    expect(router.navigateByUrl).toHaveBeenCalledWith(AUTH_PATHS.changePassword);
  });

  it('shows an error on invalid credentials', () => {
    auth.login.and.returnValue(throwError(() => new Error('unauthorized')));
    fixture.componentInstance.onSubmit({
      email: 'lucia@bonafit.com',
      password: 'wrong',
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(LOGIN_LITERALS.invalidCredentials);
  });

  it('shows the brand tagline above the sign-in title', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text.indexOf(LOGIN_LITERALS.slogan)).toBeGreaterThanOrEqual(0);
    expect(text.indexOf(LOGIN_LITERALS.slogan)).toBeLessThan(text.indexOf(LOGIN_LITERALS.title));
  });
});
