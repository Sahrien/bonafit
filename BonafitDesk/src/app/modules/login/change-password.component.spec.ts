import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AUTH_PATHS } from '../../core/auth/auth.paths';
import { CHANGE_PASSWORD_LITERALS } from '../../i18n/es';
import { AuthApiService } from '../../services/auth-api.service';
import { MOCK_ACCOUNTS, createMockSession } from '../../testing/fixtures';
import { ChangePasswordComponent } from './change-password.component';

describe('ChangePasswordComponent', () => {
  let fixture: ComponentFixture<ChangePasswordComponent>;
  let auth: jasmine.SpyObj<AuthApiService>;
  let router: Router;

  beforeEach(async () => {
    auth = jasmine.createSpyObj('AuthApiService', ['changePassword', 'getSession']);
    await TestBed.configureTestingModule({
      imports: [ChangePasswordComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: AuthApiService, useValue: auth },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl');
    fixture = TestBed.createComponent(ChangePasswordComponent);
    fixture.detectChanges();
  });

  it('saves a new password without the temporary one and goes home', () => {
    const session = createMockSession(MOCK_ACCOUNTS[0]);
    auth.changePassword.and.returnValue(of(undefined));
    auth.getSession.and.returnValue(of(session));

    fixture.componentInstance.onSubmit({ newPassword: 'new-pass1' });

    expect(auth.changePassword).toHaveBeenCalledWith({ newPassword: 'new-pass1' });
    expect(router.navigateByUrl).toHaveBeenCalledWith(AUTH_PATHS.adminHome);
  });

  it('shows an error when the new password is too short', () => {
    fixture.componentInstance.onSubmit({ newPassword: 'short' });
    fixture.detectChanges();
    expect(auth.changePassword).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(CHANGE_PASSWORD_LITERALS.errorNewPassword);
  });

  it('shows an error when the save fails', () => {
    auth.changePassword.and.returnValue(throwError(() => new Error('unauthorized')));
    fixture.componentInstance.onSubmit({ newPassword: 'new-pass1' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(CHANGE_PASSWORD_LITERALS.errorSave);
  });
});
