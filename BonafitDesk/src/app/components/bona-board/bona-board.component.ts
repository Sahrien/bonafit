import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface BonaBoardColumn {
  id: string;
  label: string;
}

export interface BonaBoardItem {
  id: string;
  columnId: string;
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: string;
}

export interface BonaBoardMove {
  item: BonaBoardItem;
  columnId: string;
}

@Component({
  selector: 'app-bona-board',
  standalone: true,
  templateUrl: './bona-board.component.html',
  styleUrl: './bona-board.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BonaBoardComponent {
  readonly columns = input<BonaBoardColumn[]>([]);
  readonly items = input<BonaBoardItem[]>([]);
  readonly emptyLabel = input('');
  readonly movable = input(false);
  readonly itemClick = output<BonaBoardItem>();
  readonly move = output<BonaBoardMove>();

  itemsFor(columnId: string): BonaBoardItem[] {
    return this.items().filter((item) => item.columnId === columnId);
  }

  onDragStart(event: DragEvent, item: BonaBoardItem): void {
    if (!this.movable() || !event.dataTransfer) {
      return;
    }
    event.dataTransfer.setData('text/plain', item.id);
    event.dataTransfer.effectAllowed = 'move';
  }

  onDragOver(event: DragEvent): void {
    if (!this.movable()) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(event: DragEvent, columnId: string): void {
    if (!this.movable()) {
      return;
    }
    event.preventDefault();
    const id = event.dataTransfer?.getData('text/plain');
    const item = this.items().find((entry) => entry.id === id);
    if (item && item.columnId !== columnId) {
      this.move.emit({ item, columnId });
    }
  }
}
