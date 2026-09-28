import { AppointmentDto, AppointmentStatus, AvailabilitySlotDto } from '../models/appointment.dto';
import { BookingSettingsDto } from '../models/booking-settings.dto';
import { ClientBonoDto } from '../models/client-bono.dto';
import { ServiceDto } from '../models/service.dto';
import { TrainerDto } from '../models/trainer.dto';
import { TrainerScheduleDto } from '../models/trainer-schedule.dto';
import {
  AbsenceReason,
  ClosedReason,
  ResolvedScheduleSource,
} from '../models/schedule.dto';

export type BookingActor = 'client' | 'trainer';

export function occupiesTrainerSlot(status: AppointmentStatus): boolean {
  return status === 'pending' || status === 'confirmed';
}

export function isActiveClientAppointment(status: AppointmentStatus): boolean {
  return status === 'pending' || status === 'confirmed';
}

export function hasActiveClientAppointmentForService(
  rows: Pick<AppointmentDto, 'id' | 'serviceId' | 'status'>[],
  serviceId: string,
  ignoreAppointmentId?: string,
): boolean {
  return rows.some(
    (row) =>
      row.serviceId === serviceId &&
      row.id !== ignoreAppointmentId &&
      isActiveClientAppointment(row.status),
  );
}

export function pickNextClientAppointment<
  T extends Pick<AppointmentDto, 'status' | 'startsAt' | 'endsAt'>,
>(rows: T[], now: Date): T | undefined {
  const active = rows.filter((row) => isActiveClientAppointment(row.status));
  if (active.length === 0) {
    return undefined;
  }
  const nowMs = now.getTime();
  const notFinished = active.filter((row) => new Date(row.endsAt).getTime() >= nowMs);
  const pool = notFinished.length > 0 ? notFinished : active;
  const direction = notFinished.length > 0 ? 1 : -1;
  return [...pool].sort(
    (left, right) =>
      direction * (new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()),
  )[0];
}

export function isBonoExpired(expiresAt: string | null, now: Date): boolean {
  if (!expiresAt) {
    return false;
  }
  return new Date(expiresAt).getTime() <= now.getTime();
}

export function isBonoUsable(row: ClientBonoDto, now: Date): boolean {
  return row.remainingSessions > 0 && !isBonoExpired(row.expiresAt, now);
}

export function isGiftCredit(row: ClientBonoDto): boolean {
  return row.isGift === true;
}

export function pickPreferredBono(rows: ClientBonoDto[], now: Date): ClientBonoDto | null {
  const usable = rows.filter((row) => isBonoUsable(row, now));
  if (usable.length === 0) {
    return null;
  }
  return [...usable].sort((left, right) => {
    const expLeft = left.expiresAt ? new Date(left.expiresAt).getTime() : Number.POSITIVE_INFINITY;
    const expRight = right.expiresAt ? new Date(right.expiresAt).getTime() : Number.POSITIVE_INFINITY;
    if (expLeft !== expRight) {
      return expLeft - expRight;
    }
    return left.remainingSessions - right.remainingSessions;
  })[0];
}

export function isoWeekday(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

export function parseTimeParts(value: string): { hours: number; minutes: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    return null;
  }
  return { hours, minutes };
}

