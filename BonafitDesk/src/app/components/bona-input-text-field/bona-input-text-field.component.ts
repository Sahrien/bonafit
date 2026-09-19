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
import { TranslateService } from '@ngx-translate/core';
import { MatIconButton } from '@angular/material/button';
import { MatFormField, MatHint, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';

export type BonaInputType =
  | 'text'
  | 'email'
  | 'tel'
  | 'number'
  | 'datetime-local'
  | 'date'
  | 'time'
  | 'password';

const COMPACT_INPUT_TYPES: ReadonlySet<BonaInputType> = new Set([
  'time',
  'date',
  'datetime-local',
  'number',
  'tel',
]);

let nextControlId = 0;

@Component({
  selector: 'app-bona-input-text-field',
  standalone: true,
  imports: [MatFormField, MatHint, MatLabel, MatInput, MatIconButton, MatIcon, MatSuffix],
  templateUrl: './bona-input-text-field.component.html',
  styleUrl: './bona-input-text-field.component.scss',
  host: {
    '[attr.data-input-type]': 'type',
    '[class.bona-input--stacked]': 'isCompact()',
    '[class.bona-input--has-suffix]': 'suffix',
  },
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
  private readonly translate = inject(TranslateService);

  @Input() label = '';
  @Input() placeholder = '';
  @Input() hint = '';
  @Input() suffix = '';
  @Input() value = '';
  @Input() disabled = false;
  @Input() required = false;
  @Input() type: BonaInputType = 'text';
  @Input() inputName = '';
  @Input() autocomplete = '';

  @Output() valueChange = new EventEmitter<string>();

  readonly revealed = signal(false);
  readonly controlId = `bona-input-${++nextControlId}`;

  private onChange: (value: string) => void = () => undefined;
  onTouched: () => void = () => undefined;

  isCompact(): boolean {
    return COMPACT_INPUT_TYPES.has(this.type);
  }

  isPassword(): boolean {
    return this.type === 'password';
  }

  inputType(): BonaInputType {
    return this.isPassword() && this.revealed() ? 'text' : this.type;
  }

  revealLabel(): string {
    return this.translate.instant(this.revealed() ? 'password.hide' : 'password.show');
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
