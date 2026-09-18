import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideDeskTranslate } from '../../core/i18n/provide-desk-translate';
import { GRID_LITERALS } from '../../i18n/es';
import { BonaGridComponent } from './bona-grid.component';

interface ClientRow extends Record<string, unknown> {
  id: string;
  nombre: string;
}

describe('BonaGridComponent', () => {
  let component: BonaGridComponent<ClientRow>;
  let fixture: ComponentFixture<BonaGridComponent<ClientRow>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BonaGridComponent],
      providers: [provideNoopAnimations(), provideHttpClient(), provideDeskTranslate()],
    }).compileComponents();

    fixture = TestBed.createComponent(BonaGridComponent<ClientRow>);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('columns', [{ field: 'nombre', header: 'Nombre' }]);
    fixture.componentRef.setInput('data', []);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders column headers from config', () => {
    fixture.componentRef.setInput('data', [{ id: '1', nombre: 'Ana' }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nombre');
  });

  it('shows the empty state when there are no rows', () => {
    expect(fixture.nativeElement.textContent).toContain(GRID_LITERALS.empty);
  });

  it('renders a custom empty message', () => {
    fixture.componentRef.setInput('emptyMessage', 'No hay clientes');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay clientes');
  });

  it('renders a card list alongside the table', () => {
    fixture.componentRef.setInput('data', [{ id: '1', nombre: 'Ana' }]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.bona-grid__cards')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Ana');
  });

  it('emits emptyAction from the empty-state button', () => {
    const spy = jasmine.createSpy('emptyAction');
    component.emptyAction.subscribe(spy);
    fixture.componentRef.setInput('emptyActionLabel', 'Crear');
    fixture.detectChanges();

    const button = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((item) => item.textContent?.includes('Crear'));
    button?.click();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('renders row values for configured columns', () => {
    fixture.componentRef.setInput('data', [{ id: '1', nombre: 'Ana' }]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ana');
    expect(fixture.nativeElement.textContent).not.toContain(GRID_LITERALS.empty);
  });

  it('emits rowClick when a data row is clicked', () => {
    const row = { id: '1', nombre: 'Ana' };
    fixture.componentRef.setInput('data', [row]);
    fixture.detectChanges();

    const spy = jasmine.createSpy('rowClick');
    component.rowClick.subscribe(spy);

    const dataRow = fixture.nativeElement.querySelector('tr[mat-row]') as HTMLTableRowElement;
    dataRow.click();

    expect(spy).toHaveBeenCalledWith(row);
  });

  it('renders nested class for bono rows', () => {
    fixture.componentRef.setInput('data', [
      { id: '1', nombre: 'Ana', rowKind: 'service' },
      { id: '2', nombre: 'pack', rowKind: 'bono' },
    ]);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tr[mat-row]') as NodeListOf<HTMLTableRowElement>;
    expect(rows.length).toBe(2);
    expect(rows[0].classList.contains('bona-grid__row--parent')).toBeTrue();
    expect(rows[1].classList.contains('bona-grid__row--nested')).toBeTrue();
  });

  it('formats currency columns in euros', () => {
    fixture.componentRef.setInput('columns', [
      { field: 'precio', header: 'Precio', type: 'currency' },
    ]);
    fixture.componentRef.setInput('data', [{ id: '1', nombre: 'Ana', precio: 45 }]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('€');
    expect(fixture.nativeElement.textContent).toContain('45');
  });

  it('pages rows when pageSize is set', () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({
      id: String(index),
      nombre: `N${index}`,
    }));
    fixture.componentRef.setInput('pageSize', 10);
    fixture.componentRef.setInput('data', rows);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('N0');
    expect(fixture.nativeElement.textContent).toContain('N9');
    expect(fixture.nativeElement.textContent).not.toContain('N10');
    expect(fixture.nativeElement.textContent).toContain(
      GRID_LITERALS.pageOf.replace('{{page}}', '1').replace('{{pages}}', '2'),
    );

    const next = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((item) => item.textContent?.includes(GRID_LITERALS.nextPage));
    next?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('N10');
    expect(fixture.nativeElement.textContent).not.toContain('N0');
    expect(fixture.nativeElement.textContent).toContain(
      GRID_LITERALS.pageOf.replace('{{page}}', '2').replace('{{pages}}', '2'),
    );
  });

  it('sorts rows from the column header', () => {
    fixture.componentRef.setInput('columnSort', true);
    fixture.componentRef.setInput('data', [
      { id: '1', nombre: 'Luis' },
      { id: '2', nombre: 'Ana' },
    ]);
    fixture.detectChanges();

    const sort = fixture.nativeElement.querySelector(
      '.bona-grid__table .bona-grid__sort',
    ) as HTMLButtonElement;
    expect(sort.getAttribute('aria-label')).toBe(
      GRID_LITERALS.sortColumn.replace('{{column}}', 'Nombre'),
    );

    sort.click();
    fixture.detectChanges();
    let cells = Array.from(
      fixture.nativeElement.querySelectorAll('.bona-grid__table tr[mat-row] td') as NodeListOf<HTMLTableCellElement>,
    ).map((cell) => cell.textContent?.trim());
    expect(cells[0]).toBe('Ana');
    expect(sort.getAttribute('aria-label')).toBe(
      GRID_LITERALS.sortAsc.replace('{{column}}', 'Nombre'),
    );

    sort.click();
    fixture.detectChanges();
    cells = Array.from(
      fixture.nativeElement.querySelectorAll('.bona-grid__table tr[mat-row] td') as NodeListOf<HTMLTableCellElement>,
    ).map((cell) => cell.textContent?.trim());
    expect(cells[0]).toBe('Luis');

    sort.click();
    fixture.detectChanges();
    cells = Array.from(
      fixture.nativeElement.querySelectorAll('.bona-grid__table tr[mat-row] td') as NodeListOf<HTMLTableCellElement>,
    ).map((cell) => cell.textContent?.trim());
    expect(cells[0]).toBe('Luis');
    expect(cells[1]).toBe('Ana');
  });

  it('sorts date columns by sortField', () => {
    fixture.componentRef.setInput('columnSort', true);
    fixture.componentRef.setInput('columns', [
      { field: 'whenLabel', header: 'Fecha', type: 'date', sortField: 'startsAt' },
    ]);
    fixture.componentRef.setInput('data', [
      { id: '1', nombre: 'Ana', whenLabel: 'tarde', startsAt: '2026-01-02T10:00:00.000Z' },
      { id: '2', nombre: 'Luis', whenLabel: 'temprano', startsAt: '2026-01-01T10:00:00.000Z' },
    ]);
    fixture.detectChanges();

    const sort = fixture.nativeElement.querySelector(
      '.bona-grid__table .bona-grid__sort',
    ) as HTMLButtonElement;
    sort.click();
    fixture.detectChanges();

    const cells = Array.from(
      fixture.nativeElement.querySelectorAll('.bona-grid__table tr[mat-row] td') as NodeListOf<HTMLTableCellElement>,
    ).map((cell) => cell.textContent?.trim());
    expect(cells[0]).toBe('temprano');
    expect(cells[1]).toBe('tarde');
  });

  it('filters rows from the column header field', () => {
    fixture.componentRef.setInput('columnFilters', true);
    fixture.componentRef.setInput('data', [
      { id: '1', nombre: 'Ana' },
      { id: '2', nombre: 'Luis' },
    ]);
    fixture.detectChanges();

    const filter = fixture.nativeElement.querySelector(
      '.bona-grid__table .bona-grid__filter',
    ) as HTMLInputElement;
    filter.value = 'zzz';
    filter.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(GRID_LITERALS.empty);
    expect(fixture.nativeElement.querySelectorAll('tr[mat-row]').length).toBe(0);

    filter.value = 'Ana';
    filter.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Ana');
    expect(fixture.nativeElement.textContent).not.toContain('Luis');
  });

  it('emits action from the row menu without emitting rowClick', () => {
    const row = { id: '1', nombre: 'Ana' };
    fixture.componentRef.setInput('data', [row]);
    fixture.componentRef.setInput('actions', [{ label: 'Editar', action: 'edit' }]);
    fixture.detectChanges();

    const actionSpy = jasmine.createSpy('action');
    const rowSpy = jasmine.createSpy('rowClick');
    component.action.subscribe(actionSpy);
    component.rowClick.subscribe(rowSpy);

    const trigger = fixture.nativeElement.querySelector(
      'button[mat-icon-button]',
    ) as HTMLButtonElement;
    expect(trigger.getAttribute('aria-label')).toBe(GRID_LITERALS.actions);
    trigger.click();
    fixture.detectChanges();

    const menuItem = Array.from(document.querySelectorAll('button[mat-menu-item]')).find((button) =>
      button.textContent?.includes('Editar'),
    ) as HTMLButtonElement | undefined;
    menuItem?.click();

    expect(actionSpy).toHaveBeenCalledWith({ action: 'edit', item: row });
    expect(rowSpy).not.toHaveBeenCalled();
  });
});
