import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BonaBoardComponent } from './bona-board.component';

describe('BonaBoardComponent', () => {
  let fixture: ComponentFixture<BonaBoardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BonaBoardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BonaBoardComponent);
    fixture.componentRef.setInput('columns', [
      { id: 'pending', label: 'Pendiente' },
      { id: 'confirmed', label: 'Confirmada' },
    ]);
    fixture.componentRef.setInput('items', [
      { id: '1', columnId: 'pending', title: 'Ana', subtitle: '10:00' },
    ]);
    fixture.componentRef.setInput('emptyLabel', 'Vacío');
    fixture.detectChanges();
  });

  it('groups items into columns and emits clicks', () => {
    const spy = jasmine.createSpy('itemClick');
    fixture.componentInstance.itemClick.subscribe(spy);
    const columns = fixture.nativeElement.querySelectorAll('.bona-board__column') as NodeListOf<HTMLElement>;
    expect(columns.length).toBe(2);
    expect(columns[0].textContent).toContain('Ana');
    expect(columns[1].textContent).toContain('Vacío');
    (columns[0].querySelector('.bona-board__card') as HTMLButtonElement).click();
    expect(spy).toHaveBeenCalledWith(
      jasmine.objectContaining({ id: '1', columnId: 'pending' }),
    );
  });
});
