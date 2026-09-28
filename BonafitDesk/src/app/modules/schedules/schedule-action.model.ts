import { AbsenceReason } from '../../models/schedule.dto';
import { TrainerDto } from '../../models/trainer.dto';

export type ScheduleScope = 'thisDay' | 'everyWeekday';
export type ScheduleActionKind =
  | 'createHours'
  | 'createClosed'
  | 'editWindow'
  | 'editAbsence'
  | 'editHoliday'
  | 'moveTemplate';

export interface ScheduleActionDialogData {
  kind: ScheduleActionKind;
  mode: 'yo' | 'estudio';
  trainers: TrainerDto[];
  trainerId: string;
  date: string;
  endsOn?: string;
  startTime?: string;
  endTime?: string;
  weekday: number;
  source?: 'template' | 'override';
  templateId?: string;
  holidayName?: string;
  canEditHoliday?: boolean;
}

export type ScheduleActionResult =
  | {
      action: 'createHours';
      trainerId: string;
      scope: ScheduleScope;
      date: string;
      startTime: string;
      endTime: string;
    }
  | {
      action: 'createAbsence';
      trainerId: string;
      reason: AbsenceReason;
      startsOn: string;
      endsOn: string;
    }
  | { action: 'createHoliday'; date: string; name: string }
  | { action: 'deleteWindow'; scope: ScheduleScope }
  | { action: 'revertDay' }
  | { action: 'requestAbsence' }
  | { action: 'deleteAbsence' }
  | { action: 'saveHoliday'; name: string }
  | { action: 'deleteHoliday' }
  | { action: 'applyMove'; scope: ScheduleScope };
