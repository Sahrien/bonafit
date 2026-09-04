import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
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
      providers: [provideNoopAnimations()],
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
    expect(fixture.nativeElement.textContent).toContain('Nombre');
  });

  it('shows the empty state when there are no rows', () => {
    expect(fixture.nativeElement.textContent).toContain('Sin resultados');
  });

  it('renders a custom empty message', () => {
    fixture.componentRef.setInput('emptyMessage', 'No hay clientes');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay clientes');
  });

  it('renders row values for configured columns', () => {
    fixture.componentRef.setInput('data', [{ id: '1', nombre: 'Ana' }]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ana');
    expect(fixture.nativeElement.textContent).not.toContain('Sin resultados');
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

  it('emits action from row buttons without emitting rowClick', () => {
    const row = { id: '1', nombre: 'Ana' };
    fixture.componentRef.setInput('data', [row]);
    fixture.componentRef.setInput('actions', [{ label: 'Editar', action: 'edit' }]);
    fixture.detectChanges();

    const actionSpy = jasmine.createSpy('action');
    const rowSpy = jasmine.createSpy('rowClick');
    component.action.subscribe(actionSpy);
    component.rowClick.subscribe(rowSpy);

    const actionButton = fixture.nativeElement.querySelector(
      '.bona-grid__actions button',
    ) as HTMLButtonElement;
    actionButton.click();

    expect(actionSpy).toHaveBeenCalledWith({ action: 'edit', item: row });
    expect(rowSpy).not.toHaveBeenCalled();
  });
});
