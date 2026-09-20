import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { BonaFilterMenuComponent } from './bona-filter-menu.component';

describe('BonaFilterMenuComponent', () => {
  let fixture: ComponentFixture<BonaFilterMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BonaFilterMenuComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(BonaFilterMenuComponent);
    fixture.componentRef.setInput('items', [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
    ]);
    fixture.componentRef.setInput('label', 'Servicios');
    fixture.componentRef.setInput('allLabel', 'Todos');
    fixture.componentRef.setInput('searchLabel', 'Buscar');
    fixture.componentRef.setInput('emptyLabel', 'Sin resultados');
    fixture.componentRef.setInput('selectedIds', []);
    fixture.detectChanges();
  });

  it('keeps the catalog off the trigger until the menu opens', () => {
    const trigger = fixture.nativeElement.querySelector('.bona-filter-menu__trigger') as HTMLButtonElement;
    expect(trigger.textContent).toContain('Servicios');
    expect(trigger.textContent).not.toContain('Alpha');
    trigger.click();
    fixture.detectChanges();
    expect(document.body.textContent).toContain('Alpha');
    expect(document.body.textContent).toContain('Beta');
  });

  it('shows a count on the trigger when the selection is narrowed', () => {
    fixture.componentRef.setInput('selectedIds', ['a']);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Servicios · 1');
  });

  it('filters the list by search and emits a toggle', () => {
    fixture.componentInstance.onQuery('be');
    expect(fixture.componentInstance.visibleItems().map((item) => item.id)).toEqual(['b']);
    const spy = jasmine.createSpy('selectedChange');
    fixture.componentInstance.selectedChange.subscribe(spy);
    fixture.componentInstance.onToggle('b');
    expect(spy).toHaveBeenCalledWith(['b']);
  });
});
