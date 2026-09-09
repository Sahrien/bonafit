import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface BonaTabItem {
  id: string;
  label: string;
}

@Component({
  selector: 'app-bona-tabs',
  standalone: true,
  templateUrl: './bona-tabs.component.html',
  styleUrl: './bona-tabs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BonaTabsComponent {
  readonly tabs = input<BonaTabItem[]>([]);
  readonly active = input('');
  readonly activeChange = output<string>();

  onSelect(id: string): void {
    this.activeChange.emit(id);
  }
}
