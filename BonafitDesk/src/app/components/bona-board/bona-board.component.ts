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
  readonly itemClick = output<BonaBoardItem>();

  itemsFor(columnId: string): BonaBoardItem[] {
    return this.items().filter((item) => item.columnId === columnId);
  }
}
