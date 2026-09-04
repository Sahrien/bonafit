import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { BonaButtonComponent } from './bona-button.component';

describe('BonaButtonComponent', () => {
  let component: BonaButtonComponent;
  let fixture: ComponentFixture<BonaButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BonaButtonComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(BonaButtonComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('text', 'Guardar');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the text input', () => {
    expect(button().textContent?.trim()).toBe('Guardar');
  });

  it('emits action when clicked', () => {
    const spy = jasmine.createSpy('action');
    component.action.subscribe(spy);

    button().click();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does not emit action when disabled', () => {
    const spy = jasmine.createSpy('action');
    component.action.subscribe(spy);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    button().click();
    component.onClick();

    expect(button().disabled).toBeTrue();
    expect(spy).not.toHaveBeenCalled();
  });

  it('sets the native button type', () => {
    fixture.componentRef.setInput('type', 'submit');
    fixture.detectChanges();

    expect(button().getAttribute('type')).toBe('submit');
  });

  it('renders a stroked button for the secondary variant', () => {
    fixture.componentRef.setInput('variant', 'secondary');
    fixture.detectChanges();

    expect(button().className).toContain('mdc-button--outlined');
  });

  it('renders a filled button for the primary variant', () => {
    expect(button().className).toContain('mdc-button--unelevated');
  });

  function button(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button');
  }
});
