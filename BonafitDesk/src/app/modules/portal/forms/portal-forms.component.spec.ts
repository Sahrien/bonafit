import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { MOCK_FORM_ASSIGNMENTS } from '../../../testing/fixtures';
import { AuthSessionDto } from '../../../models/auth-session.dto';
import { AuthApiService } from '../../../services/auth-api.service';
import { FormsApiService } from '../../../services/forms-api.service';
import { PortalFormsComponent } from './portal-forms.component';
import { PORTAL_FORMS_LITERALS } from './portal-forms.literals';

@Component({
  selector: 'app-portal-form-fill-stub',
  standalone: true,
  template: 'fill',
})
class PortalFormFillStubComponent {}

describe('PortalFormsComponent', () => {
  let authApi: jasmine.SpyObj<AuthApiService>;
  let formsApi: jasmine.SpyObj<FormsApiService>;
  let router: Router;

  const session: AuthSessionDto = {
    token: 't',
    user: {
      id: 'user-client-1',
      displayName: 'Marina Lopez',
      role: 'client',
      clientId: 'client-1',
    },
  };

  beforeEach(async () => {
    authApi = jasmine.createSpyObj('AuthApiService', ['getSession']);
    formsApi = jasmine.createSpyObj('FormsApiService', ['getMyAssignments']);
    authApi.getSession.and.returnValue(of(session));
    formsApi.getMyAssignments.and.returnValue(of([MOCK_FORM_ASSIGNMENTS[0]]));

    await TestBed.configureTestingModule({
      imports: [PortalFormsComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([
          { path: 'app/formularios', component: PortalFormsComponent },
          { path: 'app/formularios/:id', component: PortalFormFillStubComponent },
        ]),
        { provide: AuthApiService, useValue: authApi },
        { provide: FormsApiService, useValue: formsApi },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  it('lists the client assignments', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/app/formularios', PortalFormsComponent);

    expect(formsApi.getMyAssignments).toHaveBeenCalled();
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(PORTAL_FORMS_LITERALS.title);
    expect(text).toContain('Cuestionario inicial');
    expect(text).toContain(PORTAL_FORMS_LITERALS.statusPending);
    expect(harness.routeNativeElement?.querySelector('app-bona-grid')).toBeTruthy();
  });

  it('opens an assignment from the grid action', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/app/formularios', PortalFormsComponent);

    const buttons = Array.from(
      harness.routeNativeElement?.querySelectorAll('button') ?? [],
    ) as HTMLButtonElement[];
    const open = buttons.find((button) =>
      button.textContent?.includes(PORTAL_FORMS_LITERALS.open),
    );
    expect(open).toBeTruthy();
    open?.click();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/app/formularios/fa-1');
  });
});
