import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_PATHS, apiUrl } from '../core/api-url';
import { ClientsApi } from '../core/clients-api';
import { toHttpParams } from '../core/http-params';
import { ClientBonoDto, ClientBonoPatchDto, ContractBonoDto } from '../models/client-bono.dto';
import { ClientCouponDto, ClientCouponWriteDto } from '../models/client-coupon.dto';
import { ClientDto, ClientWriteDto } from '../models/client.dto';

@Injectable({ providedIn: 'root' })
export class ClientsApiService implements ClientsApi {
  private readonly http = inject(HttpClient);

  getClients(): Observable<ClientDto[]> {
    return this.http.get<ClientDto[]>(apiUrl(API_PATHS.clients));
  }

  getClient(id: string): Observable<ClientDto> {
    return this.http.get<ClientDto>(apiUrl(API_PATHS.clients, id));
  }

  createClient(payload: ClientWriteDto): Observable<ClientDto> {
    return this.http.post<ClientDto>(apiUrl(API_PATHS.clients), payload);
  }

  updateClient(id: string, payload: ClientWriteDto): Observable<ClientDto> {
    return this.http.put<ClientDto>(apiUrl(API_PATHS.clients, id), payload);
  }

  deleteClient(id: string): Observable<void> {
    return this.http.delete<void>(apiUrl(API_PATHS.clients, id));
  }

  getClientBonos(clientId: string): Observable<ClientBonoDto[]> {
    return this.http.get<ClientBonoDto[]>(apiUrl(API_PATHS.clientBonos), {
      params: toHttpParams({ clientId }),
    });
  }

  contractBono(payload: ContractBonoDto): Observable<ClientBonoDto> {
    return this.http.post<ClientBonoDto>(apiUrl(API_PATHS.clientBonos), payload);
  }

  updateClientBono(id: string, payload: ClientBonoPatchDto): Observable<ClientBonoDto> {
    return this.http.put<ClientBonoDto>(apiUrl(API_PATHS.clientBonos, id), payload);
  }

  deleteClientBono(id: string): Observable<void> {
    return this.http.delete<void>(apiUrl(API_PATHS.clientBonos, id));
  }

  getCoupons(clientId: string): Observable<ClientCouponDto[]> {
    return this.http.get<ClientCouponDto[]>(apiUrl(API_PATHS.clients, clientId, API_PATHS.clientCoupons));
  }

  createCoupon(clientId: string, payload: ClientCouponWriteDto): Observable<ClientCouponDto> {
    return this.http.post<ClientCouponDto>(
      apiUrl(API_PATHS.clients, clientId, API_PATHS.clientCoupons),
      payload,
    );
  }

  deleteCoupon(clientId: string, couponId: string): Observable<void> {
    return this.http.delete<void>(apiUrl(API_PATHS.clients, clientId, API_PATHS.clientCoupons, couponId));
  }
}

export { ClientsApiService as ClientsService };
