import { isoWeekday, localDateKey, parseLocalDateKey } from '../../core/booking';

export const TEMPLATE_WEEK_MONDAY = new Date(2026, 0, 5);

export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function hhmm(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfWeekMonday(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const weekday = next.getDay();
  next.setDate(next.getDate() + (weekday === 0 ? -6 : 1 - weekday));
  return next;
}

export function inclusiveDateKey(start: Date, end: Date, allDay?: boolean): { startsOn: string; endsOn: string } {
  const last = new Date(end);
  if (allDay || (last.getHours() === 0 && last.getMinutes() === 0 && last.getTime() > start.getTime())) {
    last.setDate(last.getDate() - 1);
  }
  return { startsOn: localDateKey(start), endsOn: localDateKey(last) };
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function rangeQueryAround(focus: Date, days = 21): { from: string; to: string } {
  const start = startOfWeekMonday(focus);
  start.setDate(start.getDate() - 7);
  const end = addDays(start, days + 6);
  return { from: localDateKey(start), to: localDateKey(end) };
}

export function rangeQueryForView(focus: Date, view: 'week' | 'day' | 'month'): { from: string; to: string } {
  if (view === 'month') {
    const start = new Date(focus.getFullYear(), focus.getMonth(), 1);
    const end = new Date(focus.getFullYear(), focus.getMonth() + 1, 0);
    return { from: localDateKey(addDays(start, -7)), to: localDateKey(addDays(end, 7)) };
  }
  if (view === 'day') {
    const start = addDays(focus, -1);
    return { from: localDateKey(start), to: localDateKey(addDays(focus, 1)) };
  }
  return rangeQueryAround(focus);
}

export type ScheduleEventRef =
  | {
      kind: 'inherited';
      templateId: string;
      trainerId: string;
      date: string;
      startTime: string;
      endTime: string;
    }
  | { kind: 'window'; windowId: string; trainerId: string }
  | { kind: 'absence'; absenceId: string; trainerId: string }
  | { kind: 'holiday'; holidayId: string };

export function scheduleEventId(ref: ScheduleEventRef): string {
  if (ref.kind === 'inherited') {
    return ['inh', ref.templateId, ref.trainerId, ref.date, ref.startTime, ref.endTime].join('|');
  }
  if (ref.kind === 'window') {
    return ['win', ref.windowId, ref.trainerId].join('|');
  }
  if (ref.kind === 'absence') {
    return ['abs', ref.absenceId, ref.trainerId].join('|');
  }
  return ['hol', ref.holidayId].join('|');
}

export function parseScheduleEventId(id: string): ScheduleEventRef | null {
  const parts = id.split('|');
  const kind = parts[0];
  if (kind === 'inh' && parts.length === 6) {
    return {
      kind: 'inherited',
      templateId: parts[1] ?? '',
      trainerId: parts[2] ?? '',
      date: parts[3] ?? '',
      startTime: parts[4] ?? '',
      endTime: parts[5] ?? '',
    };
  }
  if (kind === 'win' && parts.length === 3) {
    return { kind: 'window', windowId: parts[1] ?? '', trainerId: parts[2] ?? '' };
  }
  if (kind === 'abs' && parts.length === 3) {
    return { kind: 'absence', absenceId: parts[1] ?? '', trainerId: parts[2] ?? '' };
  }
  if (kind === 'hol' && parts.length === 2) {
    return { kind: 'holiday', holidayId: parts[1] ?? '' };
  }
  return null;
}

export function templateDateForWeekday(weekday: number): Date {
  return addDays(TEMPLATE_WEEK_MONDAY, weekday - 1);
}

export function templateWeekdayFromDate(date: Date): number {
  return isoWeekday(date);
}

export function atDateTime(dateKey: string, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const day = parseLocalDateKey(dateKey);
  day.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return day;
}

export function formatHours(minutes: number): string {
  const hours = minutes / 60;
  const text = Number.isInteger(hours) ? String(hours) : hours.toFixed(1).replace('.', ',');
  return `${text} h`;
}

export const TRAINER_EVENT_COLORS = [
  'var(--bona-color-primary)',
  'var(--bona-color-accent)',
  'var(--bona-color-success)',
  'var(--bona-color-warning)',
];

export const TRAINER_EVENT_TEXT_COLORS = [
  'var(--bona-color-primary-contrast)',
  'var(--bona-color-accent-contrast)',
  'var(--bona-color-success-contrast)',
  'var(--bona-color-warning-contrast)',
];
