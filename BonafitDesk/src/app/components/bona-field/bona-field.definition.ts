export type BonaFieldControlType =
  | 'text'
  | 'email'
  | 'tel'
  | 'number'
  | 'password'
  | 'datetime-local'
  | 'textarea'
  | 'select';

export interface BonaFieldOption {
  value: string;
  label: string;
}

export interface BonaFieldDefinition {
  key: string;
  label: string;
  type?: BonaFieldControlType;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: BonaFieldOption[];
}

export function isBonaTextInputType(
  type: BonaFieldControlType | undefined,
): type is Exclude<BonaFieldControlType, 'textarea' | 'select'> {
  return type !== 'textarea' && type !== 'select';
}
