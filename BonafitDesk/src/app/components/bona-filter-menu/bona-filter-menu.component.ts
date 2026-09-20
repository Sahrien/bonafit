import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuTrigger } from '@angular/material/menu';

export interface BonaFilterMenuItem {
  id: string;
  label: string;
}

@Component({
  selector: 'app-bona-filter-menu',
  standalone: true,
  imports: [MatMenu, MatMenuTrigger, MatIcon],
  templateUrl: './bona-filter-menu.component.html',
  styleUrl: './bona-filter-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BonaFilterMenuComponent {
  readonly items = input<BonaFilterMenuItem[]>([]);
  readonly selectedIds = input<string[]>([]);
  readonly label = input('');
  readonly allLabel = input('');
  readonly searchLabel = input('');
  readonly emptyLabel = input('');
  readonly selectedChange = output<string[]>();

  readonly query = signal('');

  readonly allSelected = computed(() => this.selectedIds().length === 0);

  readonly triggerLabel = computed(() => {
    const count = this.selectedIds().length;
    const name = this.label();
    return count ? `${name} · ${count}` : name;
  });

  readonly visibleItems = computed(() => {
    const needle = this.query().trim().toLocaleLowerCase();
    const items = this.items();
    if (!needle) {
      return items;
    }
    return items.filter((item) => item.label.toLocaleLowerCase().includes(needle));
  });

  isActive(id: string): boolean {
    return this.selectedIds().includes(id);
  }

  onQuery(value: string): void {
    this.query.set(value);
  }

  onQueryInput(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.query.set(target.value);
    }
  }

  onAll(): void {
    this.selectedChange.emit([]);
  }

  onToggle(id: string): void {
    const selected = this.selectedIds();
    if (!selected.length) {
      this.selectedChange.emit([id]);
      return;
    }
    if (selected.includes(id)) {
      this.selectedChange.emit(selected.filter((item) => item !== id));
      return;
    }
    this.selectedChange.emit([...selected, id]);
  }

  keepMenu(event: Event): void {
    event.stopPropagation();
  }
}
