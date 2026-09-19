import { Observable } from 'rxjs';
import { ClientBonoDto, ClientBonoPatchDto, ContractBonoDto } from '../models/client-bono.dto';
import { ClientCouponDto, ClientCouponWriteDto } from '../models/client-coupon.dto';
import { ClientDto, ClientWriteDto } from '../models/client.dto';

export interface ClientsApi {
  getClients(): Observable<ClientDto[]>;
  getClient(id: string): Observable<ClientDto>;
  createClient(payload: ClientWriteDto): Observable<ClientDto>;
  updateClient(id: string, payload: ClientWriteDto): Observable<ClientDto>;
  deleteClient(id: string): Observable<void>;
  getClientBonos(clientId: string): Observable<ClientBonoDto[]>;
  contractBono(payload: ContractBonoDto): Observable<ClientBonoDto>;
  updateClientBono(id: string, payload: ClientBonoPatchDto): Observable<ClientBonoDto>;
  deleteClientBono(id: string): Observable<void>;
  getCoupons(clientId: string): Observable<ClientCouponDto[]>;
  createCoupon(clientId: string, payload: ClientCouponWriteDto): Observable<ClientCouponDto>;
  deleteCoupon(clientId: string, couponId: string): Observable<void>;
}
