import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { BonaButtonComponent } from '../bona-button/bona-button.component';

export type BonaGridColumnType = 'text' | 'number' | 'date';

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
  imports: [MatTableModule, BonaButtonComponent],
  templateUrl: './bona-grid.component.html',
  styleUrl: './bona-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BonaGridComponent<T extends Record<string, unknown> = Record<string, unknown>> {
  @Input() data: T[] = [];
  @Input() columns: BonaGridColumn[] = [];
  @Input() actions: BonaGridAction[] = [];
  @Input() emptyMessage = 'Sin resultados';

  @Output() action = new EventEmitter<BonaGridActionEvent<T>>();
  @Output() rowClick = new EventEmitter<T>();

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
}
