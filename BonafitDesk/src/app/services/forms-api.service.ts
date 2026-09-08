import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FormsApi } from '../core/forms-api';
import {
  AssignFormDto,
  FormAssignmentDto,
  FormDto,
  FormWriteDto,
  SubmitFormAssignmentDto,
} from '../models/form.dto';
import { FormsHttpApi } from './forms-http.service';
import { FormsMockApi } from './forms-mock.service';

@Injectable({ providedIn: 'root' })
export class FormsApiService implements FormsApi {
  private readonly impl: FormsApi = environment.useMockApi
    ? inject(FormsMockApi)
    : inject(FormsHttpApi);

  getForms(): Observable<FormDto[]> {
    return this.impl.getForms();
  }

  getForm(id: string): Observable<FormDto> {
    return this.impl.getForm(id);
  }

  createForm(payload: FormWriteDto): Observable<FormDto> {
    return this.impl.createForm(payload);
  }

  updateForm(id: string, payload: FormWriteDto): Observable<FormDto> {
    return this.impl.updateForm(id, payload);
  }

  deleteForm(id: string): Observable<void> {
    return this.impl.deleteForm(id);
  }

  assignForm(payload: AssignFormDto): Observable<FormAssignmentDto[]> {
    return this.impl.assignForm(payload);
  }

  getAssignments(formId?: string): Observable<FormAssignmentDto[]> {
    return this.impl.getAssignments(formId);
  }

  getAssignment(id: string): Observable<FormAssignmentDto> {
    return this.impl.getAssignment(id);
  }

  getMyAssignments(): Observable<FormAssignmentDto[]> {
    return this.impl.getMyAssignments();
  }

  submitAssignment(
    id: string,
    payload: SubmitFormAssignmentDto,
  ): Observable<FormAssignmentDto> {
    return this.impl.submitAssignment(id, payload);
  }
}
