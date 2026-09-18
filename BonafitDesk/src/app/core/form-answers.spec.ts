import {
  answerValue,
  answersToMap,
  encodeFullName,
  mapToAnswers,
  missingRequiredAnswers,
} from './form-answers';
import { FormQuestionDto } from '../models/form.dto';

describe('form answers persistence helpers', () => {
  const questions: FormQuestionDto[] = [
    { id: 'q-1', prompt: 'A', type: 'yesno', required: true, sortOrder: 0 },
    { id: 'q-2', prompt: 'B', type: 'text', required: false, sortOrder: 1 },
  ];

  it('round-trips a form value into persistable answer rows', () => {
    const rows = mapToAnswers(questions, { 'q-1': 'yes', 'q-2': '  ' });
    expect(rows).toEqual([{ questionId: 'q-1', value: 'yes' }]);
    expect(answersToMap(rows)).toEqual({ 'q-1': 'yes' });
    expect(answerValue(rows, 'q-2')).toBe('');
  });

  it('detects missing required answers', () => {
    expect(missingRequiredAnswers(questions, [])).toEqual(['q-1']);
    expect(missingRequiredAnswers(questions, [{ questionId: 'q-1', value: 'no' }])).toEqual([]);
  });

  it('skips heading questions when mapping and validating answers', () => {
    const withHeading: FormQuestionDto[] = [
      { id: 'h-1', prompt: 'Salud', type: 'heading', required: true, sortOrder: 0 },
      { id: 'q-1', prompt: 'A', type: 'yesno', required: true, sortOrder: 1 },
    ];
    expect(mapToAnswers(withHeading, { 'h-1': 'ignored', 'q-1': 'yes' })).toEqual([
      { questionId: 'q-1', value: 'yes' },
    ]);
    expect(missingRequiredAnswers(withHeading, [])).toEqual(['q-1']);
  });

  it('requires both parts of a full name', () => {
    const nameQuestion: FormQuestionDto[] = [
      { id: 'q-name', prompt: 'Nombre', type: 'fullName', required: true, sortOrder: 0 },
    ];
    expect(missingRequiredAnswers(nameQuestion, [])).toEqual(['q-name']);
    expect(
      missingRequiredAnswers(nameQuestion, [
        { questionId: 'q-name', value: encodeFullName({ firstName: 'Ana', lastName: 'Ruiz' }) },
      ]),
    ).toEqual([]);
  });
});
