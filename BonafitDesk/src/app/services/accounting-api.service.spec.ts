import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_PATHS, apiUrl } from '../core/api-url';
import { configureHttpClientTesting } from '../core/http-testing';
import { EMPTY_SUMMARY } from '../models/accounting.dto';
import { AccountingApiService } from './accounting-api.service';

describe('AccountingApiService', () => {
  let api: AccountingApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    http = configureHttpClientTesting();
    api = TestBed.inject(AccountingApiService);
  });

  afterEach(() => {
    http.verify();
  });

  it('GET /accounting/summary?preset=', async () => {
    const pending = firstValueFrom(api.getSummary('7d'));
    const req = http.expectOne(
      (request) =>
        request.method === 'GET' &&
        request.url === apiUrl(API_PATHS.accounting, 'summary') &&
        request.params.get('preset') === '7d',
    );
    req.flush(EMPTY_SUMMARY);
    expect(await pending).toEqual(EMPTY_SUMMARY);
  });
});
