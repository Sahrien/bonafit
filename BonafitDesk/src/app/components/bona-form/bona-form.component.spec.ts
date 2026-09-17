import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { BonaFormComponent } from './bona-form.component';
import { BonaFieldDefinition } from '../bona-field/bona-field.definition';

const fields: BonaFieldDefinition[] = [
  { key: 'nombre', label: 'Nombre', type: 'text' },
  { key: 'email', label: 'Email', type: 'email' },
];

@Component({
  standalone: true,
  imports: [BonaFormComponent],
  template: `
    <app-bona-form [fields]="fields" [value]="value">
      <button bonaFormActions type="button">Extra</button>
    </app-bona-form>
  `,
})
class FormActionsHostComponent {
  fields = fields;
  value = { nombre: 'Ana', email: 'ana@test' };
}

describe('BonaFormComponent', () => {
  let component: BonaFormComponent;
  let fixture: ComponentFixture<BonaFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BonaFormComponent, FormActionsHostComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(BonaFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('fields', fields);
    fixture.componentRef.setInput('value', { nombre: 'Ana', email: 'ana@test' });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders a field for each definition', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Nombre');
    expect(text).toContain('Email');
    expect(fixture.nativeElement.querySelectorAll('app-bona-field').length).toBe(2);
  });

  it('emits valueChange when a field changes', () => {
    const spy = jasmine.createSpy('valueChange');
    component.valueChange.subscribe(spy);

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'Luis';
    input.dispatchEvent(new Event('input'));

    expect(spy).toHaveBeenCalledWith({ nombre: 'Luis', email: 'ana@test' });
  });

  it('emits submitted with the bound value', () => {
    const spy = jasmine.createSpy('submitted');
    component.submitted.subscribe(spy);

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(spy).toHaveBeenCalledWith({ nombre: 'Ana', email: 'ana@test' });
  });

  it('emits submitted with native input values even if the bound value is empty', () => {
    fixture.componentRef.setInput('value', { nombre: '', email: '' });
    fixture.detectChanges();

    const spy = jasmine.createSpy('submitted');
    component.submitted.subscribe(spy);

    const nombre = fixture.nativeElement.querySelector('[data-field-key="nombre"]') as HTMLInputElement;
    const email = fixture.nativeElement.querySelector('[data-field-key="email"]') as HTMLInputElement;
    nombre.value = 'Luis';
    email.value = 'luis@test';

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(spy).toHaveBeenCalledWith({ nombre: 'Luis', email: 'luis@test' });
  });

  it('renders projected extra actions next to submit', () => {
    const hostFixture = TestBed.createComponent(FormActionsHostComponent);
    hostFixture.detectChanges();
    const actions = hostFixture.nativeElement.querySelector('.bona-form__actions') as HTMLElement;
    expect(actions.textContent).toContain('Extra');
    expect(actions.textContent).toContain('Guardar');
  });

  it('does not emit submitted when disabled', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    const spy = jasmine.createSpy('submitted');
    component.submitted.subscribe(spy);

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));

    expect(spy).not.toHaveBeenCalled();
  });
});
