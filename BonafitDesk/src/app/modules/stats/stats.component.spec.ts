import { HttpErrorResponse } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom, of, throwError } from 'rxjs';
import { provideDeskTranslate } from '../../core/i18n/provide-desk-translate';
import {
  EMPTY_STATS_AGENDA,
  EMPTY_STATS_CLIENTS,
  EMPTY_STATS_MIX,
  StatsDto,
} from '../../models/stats.dto';
import { StatsApiService } from '../../services/stats-api.service';
import { provideBonaFeedbackTesting } from '../../testing/bona-feedback';
import { BonaToast } from '../../components/bona-toast/bona-toast.service';
import { StatsComponent, STATS_PRESET_STORAGE_KEY } from './stats.component';
import { STATS_LITERALS } from './stats.literals';
import en from '../../../assets/i18n/en.json';

const EMPTY_STATS: StatsDto = {
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
    series: [{ bucket: '2026-09-15', paidRevenue: 0 }],
    ranking: [],
    mix: EMPTY_STATS_MIX,
  },
  agenda: EMPTY_STATS_AGENDA,
  clients: EMPTY_STATS_CLIENTS,
};

const MOCK_STATS: StatsDto = {
  ...EMPTY_STATS,
  economy: {
    paidRevenue: 280,
    previousPaidRevenue: 100,
    revenueDelta: 180,
    averageTicket: 280,
    discountRate: 0.0667,
    paidCount: 1,
    previousPaidCount: 1,
    series: [{ bucket: '2026-09-15', paidRevenue: 280 }],
    ranking: [{ kind: 'pack', id: 'bono-1', name: '10-pack', paidRevenue: 280, units: 1 }],
    mix: {
      packs: { units: 1, paidRevenue: 280 },
      singles: { units: 0, paidRevenue: 0 },
      gifts: { units: 0, paidRevenue: 0 },
    },
  },
  agenda: {
    ...EMPTY_STATS_AGENDA,
    appointmentCount: 2,
    occupancyRate: 0.5,
    heatmapHours: [10],
    heatmap: [{ weekday: 3, hour: 10, count: 2 }],
    statuses: [{ status: 'confirmed', count: 2, previousCount: 0 }],
    trainers: [
      {
        trainerId: 'trainer-1',
        name: 'Alex',
        bookedMinutes: 60,
        scheduleMinutes: 120,
        occupancyRate: 0.5,
      },
    ],
  },
  clients: {
    ...EMPTY_STATS_CLIENTS,
    activeCount: 3,
    newCount: 1,
    recurringCount: 2,
    formsPending: 1,
    formsCompleted: 4,
    atRisk: [
      {
        clientId: 'client-1',
        name: 'Marina Lopez',
        reason: 'noSessions',
        remainingSessions: 0,
        expiresAt: null,
      },
    ],
  },
};

describe('StatsComponent', () => {
  let statsApi: jasmine.SpyObj<StatsApiService>;

  beforeEach(async () => {
    localStorage.removeItem(STATS_PRESET_STORAGE_KEY);
    statsApi = jasmine.createSpyObj('StatsApiService', ['getStats']);
    statsApi.getStats.and.returnValue(of(MOCK_STATS));

    await TestBed.configureTestingModule({
      imports: [StatsComponent],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideDeskTranslate(),
        provideRouter([
          { path: 'admin/stats', component: StatsComponent },
          { path: 'admin/clients/:id', component: StatsComponent },
        ]),
        { provide: StatsApiService, useValue: statsApi },
        ...provideBonaFeedbackTesting().providers,
      ],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.removeItem(STATS_PRESET_STORAGE_KEY);
  });

  it('loads KPIs and economy labels', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/stats', StatsComponent);

    expect(statsApi.getStats).toHaveBeenCalledWith('30d');
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(STATS_LITERALS.title);
    expect(text).toContain(STATS_LITERALS.subtitle);
    expect(text).toContain(STATS_LITERALS.economyTitle);
    expect(text).toContain(STATS_LITERALS.paidRevenue);
    expect(text).toContain(STATS_LITERALS.averageTicket);
    expect(text).toContain(STATS_LITERALS.discountRate);
    expect(text).toContain('280');
    expect(text).toContain('10-pack');
    expect(text).toContain(STATS_LITERALS.agendaTitle);
    expect(text).toContain(STATS_LITERALS.clientsTitle);
    expect(text).toContain('Marina Lopez');
    expect(harness.routeNativeElement?.querySelector('.page-error')).toBeFalsy();
  });

  it('shows an empty state when there are no sales', async () => {
    statsApi.getStats.and.returnValue(of(EMPTY_STATS));
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/stats', StatsComponent);

    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(STATS_LITERALS.economyTitle);
    expect(text).toContain(STATS_LITERALS.economyEmpty);
    expect(text).toContain(STATS_LITERALS.agendaTitle);
    expect(text).toContain(STATS_LITERALS.clientsTitle);
    expect(text).not.toContain('10-pack');
  });

  it('reloads when the period changes', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/stats', StatsComponent);
    statsApi.getStats.calls.reset();

    clickPreset(harness.routeNativeElement, STATS_LITERALS.presets['7d']);
    harness.fixture.detectChanges();

    expect(statsApi.getStats).toHaveBeenCalledWith('7d');
    expect(localStorage.getItem(STATS_PRESET_STORAGE_KEY)).toBe('7d');
  });

  it('toasts load errors without a page banner', async () => {
    const toast = TestBed.inject(BonaToast) as jasmine.SpyObj<BonaToast>;
    statsApi.getStats.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Server Error' })),
    );
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/stats', StatsComponent);

    expect(toast.error).toHaveBeenCalledWith(STATS_LITERALS.errorLoad);
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).not.toContain(STATS_LITERALS.errorLoad);
    expect(harness.routeNativeElement?.querySelector('.page-error')).toBeFalsy();
  });

  it('switches copy to English', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/stats', StatsComponent);
    const translate = TestBed.inject(TranslateService);
    await firstValueFrom(translate.use('en'));
    harness.fixture.detectChanges();

    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(en.stats.title);
    expect(text).toContain(en.stats.economyTitle);
    expect(text).toContain(en.stats.agendaTitle);
    expect(text).toContain(en.stats.clientsTitle);
  });
});

function clickPreset(root: HTMLElement | null, label: string): void {
  const buttons = Array.from(root?.querySelectorAll('app-bona-button button') ?? []) as HTMLButtonElement[];
  const match = buttons.find((button) => button.textContent?.trim() === label);
  match?.click();
}
