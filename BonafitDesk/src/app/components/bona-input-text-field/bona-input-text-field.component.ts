import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  forwardRef,
  inject,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { PASSWORD_FIELD_LITERALS } from '../../i18n/es';

export type BonaInputType =
  | 'text'
  | 'email'
  | 'tel'
  | 'number'
  | 'datetime-local'
  | 'date'
  | 'time'
  | 'password';

@Component({
  selector: 'app-bona-input-text-field',
  standalone: true,
  imports: [MatFormField, MatLabel, MatInput, MatIconButton, MatIcon, MatSuffix],
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

  readonly literals = PASSWORD_FIELD_LITERALS;
  readonly revealed = signal(false);

  private onChange: (value: string) => void = () => undefined;
  onTouched: () => void = () => undefined;

  isPassword(): boolean {
    return this.type === 'password';
  }

  inputType(): BonaInputType {
    return this.isPassword() && this.revealed() ? 'text' : this.type;
  }

  revealLabel(): string {
    return this.revealed() ? this.literals.hide : this.literals.show;
  }

  toggleReveal(): void {
    this.revealed.update((visible) => !visible);
  }

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
