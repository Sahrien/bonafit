import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_PATHS, apiUrl } from '../core/api-url';
import { FormsApi } from '../core/forms-api';
import { toHttpParams } from '../core/http-params';
import {
  AssignFormDto,
  FormAssignmentDto,
  FormDto,
  FormWriteDto,
  SubmitFormAssignmentDto,
} from '../models/form.dto';

@Injectable({ providedIn: 'root' })
export class FormsHttpApi implements FormsApi {
  private readonly http = inject(HttpClient);

  getForms(): Observable<FormDto[]> {
    return this.http.get<FormDto[]>(apiUrl(API_PATHS.forms));
  }

  getForm(id: string): Observable<FormDto> {
    return this.http.get<FormDto>(apiUrl(API_PATHS.forms, id));
  }

  createForm(payload: FormWriteDto): Observable<FormDto> {
    return this.http.post<FormDto>(apiUrl(API_PATHS.forms), payload);
  }

  updateForm(id: string, payload: FormWriteDto): Observable<FormDto> {
    return this.http.put<FormDto>(apiUrl(API_PATHS.forms, id), payload);
  }

  deleteForm(id: string): Observable<void> {
    return this.http.delete<void>(apiUrl(API_PATHS.forms, id));
  }

  assignForm(payload: AssignFormDto): Observable<FormAssignmentDto[]> {
    return this.http.post<FormAssignmentDto[]>(apiUrl(API_PATHS.formAssignments), payload);
  }

  getAssignments(formId?: string): Observable<FormAssignmentDto[]> {
    return this.http.get<FormAssignmentDto[]>(apiUrl(API_PATHS.formAssignments), {
      params: toHttpParams({ formId }),
    });
  }

  getAssignment(id: string): Observable<FormAssignmentDto> {
    return this.http.get<FormAssignmentDto>(apiUrl(API_PATHS.formAssignments, id));
  }

  getMyAssignments(): Observable<FormAssignmentDto[]> {
    return this.http.get<FormAssignmentDto[]>(apiUrl(API_PATHS.formAssignments), {
      params: toHttpParams({ mine: 'true' }),
    });
  }

  submitAssignment(
    id: string,
    payload: SubmitFormAssignmentDto,
  ): Observable<FormAssignmentDto> {
    return this.http.post<FormAssignmentDto>(
      apiUrl(API_PATHS.formAssignments, id, 'submit'),
      payload,
    );
  }
}
