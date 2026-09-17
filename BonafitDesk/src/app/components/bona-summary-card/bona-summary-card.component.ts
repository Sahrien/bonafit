import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { BonaButtonComponent } from '../bona-button/bona-button.component';

@Component({
  selector: 'app-bona-summary-card',
  standalone: true,
  imports: [BonaButtonComponent],
  templateUrl: './bona-summary-card.component.html',
  styleUrl: './bona-summary-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BonaSummaryCardComponent {
  @Input() kicker = '';
  @Input() title = '';
  @Input() meta = '';
  @Input() hint = '';
  @Input() actionLabel = '';
  @Input() actionVariant: 'primary' | 'secondary' = 'primary';

  @Output() action = new EventEmitter<void>();
}
