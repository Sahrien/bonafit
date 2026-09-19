import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, forkJoin } from 'rxjs';
import { BonaButtonComponent } from '../../components/bona-button/bona-button.component';
import { BonaConfirm } from '../../components/bona-confirm/bona-confirm.service';
import { BonaFieldDefinition } from '../../components/bona-field/bona-field.definition';
import { BonaFormComponent, BonaFormValue } from '../../components/bona-form/bona-form.component';
import { BonaPageComponent } from '../../components/bona-page/bona-page.component';
import { BonaToast } from '../../components/bona-toast/bona-toast.service';
import { ApiBusinessError } from '../../core/api-business.error';
import { LanguageService } from '../../core/i18n/language.service';
import { injectI18n } from '../../core/i18n/inject-i18n';
import {
  ACCOUNTING_PRESETS,
  ACCOUNTING_TABS,
  AccountingCategoryDto,
  AccountingEntryDto,
  AccountingEntryWriteDto,
  AccountingKind,
  AccountingPaymentMethod,
  AccountingPaymentStatus,
  AccountingPreset,
  AccountingReportDto,
  AccountingReportKind,
  AccountingSettingsDto,
  AccountingSummaryDto,
  AccountingTab,
  EMPTY_SUMMARY,
  isAccountingPreset,
} from '../../models/accounting.dto';
import { AccountingApiService } from '../../services/accounting-api.service';
import { AccountingLeaveHost } from './accounting.leave-guard';

export const ACCOUNTING_PRESET_STORAGE_KEY = 'bona.admin.accounting.preset';

@Component({
  selector: 'app-accounting',
  standalone: true,
  imports: [BonaPageComponent, BonaButtonComponent, BonaFormComponent],
  templateUrl: './accounting.component.html',
  styleUrl: './accounting.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:beforeunload)': 'onBeforeUnload($event)',
  },
})
export class AccountingComponent implements AccountingLeaveHost {
  private readonly api = inject(AccountingApiService);
  private readonly toast = inject(BonaToast);
  private readonly confirm = inject(BonaConfirm);
  private readonly destroyRef = inject(DestroyRef);
  private readonly language = inject(LanguageService);
  private readonly i18n = injectI18n('accounting');

  get literals() {
    return this.i18n();
  }

  readonly presets = ACCOUNTING_PRESETS;
  readonly tabs = ACCOUNTING_TABS;
  readonly loading = signal(true);
  readonly preset = signal<AccountingPreset>(readStoredPreset());
  readonly tab = signal<AccountingTab>('summary');
  readonly summary = signal<AccountingSummaryDto | null>(null);
  readonly entries = signal<AccountingEntryDto[]>([]);
  readonly categories = signal<AccountingCategoryDto[]>([]);
  readonly settings = signal<AccountingSettingsDto | null>(null);
  readonly report = signal<AccountingReportDto | null>(null);
  readonly formOpen = signal(false);
  readonly formKind = signal<AccountingKind>('income');
  readonly editingId = signal<string | null>(null);
  readonly formValue = signal<BonaFormValue>({});
  readonly formDirty = signal(false);
  readonly settingsDirty = signal(false);
  readonly settingsForm = signal<BonaFormValue>({});
  readonly query = signal('');
  readonly filterCategory = signal('');
  readonly filterStatus = signal('');
  readonly filterMethod = signal('');
  readonly newCategoryName = signal('');

  readonly empty = computed(() => {
    const summary = this.summary();
    if (!summary) {
      return false;
    }
    return summary.kpis.income === 0 && summary.kpis.expense === 0;
  });
  readonly showVat = computed(() => {
    const kpis = this.summary()?.kpis;
    if (!kpis) {
      return false;
    }
    return kpis.vatCollected !== 0 || kpis.vatDeductible !== 0 || kpis.vatNet !== 0;
  });
  readonly seriesMax = computed(() =>
    (this.summary()?.series ?? []).reduce((max, point) => Math.max(max, point.income, point.expense), 0),
  );
  readonly breakdownMax = computed(() =>
    (this.summary()?.breakdown ?? []).reduce((max, item) => Math.max(max, item.amount), 0),
  );
  readonly incomeCategories = computed(() =>
    this.categories().filter((item) => item.kind === 'income' && item.active),
  );
  readonly expenseCategories = computed(() =>
    this.categories().filter((item) => item.kind === 'expense' && item.active),
  );
  readonly periodMonths = computed(() => buildMonthOptions());

