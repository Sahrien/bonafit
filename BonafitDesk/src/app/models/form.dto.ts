export type FormQuestionType = 'text' | 'yesno' | 'singleChoice';

export type FormAssignmentStatus = 'pending' | 'completed';

export interface FormQuestionOptionDto {
  id: string;
  label: string;
  sortOrder: number;
}

export interface FormQuestionDto {
  id: string;
  prompt: string;
  type: FormQuestionType;
  required: boolean;
  sortOrder: number;
  options?: FormQuestionOptionDto[];
}

export interface FormDto {
  id: string;
  title: string;
  description: string;
  questions: FormQuestionDto[];
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
  questions: FormQuestionDto[];
  status: FormAssignmentStatus;
  assignedAt: string;
  submittedAt: string | null;
  answers: FormAnswerDto[];
}

export interface AssignFormDto {
  formId: string;
  clientIds: string[];
}

export interface SubmitFormAssignmentDto {
  answers: FormAnswerDto[];
}
