export type AccountingPreset = '7d' | '30d' | 'month' | 'quarter' | '90d' | 'year';
export const ACCOUNTING_PRESETS: readonly AccountingPreset[] = [
  '7d',
  '30d',
  'month',
  'quarter',
  '90d',
  'year',
];

export type AccountingTab = 'summary' | 'income' | 'expense' | 'reports' | 'settings';
export const ACCOUNTING_TABS: readonly AccountingTab[] = [
  'summary',
  'income',
  'expense',
  'reports',
  'settings',
];

export type AccountingKind = 'income' | 'expense';
export type AccountingVatRegime = 'unknown' | 'taxable' | 'exempt';
export type AccountingPaymentStatus = 'paid' | 'pending' | 'partial';
export type AccountingPaymentMethod = 'cash' | 'transfer' | 'bizum' | 'pos' | 'other';
export type AccountingReportKind = 'pyg' | 'vat' | 'cash' | 'income-book' | 'expense-book';

export function isAccountingPreset(value: unknown): value is AccountingPreset {
  return ACCOUNTING_PRESETS.includes(value as AccountingPreset);
}

export interface AccountingPeriodLockDto {
  year: number;
  month: number;
}

export interface AccountingSettingsDto {
  legalName: string;
  taxId: string | null;
  address: string | null;
  vatRegime: AccountingVatRegime;
  defaultVatRate: number;
  fiscalYearStartMonth: number;
  defaultRecurringDay: number;
  currency: string;
  notes: string | null;
  locks: AccountingPeriodLockDto[];
}

export interface AccountingSettingsWriteDto {
  legalName: string;
  taxId?: string | null;
  address?: string | null;
  vatRegime: AccountingVatRegime;
  defaultVatRate: number;
  fiscalYearStartMonth?: number;
  defaultRecurringDay: number;
  notes?: string | null;
}

export interface AccountingCategoryDto {
  id: string;
  kind: AccountingKind;
  name: string;
  i18n: Record<string, Record<string, string>>;
  active: boolean;
  sortOrder: number;
  system: boolean;
}

export interface AccountingEntryDto {
  id: string;
  type: AccountingKind;
  date: string;
  concept: string;
  notes: string;
  categoryId: string;
  categoryName: string;
  counterpartyName: string;
  clientId: string | null;
  source: 'manual' | 'client_bono';
  sourceId: string | null;
  amount: number;
  vatRate: number;
  vatAmount: number;
  netAmount: number;
  paymentStatus: AccountingPaymentStatus;
  paidAmount: number;
  paymentMethod: AccountingPaymentMethod;
  recurring: boolean;
  recurringDay: number | null;
  originLabel: string | null;
}

export interface AccountingEntryWriteDto {
  type: AccountingKind;
  date: string;
  concept: string;
  notes?: string;
  categoryId: string;
  counterpartyName?: string;
  amount: number;
  vatRate?: number;
  paymentStatus?: AccountingPaymentStatus;
  paidAmount?: number;
  paymentMethod?: AccountingPaymentMethod;
  recurring?: boolean;
  recurringDay?: number | null;
}

export interface AccountingKpisDto {
  income: number;
  expense: number;
  result: number;
  paidIncome: number;
  pendingIncome: number;
  previousIncome: number;
  previousExpense: number;
  previousResult: number;
  incomeDelta: number;
  expenseDelta: number;
  resultDelta: number;
  vatCollected: number;
  vatDeductible: number;
  vatNet: number;
}

export interface AccountingSeriesPointDto {
  bucket: string;
  income: number;
  expense: number;
  result: number;
}

export interface AccountingBreakdownDto {
  categoryId: string;
  name: string;
  kind: AccountingKind;
  amount: number;
}

export interface AccountingSummaryDto {
  timezone: string;
  preset: AccountingPreset;
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  disclaimer: string;
  kpis: AccountingKpisDto;
  series: AccountingSeriesPointDto[];
  breakdown: AccountingBreakdownDto[];
}

export interface AccountingReportDto {
  kind: AccountingReportKind;
  preset: AccountingPreset;
  from: string;
  to: string;
  title: string;
  disclaimer: string;
  legalName: string;
  kpis: AccountingKpisDto;
  breakdown: AccountingBreakdownDto[];
  entries: AccountingEntryDto[];
}

export const EMPTY_KPIS: AccountingKpisDto = {
  income: 0,
  expense: 0,
  result: 0,
  paidIncome: 0,
  pendingIncome: 0,
  previousIncome: 0,
  previousExpense: 0,
  previousResult: 0,
  incomeDelta: 0,
  expenseDelta: 0,
  resultDelta: 0,
  vatCollected: 0,
  vatDeductible: 0,
  vatNet: 0,
};

export const EMPTY_SUMMARY: AccountingSummaryDto = {
  timezone: 'Europe/Madrid',
  preset: '30d',
  from: '',
  to: '',
  previousFrom: '',
  previousTo: '',
  disclaimer: '',
  kpis: EMPTY_KPIS,
  series: [],
  breakdown: [],
};
