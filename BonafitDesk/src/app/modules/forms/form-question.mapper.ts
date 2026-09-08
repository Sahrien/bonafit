import { answerValue } from '../../core/form-answers';
import { BonaFieldDefinition } from '../../components/bona-field/bona-field.definition';
import { FormAnswerDto, FormQuestionDto } from '../../models/form.dto';

export const FORM_YES_VALUE = 'yes';
export const FORM_NO_VALUE = 'no';

export interface FormAnswerLabels {
  yes: string;
  no: string;
  empty: string;
}

export function orderedQuestions(questions: FormQuestionDto[]): FormQuestionDto[] {
  return [...questions]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((question) => ({
      ...question,
      options: question.options
        ? [...question.options].sort((left, right) => left.sortOrder - right.sortOrder)
        : undefined,
    }));
}

export function questionsToFields(
  questions: FormQuestionDto[],
  labels: Pick<FormAnswerLabels, 'yes' | 'no'>,
  disabled = false,
): BonaFieldDefinition[] {
  return orderedQuestions(questions).map((question) => questionToField(question, labels, disabled));
}

export function questionToField(
  question: FormQuestionDto,
  labels: Pick<FormAnswerLabels, 'yes' | 'no'>,
  disabled = false,
): BonaFieldDefinition {
  const base = {
    key: question.id,
    label: question.prompt,
    required: question.required,
    disabled,
  };

  if (question.type === 'text') {
    return { ...base, type: 'textarea' as const };
  }

  if (question.type === 'yesno') {
    return {
      ...base,
      type: 'select' as const,
      options: [
        { value: FORM_YES_VALUE, label: labels.yes },
        { value: FORM_NO_VALUE, label: labels.no },
      ],
    };
  }

  return {
    ...base,
    type: 'select' as const,
    options: (question.options ?? []).map((option) => ({
      value: option.id,
      label: option.label,
    })),
  };
}

export function formatQuestionAnswer(
  question: FormQuestionDto,
  answers: FormAnswerDto[],
  labels: FormAnswerLabels,
): string {
  const trimmed = answerValue(answers, question.id).trim();
  if (!trimmed) {
    return labels.empty;
  }
  if (question.type === 'yesno') {
    if (trimmed === FORM_YES_VALUE) {
      return labels.yes;
    }
    if (trimmed === FORM_NO_VALUE) {
      return labels.no;
    }
    return trimmed;
  }
  if (question.type === 'singleChoice') {
    return question.options?.find((option) => option.id === trimmed)?.label ?? trimmed;
  }
  return trimmed;
}

export { missingRequiredAnswers } from '../../core/form-answers';

