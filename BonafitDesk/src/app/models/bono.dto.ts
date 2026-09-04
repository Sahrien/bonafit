export interface BonoDto {
  id: string;
  serviceId: string;
  name: string;
  description: string;
  sessionCount: number;
  price: number;
}

export type BonoWriteDto = Omit<BonoDto, 'id'>;
