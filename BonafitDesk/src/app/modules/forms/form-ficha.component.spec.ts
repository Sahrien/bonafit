import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { MOCK_CLIENTS, MOCK_FORM_ASSIGNMENTS, MOCK_FORMS } from '../../core/mock-data';
import { ClientsApiService } from '../../services/clients-api.service';
import { FormsApiService } from '../../services/forms-api.service';
import { FormFichaComponent } from './form-ficha.component';
import { FORMS_LITERALS } from './forms.literals';

describe('FormFichaComponent', () => {
  let formsApi: jasmine.SpyObj<FormsApiService>;
  let clientsApi: jasmine.SpyObj<ClientsApiService>;

  beforeEach(async () => {
    formsApi = jasmine.createSpyObj('FormsApiService', [
      'getForm',
      'createForm',
      'updateForm',
      'deleteForm',
      'getAssignments',
      'assignForm',
    ]);
    clientsApi = jasmine.createSpyObj('ClientsApiService', ['getClients']);
    formsApi.getForm.and.callFake((id: string) =>
      of(MOCK_FORMS.find((form) => form.id === id) ?? MOCK_FORMS[0]),
    );
    formsApi.getAssignments.and.returnValue(of(MOCK_FORM_ASSIGNMENTS));
    formsApi.updateForm.and.returnValue(of(MOCK_FORMS[0]));
    clientsApi.getClients.and.returnValue(of(MOCK_CLIENTS));

    await TestBed.configureTestingModule({
      imports: [FormFichaComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([{ path: 'admin/forms/:id', component: FormFichaComponent }]),
        { provide: FormsApiService, useValue: formsApi },
        { provide: ClientsApiService, useValue: clientsApi },
      ],
    }).compileComponents();
  });

  it('loads the template, clients to assign, and responses', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/forms/form-1', FormFichaComponent);

    expect(formsApi.getForm).toHaveBeenCalledWith('form-1');
    expect(formsApi.getAssignments).toHaveBeenCalledWith('form-1');
    expect(clientsApi.getClients).toHaveBeenCalled();

    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(FORMS_LITERALS.fichaTitle);
    expect(text).toContain(FORMS_LITERALS.templateSection);
    expect(text).toContain(FORMS_LITERALS.assignSection);
    expect(text).toContain(FORMS_LITERALS.responsesSection);
    expect(text).toContain('Marina Lopez');
    expect(text).toContain(FORMS_LITERALS.statusPending);
    expect(text).toContain(FORMS_LITERALS.statusCompleted);

    const inputs = Array.from(
      harness.routeNativeElement?.querySelectorAll('input') ?? [],
    ) as HTMLInputElement[];
    expect(inputs.some((input) => input.value === 'Cuestionario inicial')).toBeTrue();
  });

  it('shows completed answers when opening a response', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/forms/form-1', FormFichaComponent);

    const buttons = Array.from(
      harness.routeNativeElement?.querySelectorAll('button') ?? [],
    ) as HTMLButtonElement[];
    const views = buttons.filter((button) => button.textContent?.includes(FORMS_LITERALS.view));
    expect(views.length).toBeGreaterThan(1);
    views[1]?.click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(FORMS_LITERALS.answersTitle);
    expect(text).toContain('Molestia de rodilla');
  });
});
