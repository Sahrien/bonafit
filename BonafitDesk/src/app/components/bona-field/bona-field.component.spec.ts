import { provideDeskTranslate } from '../../core/i18n/provide-desk-translate';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { BonaFieldComponent } from './bona-field.component';
import { BonaFieldDefinition } from './bona-field.definition';

describe('BonaFieldComponent', () => {
  let fixture: ComponentFixture<BonaFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BonaFieldComponent],
      providers: [provideNoopAnimations(), provideDeskTranslate()],
    }).compileComponents();
  });

  it('should create', () => {
    fixture = createField({ key: 'nombre', label: 'Nombre' });
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders a text input from the field definition', () => {
    fixture = createField({ key: 'nombre', label: 'Nombre', placeholder: 'Tu nombre' }, 'Ana');

    expect(fixture.nativeElement.textContent).toContain('Nombre');
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('Ana');
    expect(input.placeholder).toBe('Tu nombre');
  });

  it('emits valueChange from a text field', () => {
    fixture = createField({ key: 'nombre', label: 'Nombre' });
    const spy = jasmine.createSpy('valueChange');
    fixture.componentInstance.valueChange.subscribe(spy);

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'Luis';
    input.dispatchEvent(new Event('input'));

    expect(spy).toHaveBeenCalledWith('Luis');
  });

  it('renders a textarea when type is textarea', () => {
    fixture = createField({ key: 'notas', label: 'Notas', type: 'textarea' }, 'Hola');

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    expect(textarea.value).toBe('Hola');
  });

  it('caps text fields and leaves textarea full width', () => {
    fixture = createField({ key: 'nombre', label: 'Nombre' });
    expect(fixture.nativeElement.classList.contains('bona-field--capped')).toBeTrue();

    fixture = createField({ key: 'notas', label: 'Notas', type: 'textarea' });
    expect(fixture.nativeElement.classList.contains('bona-field--capped')).toBeFalse();
  });

  it('renders select options from the field definition', () => {
    fixture = createField({
      key: 'trainerId',
      label: 'Entrenador',
      type: 'select',
      options: [
        { value: 'a', label: 'Entrenador A' },
        { value: 'b', label: 'Entrenador B' },
      ],
    });

    expect(fixture.nativeElement.querySelector('mat-select')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Entrenador');
  });

  it('emits the option id from a radio group', () => {
    fixture = createField({
      key: 'choice',
      label: 'Elige',
      type: 'radio',
      options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ],
    });
    const spy = jasmine.createSpy('valueChange');
    fixture.componentInstance.valueChange.subscribe(spy);

    const radios = fixture.nativeElement.querySelectorAll('mat-radio-button') as NodeListOf<HTMLElement>;
    expect(radios.length).toBe(2);
    radios[1].querySelector('input')?.click();
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith('b');
  });

  it('emits comma-separated ids from a checkbox group', () => {
    fixture = createField({
      key: 'goals',
      label: 'Objetivos',
      type: 'checkbox-group',
      options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ],
    });
    const spy = jasmine.createSpy('valueChange');
    fixture.componentInstance.valueChange.subscribe(spy);

    const boxes = fixture.nativeElement.querySelectorAll(
      'input[type="checkbox"]',
    ) as NodeListOf<HTMLInputElement>;
    expect(boxes.length).toBe(2);
    boxes[0].click();
    fixture.detectChanges();
    expect(spy.calls.mostRecent().args[0]).toBe('a');

    fixture.componentRef.setInput('value', 'a');
    fixture.detectChanges();
    boxes[1].click();
    fixture.detectChanges();

    expect(spy.calls.mostRecent().args[0]).toBe('a,b');
  });

  function createField(
    definition: BonaFieldDefinition,
    value = '',
  ): ComponentFixture<BonaFieldComponent> {
    const created = TestBed.createComponent(BonaFieldComponent);
    created.componentRef.setInput('definition', definition);
    created.componentRef.setInput('value', value);
    created.detectChanges();
    return created;
  }
});
