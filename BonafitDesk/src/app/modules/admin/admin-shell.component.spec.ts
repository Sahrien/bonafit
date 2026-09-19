import { provideDeskTranslate } from '../../core/i18n/provide-desk-translate';
import { provideHttpClient } from '@angular/common/http';
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
        provideDeskTranslate(),
        provideHttpClient(),
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
    expect(text).toContain(ADMIN_LITERALS.schedules);
    expect(text).toContain(ADMIN_LITERALS.clients);
    expect(text).toContain(ADMIN_LITERALS.forms);
    expect(text).toContain(ADMIN_LITERALS.stats);
    expect(text).toContain(ADMIN_LITERALS.accounting);
    expect(router.url).toBe('/admin/calendar');
  });

  it('keeps schedules in the nav and out of the profile menu', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/calendar');

    const nav = document.querySelector('.bona-shell-app__nav') as HTMLElement;
    expect(nav.textContent).toContain(ADMIN_LITERALS.schedules);

    const trigger = document.querySelector('.bona-shell-app__profile-trigger') as HTMLButtonElement;
    trigger.click();
    harness.fixture.detectChanges();

    const labels = Array.from(document.querySelectorAll('a[mat-menu-item]')).map((item) =>
      item.textContent?.trim(),
    );
    expect(labels).toContain(ADMIN_LITERALS.settings);
    expect(labels).not.toContain(ADMIN_LITERALS.schedules);
    expect(labels).not.toContain(ADMIN_LITERALS.stats);
  });

  it('places statistics after forms in the main nav', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/calendar');

    const nav = document.querySelector('.bona-shell-app__nav') as HTMLElement;
    const labels = Array.from(nav.querySelectorAll('a')).map((item) => item.textContent?.trim());
    const forms = labels.indexOf(ADMIN_LITERALS.forms);
    expect(forms).toBeGreaterThan(-1);
    expect(labels[forms + 1]).toBe(ADMIN_LITERALS.stats);
    expect(labels[forms + 2]).toBe(ADMIN_LITERALS.accounting);
  });
});
