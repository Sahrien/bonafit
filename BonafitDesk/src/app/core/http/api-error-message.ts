import { HttpErrorResponse } from '@angular/common/http';

export type ApiErrorMessageOptions = {
  fallback: string;
  connection: string;
  salePercent: string;
  saveWithField: string;
  fieldLabels: Record<string, string>;
};

type ValidationItem = {
  loc?: unknown;
  msg?: unknown;
};

export function apiErrorMessage(error: unknown, options: ApiErrorMessageOptions): string {
  if (!(error instanceof HttpErrorResponse)) {
    return options.fallback;
  }
  if (error.status === 0) {
    return options.connection;
  }
  if (error.status === 422) {
    return validationMessage(error, options) ?? options.fallback;
  }
  return options.fallback;
}

function validationMessage(
  error: HttpErrorResponse,
  options: ApiErrorMessageOptions,
): string | null {
  const items = validationItems(error);
  if (items.length === 0) {
    return null;
  }
  for (const item of items) {
    if (item.msg.includes('sale percent cannot exceed 100')) {
      return options.salePercent;
    }
  }
  const field = fieldFromLoc(items[0].loc, options.fieldLabels);
  if (field) {
    return options.saveWithField.replace('{{field}}', field);
  }
  return null;
}

function validationItems(error: HttpErrorResponse): Array<{ loc: unknown[]; msg: string }> {
  const detail = (error.error as { detail?: unknown } | null)?.detail;
  if (!Array.isArray(detail)) {
    return [];
  }
  return detail
    .filter((item): item is ValidationItem => !!item && typeof item === 'object')
    .map((item) => ({
      loc: Array.isArray(item.loc) ? item.loc : [],
      msg: typeof item.msg === 'string' ? item.msg : '',
    }));
}

function fieldFromLoc(loc: unknown[], fieldLabels: Record<string, string>): string {
  const keys = loc
    .filter((part): part is string => typeof part === 'string' && part !== 'body')
    .reverse();
  for (const key of keys) {
    if (fieldLabels[key]) {
      return fieldLabels[key];
    }
  }
  return keys[0] ?? '';
}
