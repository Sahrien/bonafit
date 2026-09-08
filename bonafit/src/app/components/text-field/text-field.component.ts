import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

let nextFieldId = 0;

@Component({
  selector: 'app-text-field',
  imports: [],
  templateUrl: './text-field.component.html',
  styleUrl: './text-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextFieldComponent {
  readonly fieldId = `bona-field-${++nextFieldId}`;

  label = input<string>('');
  placeholder = input<string>('');
  type = input<string>('text');
  value = input<string>('');
  multiline = input(false);
  required = input(false);
  rows = input(5);
  autocomplete = input<string>('');

  valueChange = output<string>();

  onInput(event: Event) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    this.valueChange.emit(target.value);
  }
}
