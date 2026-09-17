export type BonaFieldControlType =
  | 'text'
  | 'email'
  | 'tel'
  | 'number'
  | 'password'
  | 'datetime-local'
  | 'date'
  | 'time'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'checkbox-group'
  | 'ranking'
  | 'fullName';

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
  firstNameLabel?: string;
  lastNameLabel?: string;
  moveUpLabel?: string;
  moveDownLabel?: string;
}

const TEXT_INPUT_TYPES: ReadonlySet<BonaFieldControlType> = new Set([
  'text',
  'email',
  'tel',
  'number',
  'password',
  'datetime-local',
  'date',
  'time',
]);

export function isBonaTextInputType(
  type: BonaFieldControlType | undefined,
): type is Exclude<
  BonaFieldControlType,
  'textarea' | 'select' | 'radio' | 'checkbox' | 'checkbox-group' | 'ranking' | 'fullName'
> {
  return TEXT_INPUT_TYPES.has(type ?? 'text');
}
