import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_PATHS, apiUrl } from '../core/api-url';
import { toHttpParams } from '../core/http-params';
import {
  AccountingCategoryDto,
  AccountingEntryDto,
  AccountingEntryWriteDto,
  AccountingKind,
  AccountingPaymentMethod,
  AccountingPaymentStatus,
  AccountingPeriodLockDto,
  AccountingPreset,
  AccountingReportDto,
  AccountingReportKind,
  AccountingSettingsDto,
  AccountingSettingsWriteDto,
  AccountingSummaryDto,
} from '../models/accounting.dto';

@Injectable({ providedIn: 'root' })
export class AccountingApiService {
  private readonly http = inject(HttpClient);

  getSummary(preset: AccountingPreset): Observable<AccountingSummaryDto> {
    return this.http.get<AccountingSummaryDto>(apiUrl(API_PATHS.accounting, 'summary'), {
      params: toHttpParams({ preset }),
    });
  }

  listEntries(query: {
    type?: AccountingKind;
    preset: AccountingPreset;
    q?: string;
    categoryId?: string;
    status?: AccountingPaymentStatus;
    method?: AccountingPaymentMethod;
  }): Observable<AccountingEntryDto[]> {
    return this.http.get<AccountingEntryDto[]>(apiUrl(API_PATHS.accountingEntries), {
      params: toHttpParams({
        type: query.type,
        preset: query.preset,
        q: query.q,
        categoryId: query.categoryId,
        status: query.status,
        method: query.method,
      }),
    });
  }

  createEntry(payload: AccountingEntryWriteDto): Observable<AccountingEntryDto> {
    return this.http.post<AccountingEntryDto>(apiUrl(API_PATHS.accountingEntries), payload);
  }

  patchEntry(id: string, payload: Partial<AccountingEntryWriteDto>): Observable<AccountingEntryDto> {
    return this.http.patch<AccountingEntryDto>(apiUrl(API_PATHS.accountingEntries, id), payload);
  }

  deleteEntry(id: string): Observable<void> {
    return this.http.delete<void>(apiUrl(API_PATHS.accountingEntries, id));
  }

  syncSales(): Observable<{ created: number; skippedExisting: number; skippedLocked: number }> {
    return this.http.post<{ created: number; skippedExisting: number; skippedLocked: number }>(
      apiUrl(API_PATHS.accountingSyncSales),
      {},
    );
  }

  generateRecurring(year: number, month: number): Observable<{ created: number; skippedExisting: number }> {
    return this.http.post<{ created: number; skippedExisting: number }>(
      apiUrl(API_PATHS.accountingRecurring),
      {},
      { params: toHttpParams({ year: String(year), month: String(month) }) },
    );
  }

  getSettings(): Observable<AccountingSettingsDto> {
    return this.http.get<AccountingSettingsDto>(apiUrl(API_PATHS.accountingSettings));
  }

  updateSettings(payload: AccountingSettingsWriteDto): Observable<AccountingSettingsDto> {
    return this.http.put<AccountingSettingsDto>(apiUrl(API_PATHS.accountingSettings), payload);
  }

  listCategories(kind?: AccountingKind): Observable<AccountingCategoryDto[]> {
    return this.http.get<AccountingCategoryDto[]>(apiUrl(API_PATHS.accountingCategories), {
      params: toHttpParams({ kind }),
    });
  }

  createCategory(payload: { kind: AccountingKind; name: string }): Observable<AccountingCategoryDto> {
    return this.http.post<AccountingCategoryDto>(apiUrl(API_PATHS.accountingCategories), payload);
  }

  patchCategory(id: string, payload: { name?: string; active?: boolean }): Observable<AccountingCategoryDto> {
    return this.http.patch<AccountingCategoryDto>(apiUrl(API_PATHS.accountingCategories, id), payload);
  }

  lockPeriod(payload: { year: number; month?: number; quarter?: number }): Observable<AccountingPeriodLockDto[]> {
    return this.http.post<AccountingPeriodLockDto[]>(apiUrl(API_PATHS.accountingLock), payload);
  }

  unlockPeriod(payload: { year: number; month?: number; quarter?: number }): Observable<AccountingPeriodLockDto[]> {
    return this.http.post<AccountingPeriodLockDto[]>(apiUrl(API_PATHS.accountingUnlock), payload);
  }

  getReport(kind: AccountingReportKind, preset: AccountingPreset): Observable<AccountingReportDto> {
    return this.http.get<AccountingReportDto>(apiUrl(API_PATHS.accountingReports, kind), {
      params: toHttpParams({ preset }),
    });
  }

  downloadReport(
    kind: AccountingReportKind,
    preset: AccountingPreset,
    format: 'xlsx' | 'pdf',
  ): Observable<Blob> {
    return this.http.get(apiUrl(API_PATHS.accountingReports, `${kind}.${format}`), {
      params: toHttpParams({ preset }),
      responseType: 'blob',
    });
  }
}
