import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { BonaButtonComponent } from '../bona-button/bona-button.component';
import { BonaFieldComponent } from '../bona-field/bona-field.component';
import { BonaFieldDefinition } from '../bona-field/bona-field.definition';

export type BonaFormValue = Record<string, string>;

@Component({
  selector: 'app-bona-form',
  standalone: true,
  imports: [BonaFieldComponent, BonaButtonComponent],
  templateUrl: './bona-form.component.html',
  styleUrl: './bona-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BonaFormComponent {
  readonly fields = input<BonaFieldDefinition[]>([]);
  readonly value = input<BonaFormValue>({});
  readonly submitText = input('Guardar');
  readonly disabled = input(false);

  readonly valueChange = output<BonaFormValue>();
  readonly submitted = output<BonaFormValue>();

  readonly currentValue = computed(() => {
    const incoming = this.value();
    const next: BonaFormValue = {};
    for (const field of this.fields()) {
      next[field.key] = incoming[field.key] ?? '';
    }
    return next;
  });

  fieldValue(key: string): string {
    return this.currentValue()[key] ?? '';
  }

  onFieldValue(key: string, fieldValue: string): void {
    this.valueChange.emit({
      ...this.currentValue(),
      [key]: fieldValue,
    });
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (this.disabled()) {
      return;
    }
    this.submitted.emit(this.currentValue());
  }
}
