import { FormAnswerDto, FormQuestionDto } from '../models/form.dto';

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
    .map((question) => ({
      questionId: question.id,
      value: (values[question.id] ?? '').trim(),
    }))
    .filter((answer) => answer.value.length > 0);
}

export function answerValue(answers: FormAnswerDto[], questionId: string): string {
  return answers.find((answer) => answer.questionId === questionId)?.value ?? '';
}

export function missingRequiredAnswers(
  questions: FormQuestionDto[],
  answers: FormAnswerDto[],
): string[] {
  const values = answersToMap(answers);
  return questions
    .filter((question) => question.required && !(values[question.id] ?? '').trim())
    .map((question) => question.id);
}
