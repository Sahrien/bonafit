import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { ApiNotFoundError } from '../core/api-not-found.error';
import { ClientsApi } from '../core/clients-api';
import { MockStore } from '../core/mock-store.service';
import { ClientBonoDto, ContractBonoDto } from '../models/client-bono.dto';
import { ClientDto, ClientWriteDto } from '../models/client.dto';

@Injectable({ providedIn: 'root' })
export class ClientsMockApi implements ClientsApi {
  private readonly store = inject(MockStore);

  getClients(): Observable<ClientDto[]> {
    return of(structuredClone(this.store.clients));
  }

  getClient(id: string): Observable<ClientDto> {
    const client = this.store.clients.find((row) => row.id === id);
    if (!client) {
      return throwError(() => new ApiNotFoundError('client', id));
    }
    return of(structuredClone(client));
  }

  createClient(payload: ClientWriteDto): Observable<ClientDto> {
    const created: ClientDto = { ...payload, id: crypto.randomUUID() };
    this.store.clients.push(created);
    return of(structuredClone(created));
  }

  updateClient(id: string, payload: ClientWriteDto): Observable<ClientDto> {
    const index = this.store.clients.findIndex((row) => row.id === id);
    if (index < 0) {
      return throwError(() => new ApiNotFoundError('client', id));
    }
    const updated: ClientDto = { ...payload, id };
    this.store.clients[index] = updated;
    return of(structuredClone(updated));
  }

  deleteClient(id: string): Observable<void> {
    const index = this.store.clients.findIndex((row) => row.id === id);
    if (index < 0) {
      return throwError(() => new ApiNotFoundError('client', id));
    }
    this.store.clients.splice(index, 1);
    return of(undefined);
  }

  getClientBonos(clientId: string): Observable<ClientBonoDto[]> {
    return of(
      structuredClone(
        this.store.clientBonos.filter((row) => row.clientId === clientId),
      ),
    );
  }

  contractBono(payload: ContractBonoDto): Observable<ClientBonoDto> {
    const bono = this.store.bonos.find((row) => row.id === payload.bonoId);
    if (!bono) {
      return throwError(() => new ApiNotFoundError('bono', payload.bonoId));
    }
    const client = this.store.clients.find((row) => row.id === payload.clientId);
    if (!client) {
      return throwError(() => new ApiNotFoundError('client', payload.clientId));
    }
    const created: ClientBonoDto = {
      id: crypto.randomUUID(),
      clientId: payload.clientId,
      bonoId: payload.bonoId,
      remainingSessions: bono.sessionCount,
      purchasedAt: new Date().toISOString(),
      expiresAt: null,
    };
    this.store.clientBonos.push(created);
    return of(structuredClone(created));
  }
}
