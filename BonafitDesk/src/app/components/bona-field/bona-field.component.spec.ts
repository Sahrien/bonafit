import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { BonaFieldComponent } from './bona-field.component';
import { BonaFieldDefinition } from './bona-field.definition';

describe('BonaFieldComponent', () => {
  let fixture: ComponentFixture<BonaFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BonaFieldComponent],
      providers: [provideNoopAnimations()],
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
