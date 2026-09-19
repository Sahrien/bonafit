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
  answerDisplayItems,
  formatQuestionAnswer,
  FormAnswerLabels,
  groupQuestionsByHeading,
  questionToField,
  questionsToFields,
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

  it('skips headings in fill fields and groups them in answer display', () => {
    const heading: FormQuestionDto = {
      id: 'h-1',
      prompt: 'Salud',
      type: 'heading',
      required: false,
      sortOrder: 0,
    };
    const question: FormQuestionDto = {
      id: 'q-1',
      prompt: 'Lesión',
      type: 'text',
      required: true,
      sortOrder: 1,
    };
    expect(questionsToFields([heading, question], LABELS).map((field) => field.key)).toEqual(['q-1']);
    const items = answerDisplayItems(
      [heading, question],
      [{ questionId: 'q-1', value: 'Molestia de rodilla' }],
      LABELS,
    );
    expect(items[0]).toEqual(
      jasmine.objectContaining({ id: 'h-1', kind: 'heading', prompt: 'Salud', answer: '' }),
    );
    expect(items[1]).toEqual(
      jasmine.objectContaining({
        id: 'q-1',
        kind: 'answer',
        prompt: 'Lesión',
        answer: 'Molestia de rodilla',
      }),
    );
  });

  it('groups questions under headings and can treat long headings as static copy', () => {
    const heading: FormQuestionDto = {
      id: 'h-1',
      prompt: 'Salud',
      type: 'heading',
      required: false,
      sortOrder: 0,
    };
    const legal: FormQuestionDto = {
      id: 'h-legal',
      prompt: 'A'.repeat(90),
      type: 'heading',
      required: false,
      sortOrder: 1,
    };
    const question: FormQuestionDto = {
      id: 'q-1',
      prompt: 'Lesión',
      type: 'text',
      required: true,
      sortOrder: 2,
    };
    const fill = groupQuestionsByHeading([heading, legal, question], {
      longHeadingsAsStatic: true,
    });
    expect(fill.length).toBe(1);
    expect(fill[0].heading?.id).toBe('h-1');
    expect(fill[0].statics.map((item) => item.id)).toEqual(['h-legal']);
    expect(fill[0].questions.map((item) => item.id)).toEqual(['q-1']);

    const template = groupQuestionsByHeading([heading, legal, question]);
    expect(template.length).toBe(2);
    expect(template[1].heading?.id).toBe('h-legal');
  });

  it('inlines the name into a consent heading and hides the name field', () => {
    const heading: FormQuestionDto = {
      id: 'h-consent',
      prompt: 'Consentimiento informado',
      type: 'heading',
      required: false,
      sortOrder: 0,
    };
    const legal: FormQuestionDto = {
      id: 'h-legal',
      prompt: 'Yo, ______________________________, declaro que la información es veraz.'.padEnd(
        90,
        ' ',
      ),
      type: 'heading',
      required: false,
      sortOrder: 1,
    };
    const name: FormQuestionDto = {
      id: 'q-name',
      prompt: 'Nombre y apellidos',
      type: 'shortText',
      required: true,
      sortOrder: 2,
    };
    const terms: FormQuestionDto = {
      id: 'q-terms',
      prompt: 'He leído y acepto el consentimiento informado',
      type: 'terms',
      required: true,
      sortOrder: 3,
    };
    const items = answerDisplayItems(
      [heading, legal, name, terms],
      [
        { questionId: 'q-name', value: 'Ana Pérez' },
        { questionId: 'q-terms', value: FORM_YES_VALUE },
      ],
      LABELS,
    );
    expect(items.map((item) => item.id)).toEqual(['h-consent', 'h-legal', 'q-terms']);
    expect(items[1].prompt).toContain('Yo, Ana Pérez, declaro');
    expect(items[1].prompt).not.toContain('___');
    expect(items.some((item) => item.prompt === 'Nombre y apellidos')).toBeFalse();
  });
});
