import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ApiConflictError } from '../core/api-conflict.error';
import { ApiNotFoundError } from '../core/api-not-found.error';
import { MOCK_FORMS } from '../core/mock-data';
import { MockStore } from '../core/mock-store.service';
import { FormWriteDto } from '../models/form.dto';
import { AuthMockApi } from './auth-mock.service';
import { FormsMockApi } from './forms-mock.service';

describe('FormsMockApi', () => {
  let api: FormsMockApi;
  let store: MockStore;
  let auth: AuthMockApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(MockStore);
    store.reset();
    api = TestBed.inject(FormsMockApi);
    auth = TestBed.inject(AuthMockApi);
  });

  it('lists seeded forms', async () => {
    const forms = await firstValueFrom(api.getForms());
    expect(forms.map((row) => row.id)).toEqual(MOCK_FORMS.map((row) => row.id));
  });

  it('returns a clone so callers cannot mutate the store', async () => {
    const forms = await firstValueFrom(api.getForms());
    forms[0].title = 'mutated';
    const again = await firstValueFrom(api.getForm('form-1'));
    expect(again.title).toBe('Cuestionario inicial');
  });

  it('creates, updates and deletes a form', async () => {
    const payload: FormWriteDto = {
      title: 'Feedback de sesión',
      description: 'Tras el entrenamiento',
      questions: [
        {
          id: 'nq-1',
          prompt: '¿Cómo te sentiste?',
          type: 'text',
          required: true,
          sortOrder: 0,
        },
      ],
    };
    const created = await firstValueFrom(api.createForm(payload));
    expect(created.id).toBeTruthy();
    expect(created.title).toBe('Feedback de sesión');

    const updated = await firstValueFrom(
      api.updateForm(created.id, { ...payload, description: 'ok' }),
    );
    expect(updated.description).toBe('ok');

    await firstValueFrom(api.deleteForm(created.id));
    await expectAsync(firstValueFrom(api.getForm(created.id))).toBeRejectedWith(
      jasmine.any(ApiNotFoundError),
    );
  });

  it('assigns a snapshot that does not change if the template is edited later', async () => {
    const assigned = await firstValueFrom(
      api.assignForm({ formId: 'form-1', clientIds: ['client-3'] }),
    );
    expect(assigned).toHaveSize(1);
    expect(assigned[0].clientId).toBe('client-3');
    expect(assigned[0].title).toBe('Cuestionario inicial');
    expect(assigned[0].status).toBe('pending');
    expect(assigned[0].questions[0].prompt).toContain('lesión');

    await firstValueFrom(
      api.updateForm('form-1', {
        title: 'Plantilla nueva',
        description: '',
        questions: [
          { id: 'other', prompt: 'Otra pregunta', type: 'text', required: false, sortOrder: 0 },
        ],
      }),
    );

    const assignment = await firstValueFrom(api.getAssignment(assigned[0].id));
    expect(assignment.title).toBe('Cuestionario inicial');
    expect(assignment.questions[0].prompt).toContain('lesión');
  });

  it('skips a second pending assignment to the same client', async () => {
    const again = await firstValueFrom(
      api.assignForm({ formId: 'form-1', clientIds: ['client-1'] }),
    );
    expect(again).toEqual([]);
  });

  it('submits answers and rejects a second submit', async () => {
    await firstValueFrom(auth.login('user-client-1'));
    const answers = [
      { questionId: 'q-1', value: 'no' },
      { questionId: 'q-3', value: 'opt-strength' },
    ];
    const submitted = await firstValueFrom(api.submitAssignment('fa-1', { answers }));
    expect(submitted.status).toBe('completed');
    expect(submitted.answers.find((row) => row.questionId === 'q-3')?.value).toBe('opt-strength');
    expect(submitted.submittedAt).toBeTruthy();

    await expectAsync(
      firstValueFrom(api.submitAssignment('fa-1', { answers })),
    ).toBeRejectedWith(jasmine.any(ApiConflictError));
  });

  it('lists my assignments for the logged client', async () => {
    await firstValueFrom(auth.login('user-client-1'));
    const mine = await firstValueFrom(api.getMyAssignments());
    expect(mine.map((row) => row.id)).toEqual(['fa-1']);
  });
});