export function atLocalTime(day: Date, hhmm: string): Date {
  const parts = parseTimeParts(hhmm);
  const next = new Date(day);
  next.setHours(parts?.hours ?? 0, parts?.minutes ?? 0, 0, 0);
  return next;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function startOfLocalDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function localDateKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function asDateKey(value: string | Date): string {
  if (value instanceof Date) {
    return localDateKey(value);
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : localDateKey(parsed);
}

export type ScheduleTimeWindow = { startTime: string; endTime: string };

export interface ScheduleResolveRules {
  templates: Pick<TrainerScheduleDto, 'trainerId' | 'weekday' | 'startTime' | 'endTime'>[];
  dateWindows?: Array<{ trainerId: string; date: string | Date; startTime: string; endTime: string }>;
  absences?: Array<{
    trainerId: string;
    startsOn: string | Date;
    endsOn: string | Date;
    reason?: AbsenceReason | string;
  }>;
  holidays?: Array<{ date: string | Date }>;
}

export interface ResolvedScheduleDay {
  trainerId: string;
  date: string;
  windows: ScheduleTimeWindow[];
  source: ResolvedScheduleSource;
  reason?: ClosedReason;
}

const ABSENCE_REASONS: ReadonlySet<string> = new Set(['vacation', 'personal', 'sick', 'unknown']);

function holidayOn(day: string, holidays: Array<{ date: string | Date }>): boolean {
  return holidays.some((row) => asDateKey(row.date) === day);
}

function absenceOn(
  trainerId: string,
  day: string,
  absences: NonNullable<ScheduleResolveRules['absences']>,
): NonNullable<ScheduleResolveRules['absences']>[number] | undefined {
  return absences.find(
    (row) =>
      row.trainerId === trainerId && asDateKey(row.startsOn) <= day && day <= asDateKey(row.endsOn),
  );
}

export function resolveDay(trainerId: string, day: Date | string, rules: ScheduleResolveRules): ResolvedScheduleDay {
  const date = asDateKey(day);
  if (holidayOn(date, rules.holidays ?? [])) {
    return { trainerId, date, windows: [], source: 'holiday', reason: 'publicHoliday' };
  }
  const absence = absenceOn(trainerId, date, rules.absences ?? []);
  if (absence) {
    const raw = absence.reason ?? 'unknown';
    const reason: ClosedReason = ABSENCE_REASONS.has(raw) ? (raw as AbsenceReason) : 'unknown';
    return { trainerId, date, windows: [], source: 'absence', reason };
  }
  const dated = (rules.dateWindows ?? [])
    .filter((row) => row.trainerId === trainerId && asDateKey(row.date) === date)
    .map((row) => ({ startTime: row.startTime, endTime: row.endTime }))
    .sort((left, right) => left.startTime.localeCompare(right.startTime));
  if (dated.length > 0) {
    return { trainerId, date, windows: dated, source: 'override' };
  }
  const weekday = isoWeekday(typeof day === 'string' ? parseLocalDateKey(date) : day);
  const templates = rules.templates
    .filter((row) => row.trainerId === trainerId && row.weekday === weekday)
    .map((row) => ({ startTime: row.startTime, endTime: row.endTime }))
    .sort((left, right) => left.startTime.localeCompare(right.startTime));
  return { trainerId, date, windows: templates, source: 'template' };
}

export function parseLocalDateKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function earliestBookableLocalDate(now: Date, cutoffTime: string): Date {
  const cutoff = atLocalTime(now, cutoffTime);
  const day = startOfLocalDay(now);
  if (now.getTime() < cutoff.getTime()) {
    day.setDate(day.getDate() + 1);
  } else {
    day.setDate(day.getDate() + 2);
  }
  return day;
}

export function isClientStartAllowed(startsAt: Date, now: Date, cutoffTime: string): boolean {
  return startOfLocalDay(startsAt).getTime() >= earliestBookableLocalDate(now, cutoffTime).getTime();
}

export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function concurrentCapacityOf(trainerId: string, trainers?: Pick<TrainerDto, 'id' | 'concurrentCapacity'>[]): number {
  const found = trainers?.find((row) => row.id === trainerId);
  const value = found?.concurrentCapacity ?? 1;
  return value >= 1 ? value : 1;
}

export function overlappingOccupancy(
  busy: Pick<AppointmentDto, 'trainerId' | 'status' | 'startsAt' | 'endsAt'>[],
  trainerId: string,
  slotStart: Date,
  slotEnd: Date,
): number {
  return busy.filter(
    (row) =>
      row.trainerId === trainerId &&
      occupiesTrainerSlot(row.status) &&
      rangesOverlap(slotStart, slotEnd, new Date(row.startsAt), new Date(row.endsAt)),
  ).length;
}

export function slotTakenForTrainer(
  busy: Pick<AppointmentDto, 'trainerId' | 'status' | 'startsAt' | 'endsAt'>[],
  trainerId: string,
  slotStart: Date,
  slotEnd: Date,
  concurrentCapacity: number,
): boolean {
  const capacity = concurrentCapacity >= 1 ? concurrentCapacity : 1;
  return overlappingOccupancy(busy, trainerId, slotStart, slotEnd) >= capacity;
}

export function slotTakenForClient(
  busy: Pick<AppointmentDto, 'clientId' | 'status' | 'startsAt' | 'endsAt'>[],
  clientId: string,
  slotStart: Date,
  slotEnd: Date,
): boolean {
  return busy.some(
    (row) =>
      row.clientId === clientId &&
      occupiesTrainerSlot(row.status) &&
      rangesOverlap(slotStart, slotEnd, new Date(row.startsAt), new Date(row.endsAt)),
  );
}

export function statusOnCreate(actor: BookingActor, instantConfirm: boolean): AppointmentStatus {
  if (actor === 'trainer' || instantConfirm) {
    return 'confirmed';
  }
  return 'pending';
}

export function statusOnClientReschedule(instantConfirm: boolean): AppointmentStatus {
  return instantConfirm ? 'confirmed' : 'pending';
}

export interface AvailabilityInput {
  service: ServiceDto;
  schedules: TrainerScheduleDto[];
  appointments: AppointmentDto[];
  settings: BookingSettingsDto;
  now: Date;
  from: Date;
  to: Date;
  actor: BookingActor;
  trainerId?: string;
  ignoreAppointmentId?: string;
  trainers?: Pick<TrainerDto, 'id' | 'concurrentCapacity'>[];
  clientId?: string;
  dateWindows?: NonNullable<ScheduleResolveRules['dateWindows']>;
  absences?: NonNullable<ScheduleResolveRules['absences']>;
  holidays?: NonNullable<ScheduleResolveRules['holidays']>;
}

export function listAvailabilitySlots(input: AvailabilityInput): AvailabilitySlotDto[] {
  const duration = input.service.durationMinutes;
  if (duration <= 0) {
    return [];
  }
  const earliest =
    input.actor === 'client' ? earliestBookableLocalDate(input.now, input.settings.nextDayCutoffTime) : null;
  const busy = input.appointments.filter(
    (row) => occupiesTrainerSlot(row.status) && row.id !== input.ignoreAppointmentId,
  );
  const days: Date[] = [];
  const cursor = startOfLocalDay(input.from);
  const last = startOfLocalDay(input.to);
  while (cursor.getTime() <= last.getTime()) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  const slots: AvailabilitySlotDto[] = [];
  const rules: ScheduleResolveRules = {
    templates: input.schedules,
    dateWindows: input.dateWindows ?? [],
    absences: input.absences ?? [],
    holidays: input.holidays ?? [],
  };
  const trainerIds = input.trainerId
    ? [input.trainerId]
    : [
        ...new Set([
          ...input.schedules.map((row) => row.trainerId),
          ...(input.dateWindows ?? []).map((row) => row.trainerId),
          ...(input.absences ?? []).map((row) => row.trainerId),
        ]),
      ].sort();
  for (const day of days) {
    if (earliest && day.getTime() < earliest.getTime()) {
      continue;
    }
    for (const trainerId of trainerIds) {
      const resolved = resolveDay(trainerId, day, rules);
      for (const window of resolved.windows) {
        const windowStart = atLocalTime(day, window.startTime);
        const windowEnd = atLocalTime(day, window.endTime);
        let slotStart = new Date(windowStart);
        while (addMinutes(slotStart, duration).getTime() <= windowEnd.getTime()) {
          const slotEnd = addMinutes(slotStart, duration);
          const taken =
            slotTakenForTrainer(
              busy,
              trainerId,
              slotStart,
              slotEnd,
              concurrentCapacityOf(trainerId, input.trainers),
            ) || Boolean(input.clientId && slotTakenForClient(busy, input.clientId, slotStart, slotEnd));
          if (!taken) {
            slots.push({
              trainerId,
              startsAt: slotStart.toISOString(),
              endsAt: slotEnd.toISOString(),
            });
          }
          slotStart = slotEnd;
        }
      }
    }
  }
  return slots;
}

export function slotMatches(
  slots: AvailabilitySlotDto[],
  trainerId: string,
  startsAt: string,
  endsAt: string,
): boolean {
  return slots.some(
    (slot) => slot.trainerId === trainerId && slot.startsAt === startsAt && slot.endsAt === endsAt,
  );
}

export function remainingSessionsDelta(
  fromStatus: AppointmentStatus | null,
  toStatus: AppointmentStatus,
): number {
  const before = fromStatus && consumesSession(fromStatus) ? 1 : 0;
  const after = consumesSession(toStatus) ? 1 : 0;
  return before - after;
}

function consumesSession(status: AppointmentStatus): boolean {
  return status === 'confirmed' || status === 'completed';
}

export function canCancelAppointment(
  status: AppointmentStatus,
  startsAt: Date,
  now: Date,
  cutoffTime: string,
): boolean {
  if (!isActiveClientAppointment(status)) {
    return false;
  }
  return isClientStartAllowed(startsAt, now, cutoffTime);
}

export function canClientConfirmAppointment(status: AppointmentStatus): boolean {
  return status === 'pending';
}

export function canAdminCancelAppointment(status: AppointmentStatus): boolean {
  return status === 'pending' || status === 'confirmed';
}
