import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BonaIconButtonComponent } from './bona-icon-button.component';

describe('BonaIconButtonComponent', () => {
  let fixture: ComponentFixture<BonaIconButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BonaIconButtonComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(BonaIconButtonComponent);
    fixture.componentRef.setInput('icon', 'chevron_left');
    fixture.componentRef.setInput('label', 'Anterior');
    fixture.detectChanges();
  });

  it('emits action and labels the control', () => {
    const spy = jasmine.createSpy('action');
    fixture.componentInstance.action.subscribe(spy);
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('Anterior');
    button.click();
    expect(spy).toHaveBeenCalled();
  });
});
