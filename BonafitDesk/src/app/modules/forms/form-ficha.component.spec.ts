import { provideHttpClient } from '@angular/common/http';
import { provideDeskTranslate } from '../../core/i18n/provide-desk-translate';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { MOCK_CLIENTS, MOCK_FORM_ASSIGNMENTS, MOCK_FORMS } from '../../testing/fixtures';
import { provideBonaFeedbackTesting } from '../../testing/bona-feedback';
import { clickGridMenuAction } from '../../testing/grid-menu';
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
        provideHttpClient(), provideDeskTranslate(),
        provideRouter([{ path: 'admin/forms/:id', component: FormFichaComponent }]),
        { provide: FormsApiService, useValue: formsApi },
        { provide: ClientsApiService, useValue: clientsApi },
        ...provideBonaFeedbackTesting().providers,
      ],
    }).compileComponents();
  });

  it('loads the template and exposes assignment and response tabs', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/forms/form-1', FormFichaComponent);

    expect(formsApi.getForm).toHaveBeenCalledWith('form-1');
    expect(formsApi.getAssignments).toHaveBeenCalledWith('form-1');
    expect(clientsApi.getClients).toHaveBeenCalled();

    let text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(FORMS_LITERALS.fichaTitle);
    expect(text).toContain(FORMS_LITERALS.templateSection);
    const pageActions = harness.routeNativeElement?.querySelector('.bona-page__actions');
    const saveBar = harness.routeNativeElement?.querySelector('.page-section__save');
    expect(pageActions?.textContent).toContain(FORMS_LITERALS.preview);
    expect(pageActions?.textContent).not.toContain(FORMS_LITERALS.close);
    expect(pageActions?.textContent).not.toContain(FORMS_LITERALS.save);
    expect(saveBar?.textContent).toContain(FORMS_LITERALS.close);
    expect(saveBar?.textContent).toContain(FORMS_LITERALS.save);
    expect(text).toContain(FORMS_LITERALS.tabAssign);
    expect(text).toContain(FORMS_LITERALS.tabResponses);

    const inputs = Array.from(
      harness.routeNativeElement?.querySelectorAll('input') ?? [],
    ) as HTMLInputElement[];
    expect(inputs.some((input) => input.value === 'Cuestionario inicial')).toBeTrue();

    const assignTab = Array.from(
      harness.routeNativeElement?.querySelectorAll('button') ?? [],
    ).find((button) => button.textContent?.includes(FORMS_LITERALS.tabAssign)) as
      | HTMLButtonElement
      | undefined;
    assignTab?.click();
    harness.fixture.detectChanges();
    text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(FORMS_LITERALS.assignSection);
    expect(text).toContain('Marina Lopez');
  });

  it('shows completed answers when opening a response', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/forms/form-1', FormFichaComponent);

    const responsesTab = Array.from(
      harness.routeNativeElement?.querySelectorAll('button') ?? [],
    ).find((button) => button.textContent?.includes(FORMS_LITERALS.tabResponses)) as
      | HTMLButtonElement
      | undefined;
    responsesTab?.click();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    clickGridMenuAction(harness.routeNativeElement, FORMS_LITERALS.view, { rowIndex: 1 });
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(FORMS_LITERALS.answersTitle);
    expect(text).toContain('Salud');
    expect(text).toContain('Molestia de rodilla');
  });

  it('hides assignment tabs when creating a form', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/forms/new', FormFichaComponent);

    expect(formsApi.getForm).not.toHaveBeenCalled();
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(FORMS_LITERALS.fichaNewTitle);
    expect(text).toContain(FORMS_LITERALS.templateSection);
    expect(text).not.toContain(FORMS_LITERALS.tabAssign);
    expect(text).not.toContain(FORMS_LITERALS.tabResponses);
  });

  it('opens a client preview from an unsaved draft without calling APIs', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/admin/forms/new', FormFichaComponent);

    component.onTitleChange('Borrador');
    component.onAddQuestion();
    const question = component.questions()[0];
    expect(question.required).toBeTrue();
    component.onPromptChange(question.id, '¿Cómo te llamas?');
    harness.fixture.detectChanges();

    const preview = Array.from(
      harness.routeNativeElement?.querySelectorAll('button') ?? [],
    ).find((button) => button.textContent?.includes(FORMS_LITERALS.preview)) as
      | HTMLButtonElement
      | undefined;
    expect(preview).toBeTruthy();
    preview?.click();
    harness.fixture.detectChanges();

    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(FORMS_LITERALS.previewBanner);
    expect(text).toContain('¿Cómo te llamas?');
    expect(harness.routeNativeElement?.querySelector('app-form-fill-view')).toBeTruthy();
    expect(formsApi.createForm).not.toHaveBeenCalled();
    expect(formsApi.assignForm).not.toHaveBeenCalled();
  });

  it('adds a collapsed heading section to the template', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/admin/forms/new', FormFichaComponent);

    component.onAddHeading();
    harness.fixture.detectChanges();

    expect(component.questions()[0].type).toBe('heading');
    expect(component.questions()[0].required).toBeFalse();
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(FORMS_LITERALS.templateHint);
    expect(text).toContain(FORMS_LITERALS.sectionKind);
    expect(text).toContain(FORMS_LITERALS.addHeading);
  });
});
