import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-bona-page',
  standalone: true,
  imports: [MatProgressSpinner],
  templateUrl: './bona-page.component.html',
  styleUrl: './bona-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BonaPageComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly loading = input(false);
}
