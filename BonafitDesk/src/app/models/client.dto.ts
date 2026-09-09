export interface ClientDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
  instantConfirm: boolean;
  temporaryPassword?: string | null;
}

export type ClientWriteDto = Omit<ClientDto, 'id' | 'temporaryPassword'>;
