import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_PATHS, apiUrl } from '../core/api-url';
import { toHttpParams } from '../core/http-params';
import { StatsDto, StatsPreset } from '../models/stats.dto';

@Injectable({ providedIn: 'root' })
export class StatsApiService {
  private readonly http = inject(HttpClient);

  getStats(preset: StatsPreset): Observable<StatsDto> {
    return this.http.get<StatsDto>(apiUrl(API_PATHS.stats), {
      params: toHttpParams({ preset }),
    });
  }
}
