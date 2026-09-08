export interface TrainerScheduleDto {
  id: string;
  trainerId: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

export type TrainerScheduleWriteDto = Omit<TrainerScheduleDto, 'id'>;
