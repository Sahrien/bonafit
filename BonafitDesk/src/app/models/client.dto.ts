export interface ClientDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
}

export type ClientWriteDto = Omit<ClientDto, 'id'>;
