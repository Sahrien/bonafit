import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BonaChipFilterComponent } from './bona-chip-filter.component';

describe('BonaChipFilterComponent', () => {
  let fixture: ComponentFixture<BonaChipFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BonaChipFilterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BonaChipFilterComponent);
    fixture.componentRef.setInput('items', [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
    ]);
    fixture.componentRef.setInput('allLabel', 'Todos');
    fixture.componentRef.setInput('label', 'Filtro');
    fixture.componentRef.setInput('selectedIds', []);
    fixture.detectChanges();
  });

  it('treats an empty selection as all', () => {
    const chips = fixture.nativeElement.querySelectorAll(
      '.bona-chip-filter__chip',
    ) as NodeListOf<HTMLButtonElement>;
    expect(chips[0].classList.contains('is-active')).toBeTrue();
    expect(chips[1].classList.contains('is-active')).toBeFalse();
  });

  it('emits a single id when leaving the all state', () => {
    const spy = jasmine.createSpy('selectedChange');
    fixture.componentInstance.selectedChange.subscribe(spy);
    const chips = fixture.nativeElement.querySelectorAll(
      '.bona-chip-filter__chip',
    ) as NodeListOf<HTMLButtonElement>;
    chips[1].click();
    expect(spy).toHaveBeenCalledWith(['a']);
  });

  it('toggles an id off the current selection', () => {
    fixture.componentRef.setInput('selectedIds', ['a', 'b']);
    fixture.detectChanges();
    const spy = jasmine.createSpy('selectedChange');
    fixture.componentInstance.selectedChange.subscribe(spy);
    const chips = fixture.nativeElement.querySelectorAll(
      '.bona-chip-filter__chip',
    ) as NodeListOf<HTMLButtonElement>;
    chips[1].click();
    expect(spy).toHaveBeenCalledWith(['b']);
  });
});
