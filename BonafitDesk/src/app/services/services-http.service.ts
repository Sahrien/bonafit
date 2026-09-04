import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_PATHS, apiUrl } from '../core/api-url';
import { toHttpParams } from '../core/http-params';
import { ServicesApi } from '../core/services-api';
import { BonoDto, BonoWriteDto } from '../models/bono.dto';
import { ServiceDto, ServiceWriteDto } from '../models/service.dto';

@Injectable({ providedIn: 'root' })
export class ServicesHttpApi implements ServicesApi {
  private readonly http = inject(HttpClient);

  getServices(): Observable<ServiceDto[]> {
    return this.http.get<ServiceDto[]>(apiUrl(API_PATHS.services));
  }

  getService(id: string): Observable<ServiceDto> {
    return this.http.get<ServiceDto>(apiUrl(API_PATHS.services, id));
  }

  createService(payload: ServiceWriteDto): Observable<ServiceDto> {
    return this.http.post<ServiceDto>(apiUrl(API_PATHS.services), payload);
  }

  updateService(id: string, payload: ServiceWriteDto): Observable<ServiceDto> {
    return this.http.put<ServiceDto>(apiUrl(API_PATHS.services, id), payload);
  }

  deleteService(id: string): Observable<void> {
    return this.http.delete<void>(apiUrl(API_PATHS.services, id));
  }

  getBonos(serviceId?: string): Observable<BonoDto[]> {
    return this.http.get<BonoDto[]>(apiUrl(API_PATHS.bonos), {
      params: toHttpParams({ serviceId }),
    });
  }

  getBono(id: string): Observable<BonoDto> {
    return this.http.get<BonoDto>(apiUrl(API_PATHS.bonos, id));
  }

  createBono(payload: BonoWriteDto): Observable<BonoDto> {
    return this.http.post<BonoDto>(apiUrl(API_PATHS.bonos), payload);
  }

  updateBono(id: string, payload: BonoWriteDto): Observable<BonoDto> {
    return this.http.put<BonoDto>(apiUrl(API_PATHS.bonos, id), payload);
  }

  deleteBono(id: string): Observable<void> {
    return this.http.delete<void>(apiUrl(API_PATHS.bonos, id));
  }
}
