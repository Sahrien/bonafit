import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export interface BonaChipFilterItem {
  id: string;
  label: string;
}

@Component({
  selector: 'app-bona-chip-filter',
  standalone: true,
  templateUrl: './bona-chip-filter.component.html',
  styleUrl: './bona-chip-filter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BonaChipFilterComponent {
  readonly items = input<BonaChipFilterItem[]>([]);
  readonly selectedIds = input<string[]>([]);
  readonly allLabel = input('');
  readonly label = input('');
  readonly selectedChange = output<string[]>();

  readonly allSelected = computed(() => this.selectedIds().length === 0);

  isActive(id: string): boolean {
    return this.selectedIds().includes(id);
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
}
