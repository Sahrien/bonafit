import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-bona-dialog-layout',
  standalone: true,
  templateUrl: './bona-dialog-layout.component.html',
  styleUrl: './bona-dialog-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BonaDialogLayoutComponent {
  readonly title = input('');
}
