import { FormAnswerDto, FormQuestionDto, isFormHeading } from '../models/form.dto';

export const FORM_YES_VALUE = 'yes';
export const FORM_NO_VALUE = 'no';

export interface FormFullNameValue {
  firstName: string;
  lastName: string;
}

export function answersToMap(answers: FormAnswerDto[]): Record<string, string> {
  const next: Record<string, string> = {};
  for (const answer of answers) {
    next[answer.questionId] = answer.value;
  }
  return next;
}

export function mapToAnswers(
  questions: FormQuestionDto[],
  values: Record<string, string>,
): FormAnswerDto[] {
  return questions
    .filter((question) => !isFormHeading(question.type))
    .map((question) => ({
      questionId: question.id,
      value: (values[question.id] ?? '').trim(),
    }))
    .filter((answer) => answer.value.length > 0);
}

export function answerValue(answers: FormAnswerDto[], questionId: string): string {
  return answers.find((answer) => answer.questionId === questionId)?.value ?? '';
}

export function encodeOptionIds(ids: string[]): string {
  return ids.filter((id) => id.length > 0).join(',');
}

export function decodeOptionIds(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function encodeFullName(value: FormFullNameValue): string {
  const firstName = value.firstName.trim();
  const lastName = value.lastName.trim();
  if (!firstName && !lastName) {
    return '';
  }
  return JSON.stringify({ firstName, lastName });
}

export function decodeFullName(value: string): FormFullNameValue {
  const trimmed = value.trim();
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

export function formatFullName(value: string): string {
  const parsed = decodeFullName(value);
  return [parsed.firstName, parsed.lastName].filter((part) => part.length > 0).join(' ');
}

export function isFullNameComplete(value: string): boolean {
  const parsed = decodeFullName(value);
  return parsed.firstName.trim().length > 0 && parsed.lastName.trim().length > 0;
}

export function isRankingComplete(question: FormQuestionDto, value: string): boolean {
  const ids = (question.options ?? []).map((option) => option.id);
  const given = decodeOptionIds(value);
  if (given.length !== ids.length) {
    return false;
  }
  const expected = [...ids].sort().join(',');
  const actual = [...given].sort().join(',');
  return expected === actual;
}

export function missingRequiredAnswers(
  questions: FormQuestionDto[],
  answers: FormAnswerDto[],
): string[] {
  const values = answersToMap(answers);
  return questions
    .filter((question) => {
      if (!question.required || isFormHeading(question.type)) {
        return false;
      }
      const raw = (values[question.id] ?? '').trim();
      if (question.type === 'fullName') {
        return !isFullNameComplete(raw);
      }
      if (question.type === 'ranking') {
        return !isRankingComplete(question, raw);
      }
      if (question.type === 'terms') {
        return raw !== FORM_YES_VALUE;
      }
      return !raw;
    })
    .map((question) => question.id);
}
