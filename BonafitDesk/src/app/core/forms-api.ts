import { Observable } from 'rxjs';
import {
  AssignFormDto,
  FormAssignmentDto,
  FormDto,
  FormWriteDto,
  SubmitFormAssignmentDto,
} from '../models/form.dto';

export interface FormsApi {
  getForms(): Observable<FormDto[]>;
  getForm(id: string): Observable<FormDto>;
  createForm(payload: FormWriteDto): Observable<FormDto>;
  updateForm(id: string, payload: FormWriteDto): Observable<FormDto>;
  deleteForm(id: string): Observable<void>;
  assignForm(payload: AssignFormDto): Observable<FormAssignmentDto[]>;
  getAssignments(formId?: string): Observable<FormAssignmentDto[]>;
  getAssignment(id: string): Observable<FormAssignmentDto>;
  getMyAssignments(): Observable<FormAssignmentDto[]>;
  submitAssignment(
    id: string,
    payload: SubmitFormAssignmentDto,
  ): Observable<FormAssignmentDto>;
}
