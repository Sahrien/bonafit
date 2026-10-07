import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-button',
  imports: [],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
  text = input<string>('');
  variant = input<'primary' | 'outline' | 'ghost' | 'cream'>('primary');
  /** Compact size for header chrome; default keeps marketing CTAs. */
  size = input<'sm' | 'md'>('md');
  type = input<'button' | 'submit'>('button');
  disabled = input(false);
  clicked = output<void>();

  onClick() {
    if (!this.disabled()) {
      this.clicked.emit();
    }
  }
}
