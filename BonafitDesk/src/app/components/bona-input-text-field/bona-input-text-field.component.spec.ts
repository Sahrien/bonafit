import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Component } from '@angular/core';
import { BonaInputTextFieldComponent } from './bona-input-text-field.component';

@Component({
  standalone: true,
  imports: [BonaInputTextFieldComponent, ReactiveFormsModule],
  template: `<app-bona-input-text-field [formControl]="control" label="Email" />`,
})
class InputHostComponent {
  control = new FormControl('ana@bonafit.test', { nonNullable: true });
}

describe('BonaInputTextFieldComponent', () => {
  let component: BonaInputTextFieldComponent;
  let fixture: ComponentFixture<BonaInputTextFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BonaInputTextFieldComponent, InputHostComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(BonaInputTextFieldComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('label', 'Buscar');
    fixture.componentRef.setInput('placeholder', 'Nombre');
    fixture.componentRef.setInput('value', 'Ana');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the label and current value', () => {
    expect(fixture.nativeElement.textContent).toContain('Buscar');
    expect(inputEl().value).toBe('Ana');
  });

  it('emits valueChange when the user types', () => {
    const spy = jasmine.createSpy('valueChange');
    component.valueChange.subscribe(spy);

    inputEl().value = 'Luis';
    inputEl().dispatchEvent(new Event('input'));

    expect(spy).toHaveBeenCalledWith('Luis');
  });

  it('applies the requested input type', () => {
    fixture.componentRef.setInput('type', 'email');
    fixture.detectChanges();

    expect(inputEl().getAttribute('type')).toBe('email');
  });

  it('disables the native input', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    expect(inputEl().disabled).toBeTrue();
  });

  it('implements ControlValueAccessor writeValue and onChange', () => {
    const onChange = jasmine.createSpy('onChange');
    component.registerOnChange(onChange);
    component.writeValue('nuevo');
    fixture.detectChanges();

    expect(inputEl().value).toBe('nuevo');

    inputEl().value = 'editado';
    inputEl().dispatchEvent(new Event('input'));
    expect(onChange).toHaveBeenCalledWith('editado');
  });

  it('can be used with formControl', () => {
    const host = TestBed.createComponent(InputHostComponent);
    host.detectChanges();

    const native = host.nativeElement.querySelector('input') as HTMLInputElement;
    expect(native.value).toBe('ana@bonafit.test');

    host.componentInstance.control.setValue('otra@bonafit.test');
    host.detectChanges();
    expect(native.value).toBe('otra@bonafit.test');
  });

  function inputEl(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input');
  }
});
