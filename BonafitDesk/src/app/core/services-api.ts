import { Observable } from 'rxjs';
import { BonoDto, BonoWriteDto } from '../models/bono.dto';
import { ServiceDto, ServiceWriteDto } from '../models/service.dto';

export interface ServicesApi {
  getServices(): Observable<ServiceDto[]>;
  getService(id: string): Observable<ServiceDto>;
  createService(payload: ServiceWriteDto): Observable<ServiceDto>;
  updateService(id: string, payload: ServiceWriteDto): Observable<ServiceDto>;
  deleteService(id: string): Observable<void>;
  getBonos(serviceId?: string): Observable<BonoDto[]>;
  getBono(id: string): Observable<BonoDto>;
  createBono(payload: BonoWriteDto): Observable<BonoDto>;
  updateBono(id: string, payload: BonoWriteDto): Observable<BonoDto>;
  deleteBono(id: string): Observable<void>;
}
