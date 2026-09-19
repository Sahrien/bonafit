import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_PATHS, apiUrl } from '../core/api-url';
import { configureHttpClientTesting } from '../core/http-testing';
import {
  EMPTY_STATS_AGENDA,
  EMPTY_STATS_CLIENTS,
  StatsDto,
} from '../models/stats.dto';
import { StatsApiService } from './stats-api.service';

const STATS: StatsDto = {
  timezone: 'Europe/Madrid',
  preset: '7d',
  from: '2026-09-13T00:00:00.000Z',
  to: '2026-09-20T00:00:00.000Z',
  previousFrom: '2026-09-06T00:00:00.000Z',
  previousTo: '2026-09-13T00:00:00.000Z',
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
  agenda: EMPTY_STATS_AGENDA,
  clients: EMPTY_STATS_CLIENTS,
};

describe('StatsApiService', () => {
  let api: StatsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    http = configureHttpClientTesting();
    api = TestBed.inject(StatsApiService);
  });

  afterEach(() => {
    http.verify();
  });

  it('GET /stats?preset=', async () => {
    const pending = firstValueFrom(api.getStats('7d'));
    const req = http.expectOne(
      (request) =>
        request.method === 'GET' &&
        request.url === apiUrl(API_PATHS.stats) &&
        request.params.get('preset') === '7d',
    );
    req.flush(STATS);
    expect(await pending).toEqual(STATS);
  });
});
