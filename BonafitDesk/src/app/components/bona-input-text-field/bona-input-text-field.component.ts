import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  forwardRef,
  inject,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';

export type BonaInputType = 'text' | 'email' | 'tel' | 'number' | 'datetime-local' | 'password';

@Component({
  selector: 'app-bona-input-text-field',
  standalone: true,
  imports: [MatFormField, MatLabel, MatInput],
  templateUrl: './bona-input-text-field.component.html',
  styleUrl: './bona-input-text-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => BonaInputTextFieldComponent),
      multi: true,
    },
  ],
})
export class BonaInputTextFieldComponent implements ControlValueAccessor {
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() label = '';
  @Input() placeholder = '';
  @Input() value = '';
  @Input() disabled = false;
  @Input() type: BonaInputType = 'text';

  @Output() valueChange = new EventEmitter<string>();

  private onChange: (value: string) => void = () => undefined;
  onTouched: () => void = () => undefined;

  onInput(event: Event): void {
    const next = (event.target as HTMLInputElement).value;
    this.value = next;
    this.valueChange.emit(next);
    this.onChange(next);
  }

  writeValue(value: string | null): void {
    this.value = value ?? '';
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }
}
