import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
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

export interface BonaGridAction {
  label: string;
  action: string;
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
export class BonaGridComponent<T extends Record<string, unknown> = Record<string, unknown>> {
  @Input() data: T[] = [];
  @Input() columns: BonaGridColumn[] = [];
  @Input() actions: BonaGridAction[] = [];
  @Input() emptyMessage: string = GRID_LITERALS.empty;
  @Input() emptyTitle = '';
  @Input() emptyActionLabel = '';
  @Input() actionsLabel: string = GRID_LITERALS.actions;

  readonly GRID_LITERALS = GRID_LITERALS;

  @Output() action = new EventEmitter<BonaGridActionEvent<T>>();
  @Output() emptyAction = new EventEmitter<void>();
  @Output() rowClick = new EventEmitter<T>();

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

  onAction(gridAction: BonaGridAction, item: T): void {
    this.action.emit({
      action: gridAction.action,
      item,
    });
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
