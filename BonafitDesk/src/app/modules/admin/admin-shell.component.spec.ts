import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { AuthApiService } from '../../services/auth-api.service';
import { MOCK_ACCOUNTS, createMockSession } from '../../testing/fixtures';
import { AdminShellComponent } from './admin-shell.component';
import { ADMIN_LITERALS } from '../../i18n/es';

@Component({
  selector: 'app-calendar-stub',
  standalone: true,
  template: 'calendar-stub',
})
class CalendarStubComponent {}

describe('AdminShellComponent', () => {
  let router: Router;

  beforeEach(async () => {
    const auth = jasmine.createSpyObj('AuthApiService', ['getSession', 'logout']);
    auth.getSession.and.returnValue(of(createMockSession(MOCK_ACCOUNTS[0])));
    auth.logout.and.returnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [AdminShellComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([
          {
            path: 'admin',
            component: AdminShellComponent,
            children: [{ path: 'calendar', component: CalendarStubComponent }],
          },
        ]),
        { provide: AuthApiService, useValue: auth },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  it('shows persistent nav and the logged user', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/calendar');

    const text = document.querySelector('app-admin-shell')?.textContent ?? '';
    expect(text).toContain('Alex Martin');
    expect(text).toContain(ADMIN_LITERALS.calendar);
    expect(text).toContain(ADMIN_LITERALS.clients);
    expect(router.url).toBe('/admin/calendar');
  });
});
