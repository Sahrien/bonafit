import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { MOCK_FORM_ASSIGNMENTS, MOCK_FORMS } from '../../core/mock-data';
import { FormsApiService } from '../../services/forms-api.service';
import { FormsComponent } from './forms.component';
import { FORMS_LITERALS } from './forms.literals';

@Component({
  selector: 'app-form-ficha-stub',
  standalone: true,
  template: 'ficha',
})
class FormFichaStubComponent {}

describe('FormsComponent', () => {
  let formsApi: jasmine.SpyObj<FormsApiService>;
  let router: Router;

  beforeEach(async () => {
    formsApi = jasmine.createSpyObj('FormsApiService', ['getForms', 'getAssignments', 'deleteForm']);
    formsApi.getForms.and.returnValue(of(MOCK_FORMS));
    formsApi.getAssignments.and.returnValue(of(MOCK_FORM_ASSIGNMENTS));
    formsApi.deleteForm.and.returnValue(of(void 0));

    await TestBed.configureTestingModule({
      imports: [FormsComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([
          { path: 'admin/forms', component: FormsComponent },
          { path: 'admin/forms/:id', component: FormFichaStubComponent },
        ]),
        { provide: FormsApiService, useValue: formsApi },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  it('loads forms and renders columns from literals', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/forms', FormsComponent);

    expect(formsApi.getForms).toHaveBeenCalled();
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(FORMS_LITERALS.title);
    expect(text).toContain(FORMS_LITERALS.formTitle);
    expect(text).toContain(FORMS_LITERALS.questionCount);
    expect(text).toContain(FORMS_LITERALS.assignmentCount);
    expect(text).toContain('Cuestionario inicial');
    expect(harness.routeNativeElement?.querySelector('app-bona-grid')).toBeTruthy();
  });

  it('opens the ficha from the edit action', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/forms', FormsComponent);

    const buttons = Array.from(
      harness.routeNativeElement?.querySelectorAll('button') ?? [],
    ) as HTMLButtonElement[];
    const edit = buttons.find((button) => button.textContent?.includes(FORMS_LITERALS.edit));
    expect(edit).toBeTruthy();
    edit?.click();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/admin/forms/form-1');
  });
});
