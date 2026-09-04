import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { ApiNotFoundError } from '../core/api-not-found.error';
import { MockStore } from '../core/mock-store.service';
import { ServicesApi } from '../core/services-api';
import { BonoDto, BonoWriteDto } from '../models/bono.dto';
import { ServiceDto, ServiceWriteDto } from '../models/service.dto';

@Injectable({ providedIn: 'root' })
export class ServicesMockApi implements ServicesApi {
  private readonly store = inject(MockStore);

  getServices(): Observable<ServiceDto[]> {
    return of(structuredClone(this.store.services));
  }

  getService(id: string): Observable<ServiceDto> {
    const service = this.store.services.find((row) => row.id === id);
    if (!service) {
      return throwError(() => new ApiNotFoundError('service', id));
    }
    return of(structuredClone(service));
  }

  createService(payload: ServiceWriteDto): Observable<ServiceDto> {
    const created: ServiceDto = { ...payload, id: crypto.randomUUID() };
    this.store.services.push(created);
    return of(structuredClone(created));
  }

  updateService(id: string, payload: ServiceWriteDto): Observable<ServiceDto> {
    const index = this.store.services.findIndex((row) => row.id === id);
    if (index < 0) {
      return throwError(() => new ApiNotFoundError('service', id));
    }
    const updated: ServiceDto = { ...payload, id };
    this.store.services[index] = updated;
    return of(structuredClone(updated));
  }

  deleteService(id: string): Observable<void> {
    const index = this.store.services.findIndex((row) => row.id === id);
    if (index < 0) {
      return throwError(() => new ApiNotFoundError('service', id));
    }
    this.store.services.splice(index, 1);
    return of(undefined);
  }

  getBonos(serviceId?: string): Observable<BonoDto[]> {
    const rows = serviceId
      ? this.store.bonos.filter((row) => row.serviceId === serviceId)
      : this.store.bonos;
    return of(structuredClone(rows));
  }

  getBono(id: string): Observable<BonoDto> {
    const bono = this.store.bonos.find((row) => row.id === id);
    if (!bono) {
      return throwError(() => new ApiNotFoundError('bono', id));
    }
    return of(structuredClone(bono));
  }

  createBono(payload: BonoWriteDto): Observable<BonoDto> {
    const created: BonoDto = { ...payload, id: crypto.randomUUID() };
    this.store.bonos.push(created);
    return of(structuredClone(created));
  }

  updateBono(id: string, payload: BonoWriteDto): Observable<BonoDto> {
    const index = this.store.bonos.findIndex((row) => row.id === id);
    if (index < 0) {
      return throwError(() => new ApiNotFoundError('bono', id));
    }
    const updated: BonoDto = { ...payload, id };
    this.store.bonos[index] = updated;
    return of(structuredClone(updated));
  }

  deleteBono(id: string): Observable<void> {
    const index = this.store.bonos.findIndex((row) => row.id === id);
    if (index < 0) {
      return throwError(() => new ApiNotFoundError('bono', id));
    }
    this.store.bonos.splice(index, 1);
    return of(undefined);
  }
}
