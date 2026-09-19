import { HttpErrorResponse } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { provideDeskTranslate } from '../../core/i18n/provide-desk-translate';
import { EMPTY_KPIS, EMPTY_SUMMARY } from '../../models/accounting.dto';
import { AccountingApiService } from '../../services/accounting-api.service';
import { provideBonaFeedbackTesting } from '../../testing/bona-feedback';
import { BonaToast } from '../../components/bona-toast/bona-toast.service';
import { AccountingComponent, ACCOUNTING_PRESET_STORAGE_KEY } from './accounting.component';
import { ACCOUNTING_LITERALS } from './accounting.literals';

const EMPTY = {
  ...EMPTY_SUMMARY,
  disclaimer: ACCOUNTING_LITERALS.disclaimer,
};

const MOCK = {
  ...EMPTY,
  kpis: {
    ...EMPTY_KPIS,
    income: 280,
    expense: 80,
    result: 200,
    paidIncome: 280,
  },
  series: [{ bucket: '2026-09-15', income: 280, expense: 80, result: 200 }],
  breakdown: [{ categoryId: 'income-packs', name: 'Bonos y packs', kind: 'income' as const, amount: 280 }],
};

describe('AccountingComponent', () => {
  let api: jasmine.SpyObj<AccountingApiService>;

  beforeEach(async () => {
    localStorage.removeItem(ACCOUNTING_PRESET_STORAGE_KEY);
    api = jasmine.createSpyObj('AccountingApiService', [
      'getSummary',
      'listEntries',
      'listCategories',
      'getSettings',
      'syncSales',
      'createEntry',
      'getReport',
      'downloadReport',
    ]);
    api.getSummary.and.returnValue(of(MOCK));
    api.listCategories.and.returnValue(of([]));
    api.getSettings.and.returnValue(
      of({
        legalName: 'Bonafit',
        taxId: null,
        address: null,
        vatRegime: 'unknown',
        defaultVatRate: 0,
        fiscalYearStartMonth: 1,
        defaultRecurringDay: 1,
        currency: 'EUR',
        notes: null,
        locks: [],
      }),
    );
    api.listEntries.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [AccountingComponent],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideDeskTranslate(),
        provideRouter([{ path: 'admin/contabilidad', component: AccountingComponent }]),
        { provide: AccountingApiService, useValue: api },
        ...provideBonaFeedbackTesting().providers,
      ],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.removeItem(ACCOUNTING_PRESET_STORAGE_KEY);
  });

  it('loads summary KPIs', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/contabilidad', AccountingComponent);
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(ACCOUNTING_LITERALS.title);
    expect(text).toContain(ACCOUNTING_LITERALS.disclaimer);
    expect(text).toContain(ACCOUNTING_LITERALS.paidIncome);
    expect(text).toContain('Bonos y packs');
    expect(harness.routeNativeElement?.querySelector('.page-error')).toBeFalsy();
  });

  it('shows empty state with CTAs', async () => {
    api.getSummary.and.returnValue(of(EMPTY));
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/contabilidad', AccountingComponent);
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(ACCOUNTING_LITERALS.emptyTitle);
    expect(text).toContain(ACCOUNTING_LITERALS.syncSales);
    expect(text).toContain(ACCOUNTING_LITERALS.newExpense);
  });

  it('switches to income tab', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/contabilidad', AccountingComponent);
    clickLabel(harness.routeNativeElement, ACCOUNTING_LITERALS.tabIncome);
    harness.fixture.detectChanges();
    expect(api.listEntries).toHaveBeenCalled();
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(ACCOUNTING_LITERALS.newIncome);
    expect(harness.routeNativeElement?.querySelector('.acc-tabs__item--active')?.textContent?.trim()).toBe(
      ACCOUNTING_LITERALS.tabIncome,
    );
  });

  it('toasts load errors without a page banner', async () => {
    const toast = TestBed.inject(BonaToast) as jasmine.SpyObj<BonaToast>;
    api.getSummary.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Server Error' })),
    );
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/contabilidad', AccountingComponent);
    expect(toast.error).toHaveBeenCalledWith(ACCOUNTING_LITERALS.errorLoad);
    expect(harness.routeNativeElement?.querySelector('.page-error')).toBeFalsy();
  });
});

function clickLabel(root: HTMLElement | null, label: string): void {
  const buttons = Array.from(
    root?.querySelectorAll('.acc-tabs__item, app-bona-button button') ?? [],
  ) as HTMLButtonElement[];
  const match = buttons.find((button) => button.textContent?.trim() === label);
  match?.click();
}
