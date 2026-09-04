import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BonaModuleComponent } from './bona-module.component';

describe('BonaModuleComponent', () => {
  let component: BonaModuleComponent;
  let fixture: ComponentFixture<BonaModuleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BonaModuleComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BonaModuleComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Calendario');
    fixture.componentRef.setInput('description', 'Citas de la semana');
    fixture.componentRef.setInput('icon', '📅');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders title, description and icon', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Calendario');
    expect(text).toContain('Citas de la semana');
    expect(text).toContain('📅');
  });

  it('emits clicked on click', () => {
    const spy = jasmine.createSpy('clicked');
    component.clicked.subscribe(spy);

    card().click();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits clicked on Enter', () => {
    const spy = jasmine.createSpy('clicked');
    component.clicked.subscribe(spy);

    card().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(spy).toHaveBeenCalledTimes(1);
  });

  function card(): HTMLElement {
    return fixture.nativeElement.querySelector('.module-card');
  }
});
