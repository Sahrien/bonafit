import { provideDeskTranslate } from '../../core/i18n/provide-desk-translate';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { routes } from '../../app.routes';
import { AUTH_PATHS } from '../../core/auth/auth.paths';
import { AuthApiService } from '../../services/auth-api.service';
import { CalendarApiService } from '../../services/calendar-api.service';
import { provideBonaFeedbackTesting } from '../../testing/bona-feedback';
import {
  MOCK_ACCOUNTS,
  MOCK_TRAINERS,
  MOCK_TRAINER_SCHEDULES,
  createMockSession,
} from '../../testing/fixtures';
import { SCHEDULES_LITERALS } from '../schedules/schedules.literals';
import { AccountingApiService } from '../../services/accounting-api.service';
import { StatsApiService } from '../../services/stats-api.service';
import { ACCOUNTING_LITERALS } from '../accounting/accounting.literals';
import { STATS_LITERALS } from '../stats/stats.literals';

describe('ADMIN_ROUTES horarios', () => {
  beforeEach(async () => {
    const auth = jasmine.createSpyObj('AuthApiService', ['getSession', 'logout']);
    auth.getSession.and.returnValue(of(createMockSession(MOCK_ACCOUNTS[0])));
    const calendarApi = jasmine.createSpyObj('CalendarApiService', [
      'getTrainers',
      'getTrainerSchedules',
    ]);
    calendarApi.getTrainers.and.returnValue(of(MOCK_TRAINERS));
    calendarApi.getTrainerSchedules.and.returnValue(of(MOCK_TRAINER_SCHEDULES));
    const statsApi = jasmine.createSpyObj('StatsApiService', ['getStats']);
    const accountingApi = jasmine.createSpyObj('AccountingApiService', [
      'getSummary',
      'listCategories',
      'getSettings',
      'listEntries',
    ]);
    accountingApi.getSummary.and.returnValue(
      of({
        timezone: 'Europe/Madrid',
        preset: '30d',
        from: '2026-08-21T00:00:00.000Z',
        to: '2026-09-20T00:00:00.000Z',
        previousFrom: '2026-07-22T00:00:00.000Z',
        previousTo: '2026-08-21T00:00:00.000Z',
        disclaimer: ACCOUNTING_LITERALS.disclaimer,
        kpis: {
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
        },
        series: [],
        breakdown: [],
      }),
    );
    accountingApi.listCategories.and.returnValue(of([]));
    accountingApi.getSettings.and.returnValue(
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
    accountingApi.listEntries.and.returnValue(of([]));
    statsApi.getStats.and.returnValue(
      of({
        timezone: 'Europe/Madrid',
        preset: '30d',
        from: '2026-08-21T00:00:00.000Z',
        to: '2026-09-20T00:00:00.000Z',
        previousFrom: '2026-07-22T00:00:00.000Z',
        previousTo: '2026-08-21T00:00:00.000Z',
        economy: {
          paidRevenue: 0,
          previousPaidRevenue: 0,
          revenueDelta: 0,
          averageTicket: 0,
          discountRate: null,
          paidCount: 0,
          previousPaidCount: 0,
          series: [],
          ranking: [],
          mix: {
            packs: { units: 0, paidRevenue: 0 },
            singles: { units: 0, paidRevenue: 0 },
            gifts: { units: 0, paidRevenue: 0 },
          },
        },
        agenda: {
          appointmentCount: 0,
          previousAppointmentCount: 0,
          occupancyRate: null,
          previousOccupancyRate: null,
          heatmap: [],
          heatmapHours: [],
          statuses: [],
          trainers: [],
          emptySlots: [],
        },
        clients: {
          activeCount: 0,
          previousActiveCount: 0,
          newCount: 0,
          previousNewCount: 0,
          recurringCount: 0,
          previousRecurringCount: 0,
          formsPending: 0,
          formsCompleted: 0,
          previousFormsCompleted: 0,
          atRisk: [],
        },
      }),
    );

    await TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        provideDeskTranslate(),
        provideHttpClient(),
        provideRouter(routes),
        { provide: AuthApiService, useValue: auth },
        { provide: CalendarApiService, useValue: calendarApi },
        { provide: StatsApiService, useValue: statsApi },
        { provide: AccountingApiService, useValue: accountingApi },
        ...provideBonaFeedbackTesting().providers,
      ],
    }).compileComponents();
  });

  it('loads the schedules screen at /admin/horarios', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(AUTH_PATHS.adminSchedules);
    expect(TestBed.inject(Router).url).toBe(AUTH_PATHS.adminSchedules);
    expect(harness.routeNativeElement?.textContent).toContain(SCHEDULES_LITERALS.subtitle);
    expect(harness.routeNativeElement?.textContent).toContain(SCHEDULES_LITERALS.newSchedule);
  });

  it('loads the statistics screen at /admin/stats', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(AUTH_PATHS.adminStats);
    expect(TestBed.inject(Router).url).toBe(AUTH_PATHS.adminStats);
    expect(harness.routeNativeElement?.textContent).toContain(STATS_LITERALS.title);
    expect(harness.routeNativeElement?.textContent).toContain(STATS_LITERALS.agendaTitle);
    expect(harness.routeNativeElement?.textContent).toContain(STATS_LITERALS.clientsTitle);
  });

  it('loads the accounting screen at /admin/contabilidad', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(AUTH_PATHS.adminAccounting);
    expect(TestBed.inject(Router).url).toBe(AUTH_PATHS.adminAccounting);
    expect(harness.routeNativeElement?.textContent).toContain(ACCOUNTING_LITERALS.title);
    expect(harness.routeNativeElement?.textContent).toContain(ACCOUNTING_LITERALS.disclaimer);
  });
});
