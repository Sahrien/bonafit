import { CatalogI18n } from './service.dto';

export type FormQuestionType =
  | 'text'
  | 'shortText'
  | 'fullName'
  | 'email'
  | 'phone'
  | 'date'
  | 'number'
  | 'address'
  | 'yesno'
  | 'dropdown'
  | 'singleChoice'
  | 'multipleChoice'
  | 'ranking'
  | 'terms'
  | 'heading';

export const FORM_HEADING_TYPE: FormQuestionType = 'heading';

export const FORM_OPTION_TYPES: ReadonlySet<FormQuestionType> = new Set([
  'dropdown',
  'singleChoice',
  'multipleChoice',
  'ranking',
]);

export function questionHasOptions(type: FormQuestionType): boolean {
  return FORM_OPTION_TYPES.has(type);
}

export function isFormHeading(type: FormQuestionType): boolean {
  return type === FORM_HEADING_TYPE;
}

export type FormAssignmentStatus = 'pending' | 'completed';

export interface FormQuestionOptionDto {
  id: string;
  label: string;
  sortOrder: number;
  i18n?: CatalogI18n;
}

export interface FormQuestionDto {
  id: string;
  prompt: string;
  type: FormQuestionType;
  required: boolean;
  sortOrder: number;
  options?: FormQuestionOptionDto[];
  i18n?: CatalogI18n;
}

export interface FormDto {
  id: string;
  title: string;
  description: string;
  questions: FormQuestionDto[];
  i18n?: CatalogI18n;
}

export type FormWriteDto = Omit<FormDto, 'id'>;

export interface FormAnswerDto {
  questionId: string;
  value: string;
}

export interface FormAssignmentDto {
  id: string;
  formId: string;
  clientId: string;
  title: string;
  description?: string;
  questions: FormQuestionDto[];
  status: FormAssignmentStatus;
  assignedAt: string;
  submittedAt: string | null;
  answers: FormAnswerDto[];
  i18n?: CatalogI18n;
}

export interface AssignFormDto {
  formId: string;
  clientIds: string[];
}

export interface SubmitFormAssignmentDto {
  answers: FormAnswerDto[];
}
