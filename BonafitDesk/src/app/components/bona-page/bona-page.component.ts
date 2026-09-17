import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-bona-page',
  standalone: true,
  imports: [],
  templateUrl: './bona-page.component.html',
  styleUrl: './bona-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BonaPageComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly loading = input(false);
  readonly loadingLabel = input('Cargando…');
}
