import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { BonaFormComponent, BonaFormValue } from '../../components/bona-form/bona-form.component';
import { BonaFieldDefinition } from '../../components/bona-field/bona-field.definition';

@Component({
  selector: 'app-form-fill-view',
  standalone: true,
  imports: [BonaFormComponent],
  templateUrl: './form-fill-view.component.html',
  styleUrl: './form-fill-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormFillViewComponent {
  readonly banner = input('');
  readonly fields = input<BonaFieldDefinition[]>([]);
  readonly value = input<BonaFormValue>({});
  readonly submitText = input('Enviar');
  readonly disabled = input(false);
  readonly error = input('');
  readonly valueChange = output<BonaFormValue>();
  readonly submitted = output<BonaFormValue>();
}
