export interface ClientBonoDto {
  id: string;
  clientId: string;
  bonoId: string;
  remainingSessions: number;
  isGift?: boolean;
  purchasedAt: string;
  expiresAt: string | null;
  listPrice?: number | null;
  paidPrice?: number | null;
  couponId?: string | null;
}

export interface ContractBonoDto {
  clientId: string;
  bonoId?: string;
  serviceId?: string;
  remainingSessions?: number;
  isGift?: boolean;
  couponId?: string;
}

export interface ClientBonoPatchDto {
  remainingSessions: number;
  expiresAt: string | null;
}

export type ClientBonoWriteDto = Omit<ClientBonoDto, 'id'>;
