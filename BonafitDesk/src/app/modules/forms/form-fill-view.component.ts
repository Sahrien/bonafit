import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { BonaButtonComponent } from '../../components/bona-button/bona-button.component';
import { BonaFieldComponent } from '../../components/bona-field/bona-field.component';
import { BonaFormValue } from '../../components/bona-form/bona-form.component';
import { mapToAnswers, missingRequiredAnswers } from '../../core/form-answers';
import { FormQuestionDto } from '../../models/form.dto';
import { FormFieldLabels, groupQuestionsByHeading, questionToField } from './form-question.mapper';
import { FORMS_LITERALS } from './forms.literals';

export function formFieldAnchorId(questionId: string): string {
  return `form-field-${questionId}`;
}

@Component({
  selector: 'app-form-fill-view',
  standalone: true,
  imports: [BonaButtonComponent, BonaFieldComponent],
  templateUrl: './form-fill-view.component.html',
  styleUrl: './form-fill-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormFillViewComponent {
  readonly banner = input('');
  readonly description = input('');
  readonly questions = input<FormQuestionDto[]>([]);
  readonly labels = input.required<FormFieldLabels>();
  readonly value = input<BonaFormValue>({});
  readonly submitText = input('Enviar');
  readonly saveText = input('');
  readonly disabled = input(false);
  readonly error = input('');
  readonly requiredError = input(FORMS_LITERALS.requiredError);
  readonly valueChange = output<BonaFormValue>();
  readonly submitted = output<BonaFormValue>();
  readonly saved = output<BonaFormValue>();

  readonly missingFields = signal<{ id: string; prompt: string }[]>([]);

  readonly blocks = computed(() =>
    groupQuestionsByHeading(this.questions(), { longHeadingsAsStatic: true }),
  );

  fieldOf(question: FormQuestionDto) {
    return questionToField(question, this.labels(), this.disabled());
  }

  fieldValue(key: string): string {
    return this.value()[key] ?? '';
  }

  fieldAnchor(questionId: string): string {
    return formFieldAnchorId(questionId);
  }

  onFieldValue(key: string, fieldValue: string): void {
    this.valueChange.emit({
      ...this.value(),
      [key]: fieldValue,
    });
  }

  onSave(): void {
    if (this.disabled()) {
      return;
    }
    this.missingFields.set([]);
    this.saved.emit({ ...this.value() });
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (this.disabled()) {
      return;
    }
    const value = { ...this.value() };
    const missingIds = missingRequiredAnswers(this.questions(), mapToAnswers(this.questions(), value));
    if (missingIds.length > 0) {
      const byId = new Map(this.questions().map((question) => [question.id, question]));
      this.missingFields.set(
        missingIds.map((id) => ({
          id,
          prompt: byId.get(id)?.prompt || id,
        })),
      );
      setTimeout(() => this.focusField(missingIds[0]));
      return;
    }
    this.missingFields.set([]);
    this.submitted.emit(value);
  }

  focusField(questionId: string): void {
    const root = document.getElementById(this.fieldAnchor(questionId));
    root?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const control = root?.querySelector<HTMLElement>(
      'input:not([type="hidden"]), textarea, select, [tabindex]:not([tabindex="-1"])',
    );
    control?.focus({ preventScroll: true });
  }
}
