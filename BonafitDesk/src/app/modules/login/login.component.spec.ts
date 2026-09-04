import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MockStore } from '../../core/mock-store.service';
import { AuthApiService } from '../../services/auth-api.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let auth: AuthApiService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideNoopAnimations(), provideRouter([])],
    }).compileComponents();

    TestBed.inject(MockStore).reset();
    auth = TestBed.inject(AuthApiService);
    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('sets the session when an account is selected', async () => {
    expect(await firstValueFrom(auth.getSession())).toBeNull();

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    );
    const trainer = buttons.find((button) => button.textContent?.includes('Alex Martin'));
    expect(trainer).toBeTruthy();
    trainer?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const session = await firstValueFrom(auth.getSession());
    expect(session?.user.id).toBe('user-trainer-1');
    expect(session?.user.role).toBe('admin');
  });
});
