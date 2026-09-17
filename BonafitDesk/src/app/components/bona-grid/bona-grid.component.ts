import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { BonaButtonComponent } from '../bona-button/bona-button.component';
import { GRID_LITERALS } from '../../i18n/es';

export type BonaGridColumnType = 'text' | 'number' | 'date' | 'currency';

export interface BonaGridColumn {
  field: string;
  header: string;
  type?: BonaGridColumnType;
}

export interface BonaGridAction<T = Record<string, unknown>> {
  label: string;
  action: string;
  visible?: (item: T) => boolean;
}

export interface BonaGridActionEvent<T = Record<string, unknown>> {
  action: string;
  item: T;
}

@Component({
  selector: 'app-bona-grid',
  standalone: true,
  imports: [
    MatTableModule,
    MatIconButton,
    MatIcon,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    BonaButtonComponent,
  ],
  templateUrl: './bona-grid.component.html',
  styleUrl: './bona-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BonaGridComponent<T extends Record<string, unknown> = Record<string, unknown>>
  implements OnChanges
{
  @Input() data: T[] = [];
  @Input() columns: BonaGridColumn[] = [];
  @Input() actions: BonaGridAction<T>[] = [];
  @Input() emptyMessage: string = GRID_LITERALS.empty;
  @Input() emptyTitle = '';
  @Input() emptyActionLabel = '';
  @Input() actionsLabel: string = GRID_LITERALS.actions;
  @Input() pageSize = 0;
  @Input() columnFilters = false;
  @Input() emptyFilteredMessage = '';

  pageIndex = 0;
  filterValues: Record<string, string> = {};

  readonly GRID_LITERALS = GRID_LITERALS;

  @Output() action = new EventEmitter<BonaGridActionEvent<T>>();
  @Output() emptyAction = new EventEmitter<void>();
  @Output() rowClick = new EventEmitter<T>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.pageIndex = 0;
    }
    if (changes['data'] || changes['pageSize']) {
      this.clampPage();
    }
  }

  get filteredData(): T[] {
    if (!this.columnFilters) {
      return this.data;
    }
    return this.data.filter((row) =>
      this.columns.every((column) => {
        const query = this.columnFilter(column.field).trim().toLowerCase();
        if (!query) {
          return true;
        }
        return this.formatCell(row, column).toLowerCase().includes(query);
      }),
    );
  }

  get filteredEmpty(): boolean {
    return this.data.length > 0 && this.filteredData.length === 0;
  }

  get pagedData(): T[] {
    const rows = this.filteredData;
    if (!this.showPager) {
      return rows;
    }
    const start = this.pageIndex * this.pageSize;
    return rows.slice(start, start + this.pageSize);
  }

  get showPager(): boolean {
    return this.pageSize > 0 && this.filteredData.length > 0;
  }

  get pageCount(): number {
    if (!this.showPager) {
      return 1;
    }
    return Math.max(1, Math.ceil(this.filteredData.length / this.pageSize));
  }

  get pageLabel(): string {
    return GRID_LITERALS.pageOf
      .replace('{page}', String(this.pageIndex + 1))
      .replace('{pages}', String(this.pageCount));
  }

  get canPrevious(): boolean {
    return this.pageIndex > 0;
  }

  get canNext(): boolean {
    return this.pageIndex < this.pageCount - 1;
  }

  onPreviousPage(): void {
    if (!this.canPrevious) {
      return;
    }
    this.pageIndex -= 1;
  }

  onNextPage(): void {
    if (!this.canNext) {
      return;
    }
    this.pageIndex += 1;
  }

  private clampPage(): void {
    const last = this.pageCount - 1;
    if (this.pageIndex > last) {
      this.pageIndex = last;
    }
    if (this.pageIndex < 0) {
      this.pageIndex = 0;
    }
  }

  columnFilter(field: string): string {
    return this.filterValues[field] ?? '';
  }

  filterLabel(column: BonaGridColumn): string {
    return `${GRID_LITERALS.filter} ${column.header}`;
  }

  onColumnFilter(field: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.filterValues = { ...this.filterValues, [field]: value };
    this.pageIndex = 0;
  }

  get titleColumn(): BonaGridColumn | undefined {
    return this.columns[0];
  }

  get metaColumns(): BonaGridColumn[] {
    return this.columns.slice(1);
  }

  get displayedColumns(): string[] {
    const fields = this.columns.map((column) => column.field);
    if (this.actions.length > 0) {
      fields.push('_actions');
    }
    return fields;
  }

  formatCell(item: T, column: BonaGridColumn): string {
    const raw = item[column.field];
    if (raw == null || raw === '') {
      return '';
    }
    if (column.type === 'date') {
      const date = raw instanceof Date ? raw : new Date(String(raw));
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleString('es');
      }
    }
    if (column.type === 'currency') {
      if (typeof raw === 'string' && raw.includes('€')) {
        return raw;
      }
      const amount = Number(raw);
      if (!Number.isNaN(amount)) {
        return amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
      }
    }
    return String(raw);
  }

  onAction(gridAction: BonaGridAction<T>, item: T): void {
    this.action.emit({
      action: gridAction.action,
      item,
    });
  }

  visibleActions(item: T): BonaGridAction<T>[] {
    return this.actions.filter((action) => !action.visible || action.visible(item));
  }

  onRowClick(item: T): void {
    this.rowClick.emit(item);
  }

  isNested(item: T): boolean {
    return item['rowKind'] === 'bono';
  }

  isParent(item: T): boolean {
    return item['rowKind'] === 'service';
  }

  rowKey(item: T, index: number): string {
    const id = item['id'];
    return id != null && id !== '' ? String(id) : String(index);
  }
}
