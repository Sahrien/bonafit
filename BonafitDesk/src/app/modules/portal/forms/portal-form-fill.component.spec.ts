import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { MOCK_FORM_ASSIGNMENTS } from '../../../core/mock-data';
import { FormAssignmentDto } from '../../../models/form.dto';
import { FormsApiService } from '../../../services/forms-api.service';
import { PortalFormFillComponent } from './portal-form-fill.component';
import { PORTAL_FORMS_LITERALS } from './portal-forms.literals';

describe('PortalFormFillComponent', () => {
  let formsApi: jasmine.SpyObj<FormsApiService>;

  const pending = MOCK_FORM_ASSIGNMENTS[0];
  const completed: FormAssignmentDto = {
    ...MOCK_FORM_ASSIGNMENTS[1],
    clientId: 'client-1',
  };

  beforeEach(async () => {
    formsApi = jasmine.createSpyObj('FormsApiService', ['getAssignment', 'submitAssignment']);
    formsApi.getAssignment.and.returnValue(of(pending));
    formsApi.submitAssignment.and.returnValue(
      of({
        ...pending,
        status: 'completed',
        submittedAt: '2026-09-08T10:00:00.000Z',
        answers: [
          { questionId: 'q-1', value: 'no' },
          { questionId: 'q-3', value: 'opt-strength' },
        ],
      }),
    );

    await TestBed.configureTestingModule({
      imports: [PortalFormFillComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([{ path: 'app/formularios/:id', component: PortalFormFillComponent }]),
        { provide: FormsApiService, useValue: formsApi },
      ],
    }).compileComponents();
  });

  it('renders the pending assignment as a form', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/app/formularios/fa-1', PortalFormFillComponent);

    expect(formsApi.getAssignment).toHaveBeenCalledWith('fa-1');
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain('Cuestionario inicial');
    expect(text).toContain(pending.questions[0].prompt);
    expect(harness.routeNativeElement?.querySelector('app-bona-form')).toBeTruthy();
  });

  it('submits answers and then shows them read-only', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/app/formularios/fa-1', PortalFormFillComponent);

    const component = harness.routeDebugElement?.componentInstance as PortalFormFillComponent;
    component.onSubmit({
      'q-1': 'no',
      'q-2': '',
      'q-3': 'opt-strength',
    });
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();

    expect(formsApi.submitAssignment).toHaveBeenCalled();
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(PORTAL_FORMS_LITERALS.submitted);
    expect(text).toContain(PORTAL_FORMS_LITERALS.no);
    expect(harness.routeNativeElement?.querySelector('app-bona-form')).toBeFalsy();
  });

  it('shows a completed assignment as read-only', async () => {
    formsApi.getAssignment.and.returnValue(of(completed));
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/app/formularios/fa-2', PortalFormFillComponent);

    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(PORTAL_FORMS_LITERALS.alreadySubmitted);
    expect(text).toContain('Molestia de rodilla');
    expect(harness.routeNativeElement?.querySelector('app-bona-form')).toBeFalsy();
  });
});
