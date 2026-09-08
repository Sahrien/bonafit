import { answerValue, answersToMap, mapToAnswers, missingRequiredAnswers } from './form-answers';
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
});
