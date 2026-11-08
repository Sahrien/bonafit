import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
  MatAutocompleteTrigger,
} from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { brandFontLabel, brandFontStack } from '../../core/font-catalog';

export interface BonaFontOption {
  id: string;
  label: string;
  stack: string;
}

@Component({
  selector: 'app-bona-font-picker',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './bona-font-picker.component.html',
  styleUrl: './bona-font-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BonaFontPickerComponent {
  readonly label = input('');
  readonly placeholder = input('Buscar fuente…');
  readonly emptyLabel = input('Sin resultados');
  readonly value = input('inter');
  readonly fonts = input<readonly BonaFontOption[]>([]);
  readonly valueChange = output<string>();

  private readonly autocompleteTrigger = viewChild(MatAutocompleteTrigger);
  readonly control = new FormControl<string>('', { nonNullable: true });
  readonly query = signal('');

  readonly selected = computed(() => this.fonts().find((font) => font.id === this.value()));
  readonly selectedStack = computed(
    () => this.selected()?.stack ?? brandFontStack(this.value()),
  );
  readonly displayFont = (value: string | null): string => {
    if (!value) {
      return '';
    }
    const font = this.fonts().find((item) => item.id === value);
    return font?.label ?? (brandFontLabel(value) || value);
  };
  readonly filtered = computed(() => {
    const term = this.query().trim().toLowerCase();
    const selected = this.selected();
    if (
      !term ||
      term === selected?.id.toLowerCase() ||
      term === selected?.label.toLowerCase()
    ) {
      return this.fonts();
    }
    return this.fonts().filter(
      (font) =>
        font.label.toLowerCase().includes(term) || font.id.toLowerCase().includes(term),
    );
  });

  constructor() {
    effect(() => {
      const id = this.selected()?.id ?? this.value();
      this.control.setValue(id, { emitEvent: false });
      this.query.set(id);
    });
  }

  open(): void {
    this.autocompleteTrigger()?.openPanel();
  }

  onInput(): void {
    this.query.set(this.control.value);
  }

  onSelected(event: MatAutocompleteSelectedEvent): void {
    const id = String(event.option.value ?? '');
    if (!id) {
      return;
    }
    this.query.set(id);
    this.valueChange.emit(id);
  }

  onBlur(): void {
    const term = this.control.value.trim().toLowerCase();
    const match = this.fonts().find(
      (font) => font.id.toLowerCase() === term || font.label.toLowerCase() === term,
    );
    const id = match?.id ?? this.selected()?.id ?? this.value();
    this.control.setValue(id, { emitEvent: false });
    this.query.set(id);
    if (match && match.id !== this.value()) {
      this.valueChange.emit(match.id);
    }
  }
}
