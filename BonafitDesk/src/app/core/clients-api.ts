import { Observable } from 'rxjs';
import { ClientBonoDto, ContractBonoDto } from '../models/client-bono.dto';
import { ClientDto, ClientWriteDto } from '../models/client.dto';

export interface ClientsApi {
  getClients(): Observable<ClientDto[]>;
  getClient(id: string): Observable<ClientDto>;
  createClient(payload: ClientWriteDto): Observable<ClientDto>;
  updateClient(id: string, payload: ClientWriteDto): Observable<ClientDto>;
  deleteClient(id: string): Observable<void>;
  getClientBonos(clientId: string): Observable<ClientBonoDto[]>;
  contractBono(payload: ContractBonoDto): Observable<ClientBonoDto>;
}
