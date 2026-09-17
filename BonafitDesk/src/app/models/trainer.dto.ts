export interface TrainerDto {
  id: string;
  name: string;
  concurrentCapacity: number;
}

export type TrainerWriteDto = Omit<TrainerDto, 'id'>;
