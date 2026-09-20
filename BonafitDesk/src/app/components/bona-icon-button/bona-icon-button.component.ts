import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-bona-icon-button',
  standalone: true,
  imports: [MatIconButton, MatIcon],
  templateUrl: './bona-icon-button.component.html',
  styleUrl: './bona-icon-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BonaIconButtonComponent {
  readonly icon = input.required<string>();
  readonly label = input.required<string>();
  readonly disabled = input(false);
  readonly action = output<void>();

  onClick(): void {
    if (this.disabled()) {
      return;
    }
    this.action.emit();
  }
}
