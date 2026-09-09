import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BonaTabsComponent } from './bona-tabs.component';

describe('BonaTabsComponent', () => {
  let fixture: ComponentFixture<BonaTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BonaTabsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BonaTabsComponent);
    fixture.componentRef.setInput('tabs', [
      { id: 'template', label: 'Plantilla' },
      { id: 'assign', label: 'Asignación' },
    ]);
    fixture.componentRef.setInput('active', 'template');
    fixture.detectChanges();
  });

  it('emits the selected tab', () => {
    const spy = jasmine.createSpy('activeChange');
    fixture.componentInstance.activeChange.subscribe(spy);
    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    buttons[1].click();
    expect(spy).toHaveBeenCalledWith('assign');
  });
});
