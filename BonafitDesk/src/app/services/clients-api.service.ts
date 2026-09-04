import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ClientsApi } from '../core/clients-api';
import { environment } from '../../environments/environment';
import { ClientBonoDto, ContractBonoDto } from '../models/client-bono.dto';
import { ClientDto, ClientWriteDto } from '../models/client.dto';
import { ClientsHttpApi } from './clients-http.service';
import { ClientsMockApi } from './clients-mock.service';

@Injectable({ providedIn: 'root' })
export class ClientsApiService implements ClientsApi {
  private readonly impl: ClientsApi = environment.useMockApi
    ? inject(ClientsMockApi)
    : inject(ClientsHttpApi);

  getClients(): Observable<ClientDto[]> {
    return this.impl.getClients();
  }

  getClient(id: string): Observable<ClientDto> {
    return this.impl.getClient(id);
  }

  createClient(payload: ClientWriteDto): Observable<ClientDto> {
    return this.impl.createClient(payload);
  }

  updateClient(id: string, payload: ClientWriteDto): Observable<ClientDto> {
    return this.impl.updateClient(id, payload);
  }

  deleteClient(id: string): Observable<void> {
    return this.impl.deleteClient(id);
  }

  getClientBonos(clientId: string): Observable<ClientBonoDto[]> {
    return this.impl.getClientBonos(clientId);
  }

  contractBono(payload: ContractBonoDto): Observable<ClientBonoDto> {
    return this.impl.contractBono(payload);
  }
}

export { ClientsApiService as ClientsService };
