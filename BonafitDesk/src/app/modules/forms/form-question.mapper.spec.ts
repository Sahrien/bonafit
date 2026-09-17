import {
  encodeFullName,
  encodeOptionIds,
  FORM_YES_VALUE,
  isFullNameComplete,
  isRankingComplete,
  missingRequiredAnswers,
} from '../../core/form-answers';
import { FormQuestionDto } from '../../models/form.dto';
import {
  formatQuestionAnswer,
  FormAnswerLabels,
  questionToField,
} from './form-question.mapper';

const LABELS: FormAnswerLabels = {
  yes: 'Sí',
  no: 'No',
  empty: 'Vacío',
  firstName: 'Nombre',
  lastName: 'Apellidos',
  moveUp: 'Subir',
  moveDown: 'Bajar',
};

describe('form-question.mapper', () => {
  const options = [
    { id: 'a', label: 'Fuerza', sortOrder: 0 },
    { id: 'b', label: 'Movilidad', sortOrder: 1 },
  ];

  it('maps multipleChoice to a checkbox group and formats selected labels', () => {
    const question: FormQuestionDto = {
      id: 'q-multi',
      prompt: 'Objetivos',
      type: 'multipleChoice',
      required: true,
      sortOrder: 0,
      options,
    };
    const field = questionToField(question, LABELS);
    expect(field.type).toBe('checkbox-group');
    expect(formatQuestionAnswer(question, [{ questionId: 'q-multi', value: 'b,a' }], LABELS)).toBe(
      'Movilidad, Fuerza',
    );
  });

  it('maps ranking and formats the ordered labels', () => {
    const question: FormQuestionDto = {
      id: 'q-rank',
      prompt: 'Prioridad',
      type: 'ranking',
      required: true,
      sortOrder: 0,
      options,
    };
    const field = questionToField(question, LABELS);
    expect(field.type).toBe('ranking');
    expect(field.moveUpLabel).toBe(LABELS.moveUp);
    expect(formatQuestionAnswer(question, [{ questionId: 'q-rank', value: 'b,a' }], LABELS)).toBe(
      'Movilidad, Fuerza',
    );
    expect(isRankingComplete(question, encodeOptionIds(['a', 'b']))).toBeTrue();
    expect(isRankingComplete(question, 'a')).toBeFalse();
  });

  it('maps terms to a checkbox and formats yes', () => {
    const question: FormQuestionDto = {
      id: 'q-terms',
      prompt: 'Acepto',
      type: 'terms',
      required: true,
      sortOrder: 0,
    };
    expect(questionToField(question, LABELS).type).toBe('checkbox');
    expect(
      formatQuestionAnswer(question, [{ questionId: 'q-terms', value: FORM_YES_VALUE }], LABELS),
    ).toBe(LABELS.yes);
    expect(missingRequiredAnswers([question], [])).toEqual(['q-terms']);
  });

  it('encodes and formats a full name', () => {
    const question: FormQuestionDto = {
      id: 'q-name',
      prompt: 'Nombre',
      type: 'fullName',
      required: true,
      sortOrder: 0,
    };
    const encoded = encodeFullName({ firstName: 'Marina', lastName: 'Lopez' });
    expect(questionToField(question, LABELS).type).toBe('fullName');
    expect(formatQuestionAnswer(question, [{ questionId: 'q-name', value: encoded }], LABELS)).toBe(
      'Marina Lopez',
    );
    expect(isFullNameComplete(encoded)).toBeTrue();
    expect(missingRequiredAnswers([question], [{ questionId: 'q-name', value: encoded }])).toEqual(
      [],
    );
    expect(
      missingRequiredAnswers(
        [question],
        [{ questionId: 'q-name', value: encodeFullName({ firstName: 'Marina', lastName: '' }) }],
      ),
    ).toEqual(['q-name']);
  });

  it('maps singleChoice to radio and dropdown to select', () => {
    const shared = {
      id: 'q-1',
      prompt: 'Elige',
      required: true,
      sortOrder: 0,
      options,
    };
    expect(questionToField({ ...shared, type: 'singleChoice' }, LABELS).type).toBe('radio');
    expect(questionToField({ ...shared, type: 'dropdown' }, LABELS).type).toBe('select');
  });
});
