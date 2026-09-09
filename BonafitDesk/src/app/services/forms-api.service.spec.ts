import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_PATHS, apiUrl } from '../core/api-url';
import { configureHttpClientTesting } from '../core/http-testing';
import { MOCK_FORM_ASSIGNMENTS, MOCK_FORMS } from '../testing/fixtures';
import { FormWriteDto } from '../models/form.dto';
import { FormsApiService } from './forms-api.service';

describe('FormsApiService', () => {
  let api: FormsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    http = configureHttpClientTesting();
    api = TestBed.inject(FormsApiService);
  });

  afterEach(() => {
    http.verify();
  });

  it('GET /forms', async () => {
    const pending = firstValueFrom(api.getForms());
    const req = http.expectOne({ method: 'GET', url: apiUrl(API_PATHS.forms) });
    req.flush(MOCK_FORMS);
    expect(await pending).toEqual(MOCK_FORMS);
  });

  it('GET /forms/:id', async () => {
    const pending = firstValueFrom(api.getForm('form-1'));
    const req = http.expectOne({
      method: 'GET',
      url: apiUrl(API_PATHS.forms, 'form-1'),
    });
    req.flush(MOCK_FORMS[0]);
    expect(await pending).toEqual(MOCK_FORMS[0]);
  });

  it('POST /forms', async () => {
    const payload: FormWriteDto = {
      title: 'Feedback',
      description: '',
      questions: [],
    };
    const created = { ...payload, id: 'form-9' };
    const pending = firstValueFrom(api.createForm(payload));
    const req = http.expectOne({ method: 'POST', url: apiUrl(API_PATHS.forms) });
    expect(req.request.body).toEqual(payload);
    req.flush(created);
    expect(await pending).toEqual(created);
  });

  it('PUT /forms/:id', async () => {
    const payload: FormWriteDto = {
      title: 'Cuestionario inicial',
      description: 'updated',
      questions: MOCK_FORMS[0].questions,
    };
    const pending = firstValueFrom(api.updateForm('form-1', payload));
    const req = http.expectOne({
      method: 'PUT',
      url: apiUrl(API_PATHS.forms, 'form-1'),
    });
    expect(req.request.body).toEqual(payload);
    req.flush({ ...payload, id: 'form-1' });
    expect((await pending).description).toBe('updated');
  });

  it('DELETE /forms/:id', async () => {
    const pending = firstValueFrom(api.deleteForm('form-1'));
    const req = http.expectOne({
      method: 'DELETE',
      url: apiUrl(API_PATHS.forms, 'form-1'),
    });
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    expect(await pending).toBeNull();
  });

  it('POST /form-assignments', async () => {
    const payload = { formId: 'form-1', clientIds: ['client-3'] };
    const pending = firstValueFrom(api.assignForm(payload));
    const req = http.expectOne({
      method: 'POST',
      url: apiUrl(API_PATHS.formAssignments),
    });
    expect(req.request.body).toEqual(payload);
    req.flush([MOCK_FORM_ASSIGNMENTS[0]]);
    expect((await pending)[0].formId).toBe('form-1');
  });

  it('GET /form-assignments?formId=', async () => {
    const pending = firstValueFrom(api.getAssignments('form-1'));
    const req = http.expectOne(
      (request) =>
        request.method === 'GET' &&
        request.url === apiUrl(API_PATHS.formAssignments) &&
        request.params.get('formId') === 'form-1',
    );
    req.flush(MOCK_FORM_ASSIGNMENTS);
    expect((await pending)[0].clientId).toBe('client-1');
  });

  it('GET /form-assignments/:id', async () => {
    const pending = firstValueFrom(api.getAssignment('fa-1'));
    const req = http.expectOne({
      method: 'GET',
      url: apiUrl(API_PATHS.formAssignments, 'fa-1'),
    });
    req.flush(MOCK_FORM_ASSIGNMENTS[0]);
    expect((await pending).id).toBe('fa-1');
  });

  it('GET /form-assignments?mine=true', async () => {
    const pending = firstValueFrom(api.getMyAssignments());
    const req = http.expectOne(
      (request) =>
        request.method === 'GET' &&
        request.url === apiUrl(API_PATHS.formAssignments) &&
        request.params.get('mine') === 'true',
    );
    req.flush([MOCK_FORM_ASSIGNMENTS[0]]);
    expect((await pending)[0].id).toBe('fa-1');
  });

  it('POST /form-assignments/:id/submit', async () => {
    const payload = { answers: [{ questionId: 'q-1', value: 'no' }] };
    const pending = firstValueFrom(api.submitAssignment('fa-1', payload));
    const req = http.expectOne({
      method: 'POST',
      url: apiUrl(API_PATHS.formAssignments, 'fa-1', 'submit'),
    });
    expect(req.request.body).toEqual(payload);
    req.flush({ ...MOCK_FORM_ASSIGNMENTS[0], status: 'completed', answers: payload.answers });
    expect((await pending).status).toBe('completed');
  });
});