  constructor() {
    this.loadAll();
  }

  presetLabel(preset: AccountingPreset): string {
    return this.literals.presets[preset];
  }

  tabLabel(tab: AccountingTab): string {
    const labels = {
      summary: this.literals.tabSummary,
      income: this.literals.tabIncome,
      expense: this.literals.tabExpense,
      reports: this.literals.tabReports,
      settings: this.literals.tabSettings,
    };
    return labels[tab];
  }

  onPreset(preset: AccountingPreset): void {
    if (this.preset() === preset) {
      return;
    }
    this.preset.set(preset);
    persistPreset(preset);
    this.loadAll();
  }

  onPresetSelect(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (isAccountingPreset(value)) {
      this.onPreset(value);
    }
  }

  onTab(tab: AccountingTab): void {
    if (this.tab() === tab) {
      return;
    }
    if (this.formDirty() || this.settingsDirty()) {
      this.confirm
        .open({
          title: this.literals.confirmLeaveTitle,
          message: this.literals.confirmLeaveMessage,
          confirmLabel: this.literals.confirmLeaveConfirm,
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((ok) => {
          if (ok) {
            this.formDirty.set(false);
            this.settingsDirty.set(false);
            this.formOpen.set(false);
            this.applyTab(tab);
          }
        });
      return;
    }
    this.applyTab(tab);
  }

  money(value: number): string {
    return new Intl.NumberFormat(this.language.locale(), {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(value);
  }

  signedMoney(value: number): string {
    const formatted = this.money(Math.abs(value));
    if (value > 0) {
      return `+${formatted}`;
    }
    if (value < 0) {
      return `−${formatted}`;
    }
    return formatted;
  }

  barPercent(value: number, max: number): string {
    if (max <= 0 || value <= 0) {
      return '0%';
    }
    return `${Math.max(8, Math.round((value / max) * 100))}%`;
  }

  statusLabel(status: AccountingPaymentStatus): string {
    return {
      paid: this.literals.statusPaid,
      pending: this.literals.statusPending,
      partial: this.literals.statusPartial,
    }[status];
  }

  methodLabel(method: AccountingPaymentMethod): string {
    return {
      cash: this.literals.methodCash,
      transfer: this.literals.methodTransfer,
      bizum: this.literals.methodBizum,
      pos: this.literals.methodPos,
      other: this.literals.methodOther,
    }[method];
  }

  entryFields(): BonaFieldDefinition[] {
    const kind = this.formKind();
    const categories = kind === 'income' ? this.incomeCategories() : this.expenseCategories();
    const fields: BonaFieldDefinition[] = [
      { key: 'date', label: this.literals.date, type: 'datetime-local', required: true },
      { key: 'concept', label: this.literals.concept, required: true },
      {
        key: 'categoryId',
        label: this.literals.category,
        type: 'select',
        required: true,
        options: categories.map((item) => ({ value: item.id, label: item.name })),
      },
      { key: 'counterpartyName', label: this.literals.counterparty },
      { key: 'amount', label: this.literals.amount, type: 'number', required: true, suffix: '€' },
      { key: 'vatRate', label: this.literals.vatRate, type: 'number' },
      {
        key: 'paymentStatus',
        label: this.literals.status,
        type: 'select',
        options: [
          { value: 'paid', label: this.literals.statusPaid },
          { value: 'pending', label: this.literals.statusPending },
          { value: 'partial', label: this.literals.statusPartial },
        ],
      },
      {
        key: 'paymentMethod',
        label: this.literals.method,
        type: 'select',
        options: [
          { value: 'cash', label: this.literals.methodCash },
          { value: 'transfer', label: this.literals.methodTransfer },
          { value: 'bizum', label: this.literals.methodBizum },
          { value: 'pos', label: this.literals.methodPos },
          { value: 'other', label: this.literals.methodOther },
        ],
      },
      { key: 'notes', label: this.literals.notes, type: 'textarea' },
    ];
    if (kind === 'expense') {
      fields.push({ key: 'recurring', label: this.literals.recurring, type: 'checkbox' });
      fields.push({ key: 'recurringDay', label: this.literals.recurringDay, type: 'number' });
    }
    return fields;
  }

  settingsFields(): BonaFieldDefinition[] {
    return [
      { key: 'legalName', label: this.literals.legalName, required: true },
      { key: 'taxId', label: this.literals.taxId },
      { key: 'address', label: this.literals.address, type: 'textarea' },
      {
        key: 'vatRegime',
        label: this.literals.vatRegime,
        type: 'select',
        options: [
          { value: 'unknown', label: this.literals.vatUnknown },
          { value: 'taxable', label: this.literals.vatTaxable },
          { value: 'exempt', label: this.literals.vatExempt },
        ],
      },
      { key: 'defaultVatRate', label: this.literals.defaultVatRate, type: 'number' },
      { key: 'defaultRecurringDay', label: this.literals.defaultRecurringDay, type: 'number' },
    ];
  }

  onFormChange(value: BonaFormValue): void {
    this.formValue.set(value);
    this.formDirty.set(true);
  }

  onSettingsChange(value: BonaFormValue): void {
    this.settingsForm.set(value);
    this.settingsDirty.set(true);
  }

  openCreate(kind: AccountingKind): void {
    this.formKind.set(kind);
    this.editingId.set(null);
    const categories = kind === 'income' ? this.incomeCategories() : this.expenseCategories();
    const vat =
      this.settings()?.vatRegime === 'taxable' ? String(this.settings()?.defaultVatRate ?? 0) : '0';
    this.formValue.set({
      date: toLocalInput(new Date().toISOString()),
      concept: '',
      categoryId: categories[0]?.id ?? '',
      counterpartyName: '',
      amount: '',
      vatRate: vat,
      paymentStatus: 'paid',
      paymentMethod: 'other',
      notes: '',
      recurring: '',
      recurringDay: String(this.settings()?.defaultRecurringDay ?? 1),
    });
    this.formOpen.set(true);
    this.formDirty.set(false);
    this.tab.set(kind === 'income' ? 'income' : 'expense');
  }

  openEdit(entry: AccountingEntryDto): void {
    this.formKind.set(entry.type);
    this.editingId.set(entry.id);
    this.formValue.set({
      date: toLocalInput(entry.date),
      concept: entry.concept,
      categoryId: entry.categoryId,
      counterpartyName: entry.counterpartyName,
      amount: String(entry.amount),
      vatRate: String(entry.vatRate),
      paymentStatus: entry.paymentStatus,
      paymentMethod: entry.paymentMethod,
      notes: entry.notes,
      recurring: entry.recurring ? 'true' : '',
      recurringDay: String(entry.recurringDay ?? 1),
    });
    this.formOpen.set(true);
    this.formDirty.set(false);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.formDirty.set(false);
    this.editingId.set(null);
  }

  saveEntry(value: BonaFormValue): void {
    const payload = this.payloadFromForm(value);
    const id = this.editingId();
    const request = id ? this.api.patchEntry(id, payload) : this.api.createEntry(payload);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success(this.literals.saved);
        this.closeForm();
        this.loadAll();
      },
      error: (error: unknown) => this.toast.error(this.saveError(error)),
    });
  }

  deleteCurrent(): void {
    const id = this.editingId();
    if (!id) {
      return;
    }
    this.api
      .deleteEntry(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success(this.literals.deleted);
          this.closeForm();
          this.loadAll();
        },
        error: (error: unknown) => this.toast.error(this.saveError(error)),
      });
  }

  onSync(): void {
    this.api
      .syncSales()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success(this.literals.synced);
          this.loadAll();
        },
        error: (error: unknown) => this.toast.error(this.syncError(error)),
      });
  }

  onRecurring(): void {
    const now = new Date();
    this.api
      .generateRecurring(now.getFullYear(), now.getMonth() + 1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success(this.literals.recurringDone);
          this.loadAll();
        },
        error: (error: unknown) => this.toast.error(this.saveError(error)),
      });
  }

  onQuery(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.loadEntries();
  }

  onFilterCategory(event: Event): void {
    this.filterCategory.set((event.target as HTMLSelectElement).value);
    this.loadEntries();
  }

  onFilterStatus(event: Event): void {
    this.filterStatus.set((event.target as HTMLSelectElement).value);
    this.loadEntries();
  }

  onFilterMethod(event: Event): void {
    this.filterMethod.set((event.target as HTMLSelectElement).value);
    this.loadEntries();
  }

  viewNamedReport(kind: string): void {
    this.viewReport(kind as AccountingReportKind);
  }

  downloadNamed(kind: string, format: 'xlsx' | 'pdf'): void {
    this.download(kind as AccountingReportKind, format);
  }

  addNamedCategory(kind: string): void {
    this.addCategory(kind as AccountingKind);
  }

  viewReport(kind: AccountingReportKind): void {
    this.api
      .getReport(kind, this.preset())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (report) => this.report.set(report),
        error: (error: unknown) => this.toast.error(this.loadError(error)),
      });
  }

  download(kind: AccountingReportKind, format: 'xlsx' | 'pdf'): void {
    this.api
      .downloadReport(kind, this.preset(), format)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          saveBlob(blob, `contabilidad.${format}`);
          this.toast.success(this.literals.exported);
        },
        error: (error: unknown) => this.toast.error(this.exportError(error)),
      });
  }

  saveSettings(value: BonaFormValue): void {
    this.api
      .updateSettings({
        legalName: value['legalName'] ?? '',
        taxId: value['taxId'] || null,
        address: value['address'] || null,
        vatRegime: (value['vatRegime'] as AccountingSettingsDto['vatRegime']) || 'unknown',
        defaultVatRate: Number(value['defaultVatRate'] || 0),
        defaultRecurringDay: Number(value['defaultRecurringDay'] || 1),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (settings) => {
          this.settings.set(settings);
          this.settingsDirty.set(false);
          this.toast.success(this.literals.saved);
        },
        error: (error: unknown) => this.toast.error(this.saveError(error)),
      });
  }

  addCategory(kind: AccountingKind): void {
    const name = this.newCategoryName().trim();
    if (!name) {
      return;
    }
    this.api
      .createCategory({ kind, name })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.newCategoryName.set('');
          this.toast.success(this.literals.saved);
          this.loadCategories();
        },
        error: (error: unknown) => this.toast.error(this.saveError(error)),
      });
  }

  deactivateCategory(id: string): void {
    this.api
      .patchCategory(id, { active: false })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadCategories(),
        error: (error: unknown) => this.toast.error(this.saveError(error)),
      });
  }

  isLocked(year: number, month: number): boolean {
    return (this.settings()?.locks ?? []).some((item) => item.year === year && item.month === month);
  }

  toggleLock(year: number, month: number): void {
    const locked = this.isLocked(year, month);
    const request = locked
      ? this.api.unlockPeriod({ year, month })
      : this.api.lockPeriod({ year, month });
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (locks) => {
        const current = this.settings();
        if (current) {
          this.settings.set({ ...current, locks });
        }
        this.toast.success(locked ? this.literals.unlocked : this.literals.locked);
      },
      error: (error: unknown) => this.toast.error(this.saveError(error)),
    });
  }

  lockQuarterLabel(quarter: number): string {
    return `${this.literals.quarter}${quarter}`;
  }

  lockQuarter(quarter: number): void {
    const year = new Date().getFullYear();
    this.api
      .lockPeriod({ year, quarter })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (locks) => {
          const current = this.settings();
          if (current) {
            this.settings.set({ ...current, locks });
          }
          this.toast.success(this.literals.locked);
        },
        error: (error: unknown) => this.toast.error(this.saveError(error)),
      });
  }

  confirmLeaveIfDirty(): boolean | Observable<boolean> {
    if (!this.formDirty() && !this.settingsDirty()) {
      return true;
    }
    return this.confirm.open({
      title: this.literals.confirmLeaveTitle,
      message: this.literals.confirmLeaveMessage,
      confirmLabel: this.literals.confirmLeaveConfirm,
    });
  }

  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.formDirty() && !this.settingsDirty()) {
      return;
    }
    event.preventDefault();
    event.returnValue = true;
  }

  onCategoryName(event: Event): void {
    this.newCategoryName.set((event.target as HTMLInputElement).value);
  }

  private applyTab(tab: AccountingTab): void {
    this.tab.set(tab);
    this.formOpen.set(false);
    if (tab === 'income' || tab === 'expense') {
      this.loadEntries();
    }
  }

  private payloadFromForm(value: BonaFormValue): AccountingEntryWriteDto {
    const date = fromLocalInput(value['date'] ?? '');
    return {
      type: this.formKind(),
      date,
      concept: value['concept'] ?? '',
      notes: value['notes'] ?? '',
      categoryId: value['categoryId'] ?? '',
      counterpartyName: value['counterpartyName'] ?? '',
      amount: Number(value['amount'] || 0),
      vatRate: Number(value['vatRate'] || 0),
      paymentStatus: (value['paymentStatus'] as AccountingPaymentStatus) || 'paid',
      paymentMethod: (value['paymentMethod'] as AccountingPaymentMethod) || 'other',
      recurring: value['recurring'] === 'true' || value['recurring'] === 'on',
      recurringDay: Number(value['recurringDay'] || 0) || null,
    };
  }

  private loadAll(): void {
    this.loading.set(true);
    forkJoin({
      summary: this.api.getSummary(this.preset()),
      categories: this.api.listCategories(),
      settings: this.api.getSettings(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ summary, categories, settings }) => {
          this.summary.set(summary);
          this.categories.set(categories);
          this.settings.set(settings);
          this.settingsForm.set({
            legalName: settings.legalName,
            taxId: settings.taxId ?? '',
            address: settings.address ?? '',
            vatRegime: settings.vatRegime,
            defaultVatRate: String(settings.defaultVatRate),
            defaultRecurringDay: String(settings.defaultRecurringDay),
          });
          this.loading.set(false);
          if (this.tab() === 'income' || this.tab() === 'expense') {
            this.loadEntries();
          }
        },
        error: (error: unknown) => {
          this.summary.set(EMPTY_SUMMARY);
          this.loading.set(false);
          this.toast.error(this.loadError(error));
        },
      });
  }

  private loadEntries(): void {
    const tab = this.tab();
    if (tab !== 'income' && tab !== 'expense') {
      return;
    }
    this.api
      .listEntries({
        type: tab,
        preset: this.preset(),
        q: this.query() || undefined,
        categoryId: this.filterCategory() || undefined,
        status: (this.filterStatus() || undefined) as AccountingPaymentStatus | undefined,
        method: (this.filterMethod() || undefined) as AccountingPaymentMethod | undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (entries) => this.entries.set(entries),
        error: (error: unknown) => this.toast.error(this.loadError(error)),
      });
  }

  private loadCategories(): void {
    this.api
      .listCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => this.categories.set(categories),
        error: (error: unknown) => this.toast.error(this.loadError(error)),
      });
  }

  private loadError(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return this.literals.errorConnection;
    }
    return this.literals.errorLoad;
  }

  private saveError(error: unknown): string {
    if (error instanceof ApiBusinessError && error.code === 'accounting.periodLocked') {
      return this.literals.errorLocked;
    }
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return this.literals.errorConnection;
    }
    return this.literals.errorSave;
  }

  private syncError(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return this.literals.errorConnection;
    }
    return this.literals.errorSync;
  }

  private exportError(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return this.literals.errorConnection;
    }
    return this.literals.errorExport;
  }
}

function readStoredPreset(): AccountingPreset {
  try {
    return isAccountingPreset(localStorage.getItem(ACCOUNTING_PRESET_STORAGE_KEY))
      ? (localStorage.getItem(ACCOUNTING_PRESET_STORAGE_KEY) as AccountingPreset)
      : '30d';
  } catch {
    return '30d';
  }
}

function persistPreset(preset: AccountingPreset): void {
  try {
    localStorage.setItem(ACCOUNTING_PRESET_STORAGE_KEY, preset);
  } catch {
    return;
  }
}

function toLocalInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string): string {
  if (!value) {
    return new Date().toISOString();
  }
  return new Date(value).toISOString();
}

function saveBlob(blob: Blob, filename: string): void {
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

function buildMonthOptions(): Array<{ year: number; month: number; label: string }> {
  const now = new Date();
  const items: Array<{ year: number; month: number; label: string }> = [];
  for (let offset = 0; offset < 12; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    items.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      label: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    });
  }
  return items;
}
