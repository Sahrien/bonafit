import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AUTH_PATHS } from '../../core/auth/auth.paths';
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
        provideRouter([]),
        { provide: AuthApiService, useValue: auth },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl');
    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
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
});
