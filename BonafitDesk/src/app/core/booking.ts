import { AppointmentDto, AppointmentStatus, AvailabilitySlotDto } from '../models/appointment.dto';
import { BookingSettingsDto } from '../models/booking-settings.dto';
import { ClientBonoDto } from '../models/client-bono.dto';
import { ServiceDto } from '../models/service.dto';
import { TrainerScheduleDto } from '../models/trainer-schedule.dto';

export type BookingActor = 'client' | 'trainer';

export function occupiesTrainerSlot(status: AppointmentStatus): boolean {
  return status === 'pending' || status === 'confirmed';
}

export function isActiveClientAppointment(status: AppointmentStatus): boolean {
  return status === 'pending' || status === 'confirmed';
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
  for (const day of days) {
    if (earliest && day.getTime() < earliest.getTime()) {
      continue;
    }
    const weekday = isoWeekday(day);
    for (const schedule of input.schedules) {
      if (schedule.weekday !== weekday) {
        continue;
      }
      if (input.trainerId && schedule.trainerId !== input.trainerId) {
        continue;
      }
      const windowStart = atLocalTime(day, schedule.startTime);
      const windowEnd = atLocalTime(day, schedule.endTime);
      let slotStart = new Date(windowStart);
      while (addMinutes(slotStart, duration).getTime() <= windowEnd.getTime()) {
        const slotEnd = addMinutes(slotStart, duration);
        const taken = busy.some(
          (row) =>
            row.trainerId === schedule.trainerId &&
            rangesOverlap(slotStart, slotEnd, new Date(row.startsAt), new Date(row.endsAt)),
        );
        if (!taken) {
          slots.push({
            trainerId: schedule.trainerId,
            startsAt: slotStart.toISOString(),
            endsAt: slotEnd.toISOString(),
          });
        }
        slotStart = slotEnd;
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
