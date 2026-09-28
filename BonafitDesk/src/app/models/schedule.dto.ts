export type AbsenceReason = 'vacation' | 'personal' | 'sick' | 'unknown';
export type ClosedReason = AbsenceReason | 'publicHoliday';
export type ResolvedScheduleSource = 'template' | 'override' | 'absence' | 'holiday';

export interface ScheduleDateWindowDto {
  id: string;
  trainerId: string;
  date: string;
  startTime: string;
  endTime: string;
  note: string;
}

export type ScheduleDateWindowWriteDto = Omit<ScheduleDateWindowDto, 'id'>;

export interface ScheduleAbsenceDto {
  id: string;
  trainerId: string;
  startsOn: string;
  endsOn: string;
  reason: AbsenceReason;
  note: string;
}

export type ScheduleAbsenceWriteDto = Omit<ScheduleAbsenceDto, 'id'>;

export interface PublicHolidayDto {
  id: string;
  date: string;
  name: string;
}

export type PublicHolidayWriteDto = Omit<PublicHolidayDto, 'id'>;

export interface ResolvedWindowDto {
  startTime: string;
  endTime: string;
}

export interface ResolvedDayDto {
  trainerId: string;
  date: string;
  windows: ResolvedWindowDto[];
  source: ResolvedScheduleSource;
  reason?: ClosedReason | null;
}

export interface ScheduleHoursDayDto {
  trainerId: string;
  date: string;
  minutes: number;
}

export interface ScheduleHoursTrainerDto {
  trainerId: string;
  totalMinutes: number;
  averageMinutesPerDay: number;
}

export interface ScheduleHoursDto {
  days: ScheduleHoursDayDto[];
  totals: ScheduleHoursTrainerDto[];
  totalMinutes: number;
  averageMinutesPerDay: number;
}

export interface ScheduleRangeQuery {
  from?: string;
  to?: string;
  trainerId?: string;
}

export interface ScheduleResolvedQuery {
  from: string;
  to: string;
  trainerId?: string;
}
