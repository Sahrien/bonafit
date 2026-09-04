import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

@Component({
  selector: 'app-bona-module',
  standalone: true,
  imports: [],
  templateUrl: './bona-module.component.html',
  styleUrl: './bona-module.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BonaModuleComponent {
  @Input() title = '';
  @Input() description = '';
  @Input() icon = '';
  @Input() image = '';

  @Output() clicked = new EventEmitter<void>();

  onClick(): void {
    this.clicked.emit();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onClick();
    }
  }
}
