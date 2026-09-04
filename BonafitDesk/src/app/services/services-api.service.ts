import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ServicesApi } from '../core/services-api';
import { BonoDto, BonoWriteDto } from '../models/bono.dto';
import { ServiceDto, ServiceWriteDto } from '../models/service.dto';
import { ServicesHttpApi } from './services-http.service';
import { ServicesMockApi } from './services-mock.service';

@Injectable({ providedIn: 'root' })
export class ServicesApiService implements ServicesApi {
  private readonly impl: ServicesApi = environment.useMockApi
    ? inject(ServicesMockApi)
    : inject(ServicesHttpApi);

  getServices(): Observable<ServiceDto[]> {
    return this.impl.getServices();
  }

  getService(id: string): Observable<ServiceDto> {
    return this.impl.getService(id);
  }

  createService(payload: ServiceWriteDto): Observable<ServiceDto> {
    return this.impl.createService(payload);
  }

  updateService(id: string, payload: ServiceWriteDto): Observable<ServiceDto> {
    return this.impl.updateService(id, payload);
  }

  deleteService(id: string): Observable<void> {
    return this.impl.deleteService(id);
  }

  getBonos(serviceId?: string): Observable<BonoDto[]> {
    return this.impl.getBonos(serviceId);
  }

  getBono(id: string): Observable<BonoDto> {
    return this.impl.getBono(id);
  }

  createBono(payload: BonoWriteDto): Observable<BonoDto> {
    return this.impl.createBono(payload);
  }

  updateBono(id: string, payload: BonoWriteDto): Observable<BonoDto> {
    return this.impl.updateBono(id, payload);
  }

  deleteBono(id: string): Observable<void> {
    return this.impl.deleteBono(id);
  }
}

