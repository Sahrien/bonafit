export interface ClientBonoDto {
  id: string;
  clientId: string;
  bonoId: string;
  remainingSessions: number;
  purchasedAt: string;
  expiresAt: string | null;
}

export interface ContractBonoDto {
  clientId: string;
  bonoId: string;
}

export type ClientBonoWriteDto = Omit<ClientBonoDto, 'id'>;
