import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { LanguageService } from '../../core/i18n/language.service';
import { BonaButtonComponent } from '../bona-button/bona-button.component';

export type BonaGridColumnType = 'text' | 'number' | 'date' | 'currency';

export type BonaGridSortDirection = 'asc' | 'desc';

export interface BonaGridColumn {
  field: string;
  header: string;
  type?: BonaGridColumnType;
  sortField?: string;
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
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);

  @Input() data: T[] = [];
  @Input() columns: BonaGridColumn[] = [];
  @Input() actions: BonaGridAction<T>[] = [];
  @Input() emptyMessage = '';
  @Input() emptyTitle = '';
  @Input() emptyActionLabel = '';
  @Input() actionsLabel = '';
  @Input() pageSize = 0;
  @Input() columnFilters = false;
  @Input() columnSort = false;
  @Input() emptyFilteredMessage = '';

  pageIndex = 0;
  filterValues: Record<string, string> = {};
  sortField: string | null = null;
  sortDirection: BonaGridSortDirection | null = null;

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

  get sortedData(): T[] {
    const rows = this.filteredData;
    const column = this.activeSortColumn;
    if (!this.columnSort || !column || !this.sortDirection) {
      return rows;
    }
    const direction = this.sortDirection === 'asc' ? 1 : -1;
    return [...rows].sort((left, right) => direction * this.compareRows(left, right, column));
  }

  get pagedData(): T[] {
    const rows = this.sortedData;
    if (this.pageSize <= 0) {
      return rows;
    }
    const start = this.pageIndex * this.pageSize;
    return rows.slice(start, start + this.pageSize);
  }

  get showPager(): boolean {
    return this.pageSize > 0 && this.data.length > 0;
  }

  get pageCount(): number {
    if (this.pageSize <= 0) {
      return 1;
    }
    return Math.max(1, Math.ceil(this.filteredData.length / this.pageSize));
  }

  get bodyMinHeight(): string {
    if (!this.columnFilters) {
      return '';
    }
    const rows = this.pageSize > 0 ? this.pageSize : 6;
    return `calc(${rows} * 2.75rem)`;
  }

  get emptyTitleText(): string {
    return this.emptyTitle || this.gridText('emptyTitle');
  }

  get emptyMessageText(): string {
    return this.emptyMessage || this.gridText('empty');
  }

  get actionsLabelText(): string {
    return this.actionsLabel || this.gridText('actions');
  }

  get filterPlaceholder(): string {
    return this.gridText('filter');
  }

  get previousPageLabel(): string {
    return this.gridText('previousPage');
  }

  get nextPageLabel(): string {
    return this.gridText('nextPage');
  }

  get pageLabel(): string {
    return this.gridText('pageOf', { page: this.pageIndex + 1, pages: this.pageCount });
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
    return `${this.gridText('filter')} ${column.header}`;
  }

  onColumnFilter(field: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.filterValues = { ...this.filterValues, [field]: value };
    this.pageIndex = 0;
  }

  get activeSortColumn(): BonaGridColumn | undefined {
    if (!this.sortField) {
      return undefined;
    }
    return this.columns.find((column) => column.field === this.sortField);
  }

  isSorted(column: BonaGridColumn): boolean {
    return this.sortField === column.field && this.sortDirection != null;
  }

  sortIcon(column: BonaGridColumn): string {
    if (this.sortField !== column.field || !this.sortDirection) {
      return 'unfold_more';
    }
    return this.sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  sortLabel(column: BonaGridColumn): string {
    const key =
      this.sortField !== column.field || !this.sortDirection
        ? 'sortColumn'
        : this.sortDirection === 'asc'
          ? 'sortAsc'
          : 'sortDesc';
    return this.gridText(key, { column: column.header });
  }

  onSort(column: BonaGridColumn): void {
    if (this.sortField !== column.field) {
      this.sortField = column.field;
      this.sortDirection = 'asc';
    } else if (this.sortDirection === 'asc') {
      this.sortDirection = 'desc';
    } else {
      this.sortField = null;
      this.sortDirection = null;
    }
    this.pageIndex = 0;
  }

  private compareRows(left: T, right: T, column: BonaGridColumn): number {
    const field = column.sortField ?? column.field;
    if (column.type === 'date') {
      return this.dateValue(left[field]) - this.dateValue(right[field]);
    }
    if (column.type === 'number' || column.type === 'currency') {
      return this.numberValue(left[field]) - this.numberValue(right[field]);
    }
    return this.formatCell(left, column).localeCompare(this.formatCell(right, column), this.language.locale(), {
      numeric: true,
      sensitivity: 'base',
    });
  }

  private dateValue(raw: unknown): number {
    if (raw instanceof Date) {
      return raw.getTime();
    }
    const time = Date.parse(String(raw ?? ''));
    return Number.isNaN(time) ? 0 : time;
  }

  private numberValue(raw: unknown): number {
    if (typeof raw === 'number') {
      return raw;
    }
    const amount = Number(String(raw ?? '').replace(/[^\d,-]/g, '').replace(',', '.'));
    return Number.isNaN(amount) ? 0 : amount;
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
    if (column.type === 'date' && !(column.sortField && column.sortField !== column.field)) {
      const date = raw instanceof Date ? raw : new Date(String(raw));
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleString(this.language.locale());
      }
    }
    if (column.type === 'currency') {
      if (typeof raw === 'string' && raw.includes('€')) {
        return raw;
      }
      const amount = Number(raw);
      if (!Number.isNaN(amount)) {
        return amount.toLocaleString(this.language.locale(), { style: 'currency', currency: 'EUR' });
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

  private gridText(key: string, params?: Record<string, string | number>): string {
    this.language.language();
    return this.translate.instant(`grid.${key}`, params);
  }
}
