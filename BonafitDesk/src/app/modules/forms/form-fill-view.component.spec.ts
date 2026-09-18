import { provideDeskTranslate } from '../../core/i18n/provide-desk-translate';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MOCK_FORM_ASSIGNMENTS } from '../../testing/fixtures';
import { FormFillViewComponent, formFieldAnchorId } from './form-fill-view.component';
import { FORMS_LITERALS } from './forms.literals';

describe('FormFillViewComponent', () => {
  let fixture: ComponentFixture<FormFillViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormFillViewComponent],
      providers: [provideNoopAnimations(), provideDeskTranslate()],
    }).compileComponents();

    fixture = TestBed.createComponent(FormFillViewComponent);
    fixture.componentRef.setInput('questions', MOCK_FORM_ASSIGNMENTS[0].questions);
    fixture.componentRef.setInput('labels', {
      yes: 'Sí',
      no: 'No',
      firstName: 'Nombre',
      lastName: 'Apellidos',
      moveUp: 'Subir',
      moveDown: 'Bajar',
    });
    fixture.detectChanges();
  });

  it('does not emit submitted when required fields are empty and lists them', () => {
    const submitted = jasmine.createSpy('submitted');
    fixture.componentInstance.submitted.subscribe(submitted);

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    expect(form.hasAttribute('novalidate')).toBeTrue();
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(submitted).not.toHaveBeenCalled();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain(FORMS_LITERALS.requiredError);
    expect(text).toContain(MOCK_FORM_ASSIGNMENTS[0].questions[1].prompt);
    expect(fixture.nativeElement.querySelector(`#${formFieldAnchorId('q-1')}`)).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.form-fill-view__missing')).toBeTruthy();
  });

  it('emits submitted when required answers are present', () => {
    const submitted = jasmine.createSpy('submitted');
    fixture.componentInstance.submitted.subscribe(submitted);
    fixture.componentRef.setInput('value', { 'q-1': 'no', 'q-3': 'opt-strength' });
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(submitted).toHaveBeenCalled();
  });

  it('emits saved without requiring complete answers', () => {
    const saved = jasmine.createSpy('saved');
    fixture.componentInstance.saved.subscribe(saved);
    fixture.componentRef.setInput('saveText', 'Guardar');
    fixture.componentRef.setInput('value', { 'q-1': 'no' });
    fixture.detectChanges();

    const save = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('Guardar'));
    save?.click();
    fixture.detectChanges();

    expect(saved).toHaveBeenCalled();
  });
});
