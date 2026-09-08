import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { ApiConflictError } from '../core/api-conflict.error';
import { ApiNotFoundError } from '../core/api-not-found.error';
import { missingRequiredAnswers } from '../core/form-answers';
import { FormsApi } from '../core/forms-api';
import { MockStore } from '../core/mock-store.service';
import {
  AssignFormDto,
  FormAssignmentDto,
  FormDto,
  FormWriteDto,
  SubmitFormAssignmentDto,
} from '../models/form.dto';

@Injectable({ providedIn: 'root' })
export class FormsMockApi implements FormsApi {
  private readonly store = inject(MockStore);

  getForms(): Observable<FormDto[]> {
    return of(structuredClone(this.store.forms));
  }

  getForm(id: string): Observable<FormDto> {
    const form = this.store.forms.find((row) => row.id === id);
    if (!form) {
      return throwError(() => new ApiNotFoundError('form', id));
    }
    return of(structuredClone(form));
  }

  createForm(payload: FormWriteDto): Observable<FormDto> {
    const created: FormDto = { ...structuredClone(payload), id: crypto.randomUUID() };
    this.store.forms.push(created);
    return of(structuredClone(created));
  }

  updateForm(id: string, payload: FormWriteDto): Observable<FormDto> {
    const index = this.store.forms.findIndex((row) => row.id === id);
    if (index < 0) {
      return throwError(() => new ApiNotFoundError('form', id));
    }
    const updated: FormDto = { ...structuredClone(payload), id };
    this.store.forms[index] = updated;
    return of(structuredClone(updated));
  }

  deleteForm(id: string): Observable<void> {
    const index = this.store.forms.findIndex((row) => row.id === id);
    if (index < 0) {
      return throwError(() => new ApiNotFoundError('form', id));
    }
    this.store.forms.splice(index, 1);
    return of(undefined);
  }

  assignForm(payload: AssignFormDto): Observable<FormAssignmentDto[]> {
    const form = this.store.forms.find((row) => row.id === payload.formId);
    if (!form) {
      return throwError(() => new ApiNotFoundError('form', payload.formId));
    }

    const created: FormAssignmentDto[] = [];
    for (const clientId of payload.clientIds) {
      const client = this.store.clients.find((row) => row.id === clientId);
      if (!client) {
        return throwError(() => new ApiNotFoundError('client', clientId));
      }
      const alreadyPending = this.store.formAssignments.some(
        (row) =>
          row.formId === form.id && row.clientId === clientId && row.status === 'pending',
      );
      if (alreadyPending) {
        continue;
      }
      const assignment: FormAssignmentDto = {
        id: crypto.randomUUID(),
        formId: form.id,
        clientId,
        title: form.title,
        questions: structuredClone(form.questions),
        status: 'pending',
        assignedAt: new Date().toISOString(),
        submittedAt: null,
        answers: [],
      };
      this.store.formAssignments.push(assignment);
      created.push(assignment);
    }
    return of(structuredClone(created));
  }

  getAssignments(formId?: string): Observable<FormAssignmentDto[]> {
    const rows = formId
      ? this.store.formAssignments.filter((row) => row.formId === formId)
      : this.store.formAssignments;
    return of(structuredClone(rows));
  }

  getAssignment(id: string): Observable<FormAssignmentDto> {
    const assignment = this.findAssignment(id);
    if (!assignment) {
      return throwError(() => new ApiNotFoundError('form-assignment', id));
    }
    if (!this.canAccessAssignment(assignment)) {
      return throwError(() => new ApiNotFoundError('form-assignment', id));
    }
    return of(structuredClone(assignment));
  }

  getMyAssignments(): Observable<FormAssignmentDto[]> {
    const clientId = this.store.session?.user.clientId;
    if (!clientId) {
      return throwError(() => new ApiNotFoundError('session', 'me'));
    }
    return of(
      structuredClone(this.store.formAssignments.filter((row) => row.clientId === clientId)),
    );
  }

  submitAssignment(
    id: string,
    payload: SubmitFormAssignmentDto,
  ): Observable<FormAssignmentDto> {
    const index = this.store.formAssignments.findIndex((row) => row.id === id);
    if (index < 0) {
      return throwError(() => new ApiNotFoundError('form-assignment', id));
    }
    const assignment = this.store.formAssignments[index];
    if (!this.canAccessAssignment(assignment)) {
      return throwError(() => new ApiNotFoundError('form-assignment', id));
    }
    if (assignment.status === 'completed') {
      return throwError(() => new ApiConflictError('form-assignment', id));
    }
    if (missingRequiredAnswers(assignment.questions, payload.answers).length > 0) {
      return throwError(() => new ApiConflictError('form-assignment', id));
    }
    const updated: FormAssignmentDto = {
      ...assignment,
      status: 'completed',
      submittedAt: new Date().toISOString(),
      answers: structuredClone(payload.answers),
    };
    this.store.formAssignments[index] = updated;
    return of(structuredClone(updated));
  }

  private findAssignment(id: string): FormAssignmentDto | undefined {
    return this.store.formAssignments.find((row) => row.id === id);
  }

  private canAccessAssignment(assignment: FormAssignmentDto): boolean {
    const session = this.store.session;
    if (!session || session.user.role !== 'client') {
      return true;
    }
    return session.user.clientId === assignment.clientId;
  }
}
