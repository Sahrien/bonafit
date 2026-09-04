import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  BonaInputTextFieldComponent,
  BonaInputType,
} from '../bona-input-text-field/bona-input-text-field.component';
import { BonaFieldDefinition, isBonaTextInputType } from './bona-field.definition';

@Component({
  selector: 'app-bona-field',
  standalone: true,
  imports: [
    BonaInputTextFieldComponent,
    MatFormField,
    MatLabel,
    MatInput,
    MatSelectModule,
  ],
  templateUrl: './bona-field.component.html',
  styleUrl: './bona-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BonaFieldComponent {
  readonly definition = input.required<BonaFieldDefinition>();
  readonly value = input('');
  readonly valueChange = output<string>();

  protected readonly isTextInput = isBonaTextInputType;

  textInputType(type: BonaFieldDefinition['type']): BonaInputType {
    if (!type || type === 'textarea' || type === 'select') {
      return 'text';
    }
    return type;
  }

  onValueChange(value: string): void {
    this.valueChange.emit(value);
  }

  onTextareaInput(event: Event): void {
    this.onValueChange((event.target as HTMLTextAreaElement).value);
  }

  onSelectChange(value: string): void {
    this.onValueChange(value);
  }
}
