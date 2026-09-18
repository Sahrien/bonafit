import { ChangeDetectionStrategy, Component, computed, effect, input, output, untracked } from '@angular/core';
import { MatCheckbox, MatCheckboxChange } from '@angular/material/checkbox';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatRadioButton, MatRadioChange, MatRadioGroup } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { BonaButtonComponent } from '../bona-button/bona-button.component';
import {
  BonaInputTextFieldComponent,
  BonaInputType,
} from '../bona-input-text-field/bona-input-text-field.component';
import {
  BonaFieldDefinition,
  BonaFieldOption,
  isBonaTextInputType,
} from './bona-field.definition';

const YES_VALUE = 'yes';

@Component({
  selector: 'app-bona-field',
  standalone: true,
  imports: [
    BonaButtonComponent,
    BonaInputTextFieldComponent,
    MatCheckbox,
    MatFormField,
    MatLabel,
    MatInput,
    MatRadioButton,
    MatRadioGroup,
    MatSelectModule,
  ],
  templateUrl: './bona-field.component.html',
  styleUrl: './bona-field.component.scss',
  host: {
    '[class.bona-field--capped]': 'cappedWidth()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BonaFieldComponent {
  readonly definition = input.required<BonaFieldDefinition>();
  readonly value = input('');
  readonly valueChange = output<string>();

  protected readonly isTextInput = isBonaTextInputType;

  readonly cappedWidth = computed(() => {
    const type = this.definition().type ?? 'text';
    return type === 'text' || type === 'select';
  });

  readonly rankedOptions = computed(() => this.orderOptions(this.definition().options ?? []));

  readonly fullName = computed(() => this.parseFullName(this.value()));

  private readonly seededRankingKeys = new Set<string>();

  constructor() {
    effect(() => {
      const definition = this.definition();
      const value = this.value();
      const options = definition.options ?? [];
      if (definition.type !== 'ranking' || value || options.length === 0) {
        return;
      }
      if (this.seededRankingKeys.has(definition.key)) {
        return;
      }
      this.seededRankingKeys.add(definition.key);
      untracked(() => this.valueChange.emit(options.map((option) => option.value).join(',')));
    });
  }

  textInputType(type: BonaFieldDefinition['type']): BonaInputType {
    if (!type || !isBonaTextInputType(type)) {
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

  onRadioChange(event: MatRadioChange): void {
    this.onValueChange(String(event.value ?? ''));
  }

  onTermsChange(event: MatCheckboxChange): void {
    this.onValueChange(event.checked ? YES_VALUE : '');
  }

  isOptionSelected(optionValue: string): boolean {
    return this.selectedIds().includes(optionValue);
  }

  onOptionToggle(optionValue: string, event: MatCheckboxChange): void {
    const current = this.selectedIds();
    const next = event.checked
      ? [...current, optionValue]
      : current.filter((id) => id !== optionValue);
    this.onValueChange(next.join(','));
  }

  onMoveRank(index: number, direction: -1 | 1): void {
    const list = [...this.rankedOptions()];
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= list.length) {
      return;
    }
    const [item] = list.splice(index, 1);
    list.splice(nextIndex, 0, item);
    this.onValueChange(list.map((option) => option.value).join(','));
  }

  onFirstNameChange(firstName: string): void {
    this.emitFullName(firstName, this.fullName().lastName);
  }

  onLastNameChange(lastName: string): void {
    this.emitFullName(this.fullName().firstName, lastName);
  }

  isTermsChecked(): boolean {
    return this.value() === YES_VALUE;
  }

  private selectedIds(): string[] {
    return this.value()
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  }

  private orderOptions(options: BonaFieldOption[]): BonaFieldOption[] {
    const order = this.selectedIds();
    if (order.length === 0) {
      return options;
    }
    const byId = new Map(options.map((option) => [option.value, option]));
    const ordered: BonaFieldOption[] = [];
    for (const id of order) {
      const option = byId.get(id);
      if (option) {
        ordered.push(option);
        byId.delete(id);
      }
    }
    for (const leftover of byId.values()) {
      ordered.push(leftover);
    }
    return ordered;
  }

  private parseFullName(raw: string): { firstName: string; lastName: string } {
    const trimmed = raw.trim();
    if (!trimmed) {
      return { firstName: '', lastName: '' };
    }
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const record = parsed as Record<string, unknown>;
        return {
          firstName: String(record['firstName'] ?? ''),
          lastName: String(record['lastName'] ?? ''),
        };
      }
    } catch {
      return { firstName: trimmed, lastName: '' };
    }
    return { firstName: trimmed, lastName: '' };
  }

  private emitFullName(firstName: string, lastName: string): void {
    const first = firstName.trim();
    const last = lastName.trim();
    if (!first && !last) {
      this.onValueChange('');
      return;
    }
    this.onValueChange(JSON.stringify({ firstName: first, lastName: last }));
  }
}
