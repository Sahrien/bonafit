import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { firstValueFrom } from 'rxjs';
import { MockStore } from '../../core/mock-store.service';
import { AuthApiService } from '../../services/auth-api.service';
import { AdminBarShellComponent } from './admin-bar-shell.component';

@Component({
  selector: 'app-admin-home-stub',
  standalone: true,
  template: 'admin-home',
})
class AdminHomeStubComponent {}

@Component({
  selector: 'app-calendar-stub',
  standalone: true,
  template: 'calendar-stub',
})
class CalendarStubComponent {}

describe('AdminBarShellComponent', () => {
  let router: Router;
  let auth: AuthApiService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminBarShellComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([
          {
            path: 'admin',
            children: [
              { path: '', pathMatch: 'full', component: AdminHomeStubComponent },
              {
                path: '',
                component: AdminBarShellComponent,
                children: [{ path: 'calendar', component: CalendarStubComponent }],
              },
            ],
          },
        ]),
      ],
    }).compileComponents();

    TestBed.inject(MockStore).reset();
    auth = TestBed.inject(AuthApiService);
    router = TestBed.inject(Router);
    await firstValueFrom(auth.login('user-trainer-1'));
  });

  it('shows the logged user and navigates back to /admin', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/calendar');

    const shell = document.querySelector('app-admin-bar-shell');
    expect(shell?.textContent).toContain('Alex Martin');

    const back = document.querySelector(
      '.bona-shell-admin__bar button',
    ) as HTMLButtonElement | null;
    expect(back).toBeTruthy();
    expect(back?.textContent).toContain('Volver al menú');

    const navigate = spyOn(router, 'navigateByUrl').and.callThrough();
    back?.click();

    expect(navigate).toHaveBeenCalledWith('/admin');
  });
});
