import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_PATHS, apiUrl } from '../core/api-url';
import { ClientsApi } from '../core/clients-api';
import { toHttpParams } from '../core/http-params';
import { ClientBonoDto, ContractBonoDto } from '../models/client-bono.dto';
import { ClientDto, ClientWriteDto } from '../models/client.dto';

@Injectable({ providedIn: 'root' })
export class ClientsHttpApi implements ClientsApi {
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
}
