import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { MatButton } from '@angular/material/button';

export type BonaButtonVariant = 'primary' | 'secondary';
export type BonaButtonType = 'button' | 'submit' | 'reset';

@Component({
  selector: 'app-bona-button',
  standalone: true,
  imports: [MatButton],
  templateUrl: './bona-button.component.html',
  styleUrl: './bona-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BonaButtonComponent {
  @Input() text = '';
  @Input() variant: BonaButtonVariant = 'primary';
  @Input() disabled = false;
  @Input() type: BonaButtonType = 'button';

  @Output() action = new EventEmitter<void>();

  onClick(): void {
    if (this.disabled) {
      return;
    }
    this.action.emit();
  }
}
