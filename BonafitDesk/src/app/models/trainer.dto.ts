export interface TrainerDto {
  id: string;
  name: string;
}

export type TrainerWriteDto = Omit<TrainerDto, 'id'>;
