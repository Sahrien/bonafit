import {
  answerValue,
  decodeOptionIds,
  FORM_NO_VALUE,
  FORM_YES_VALUE,
  formatFullName,
} from '../../core/form-answers';
import { BonaFieldControlType, BonaFieldDefinition } from '../../components/bona-field/bona-field.definition';
import { FormAnswerDto, FormQuestionDto } from '../../models/form.dto';

export { FORM_NO_VALUE, FORM_YES_VALUE };

export interface FormAnswerLabels {
  yes: string;
  no: string;
  empty: string;
  firstName: string;
  lastName: string;
  moveUp: string;
  moveDown: string;
}

export type FormFieldLabels = Pick<
  FormAnswerLabels,
  'yes' | 'no' | 'firstName' | 'lastName' | 'moveUp' | 'moveDown'
>;

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
  labels: FormFieldLabels,
  disabled = false,
): BonaFieldDefinition[] {
  return orderedQuestions(questions).map((question) => questionToField(question, labels, disabled));
}

export function questionToField(
  question: FormQuestionDto,
  labels: FormFieldLabels,
  disabled = false,
): BonaFieldDefinition {
  const base = {
    key: question.id,
    label: question.prompt,
    required: question.required,
    disabled,
  };

  switch (question.type) {
    case 'shortText':
      return { ...base, type: 'text' as const };
    case 'email':
      return { ...base, type: 'email' as const };
    case 'phone':
      return { ...base, type: 'tel' as const };
    case 'date':
      return { ...base, type: 'date' as const };
    case 'number':
      return { ...base, type: 'number' as const };
    case 'text':
    case 'address':
      return { ...base, type: 'textarea' as const };
    case 'fullName':
      return {
        ...base,
        type: 'fullName' as const,
        firstNameLabel: labels.firstName,
        lastNameLabel: labels.lastName,
      };
    case 'yesno':
      return {
        ...base,
        type: 'select' as const,
        options: [
          { value: FORM_YES_VALUE, label: labels.yes },
          { value: FORM_NO_VALUE, label: labels.no },
        ],
      };
    case 'dropdown':
      return optionField(question, base, 'select');
    case 'singleChoice':
      return optionField(question, base, 'radio');
    case 'multipleChoice':
      return optionField(question, base, 'checkbox-group');
    case 'ranking':
      return {
        ...optionField(question, base, 'ranking'),
        moveUpLabel: labels.moveUp,
        moveDownLabel: labels.moveDown,
      };
    case 'terms':
      return { ...base, type: 'checkbox' as const };
  }
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
  if (question.type === 'yesno' || question.type === 'terms') {
    if (trimmed === FORM_YES_VALUE) {
      return labels.yes;
    }
    if (trimmed === FORM_NO_VALUE) {
      return labels.no;
    }
    return trimmed;
  }
  if (question.type === 'fullName') {
    return formatFullName(trimmed) || labels.empty;
  }
  if (question.type === 'singleChoice' || question.type === 'dropdown') {
    return question.options?.find((option) => option.id === trimmed)?.label ?? trimmed;
  }
  if (question.type === 'multipleChoice' || question.type === 'ranking') {
    const labelsById = new Map((question.options ?? []).map((option) => [option.id, option.label]));
    const resolved = decodeOptionIds(trimmed).map((id) => labelsById.get(id) ?? id);
    return resolved.join(', ') || labels.empty;
  }
  return trimmed;
}

export { missingRequiredAnswers } from '../../core/form-answers';

function optionField(
  question: FormQuestionDto,
  base: { key: string; label: string; required: boolean; disabled: boolean },
  type: Extract<BonaFieldControlType, 'select' | 'radio' | 'checkbox-group' | 'ranking'>,
): BonaFieldDefinition {
  return {
    ...base,
    type,
    options: (question.options ?? []).map((option) => ({
      value: option.id,
      label: option.label,
    })),
  };
}
