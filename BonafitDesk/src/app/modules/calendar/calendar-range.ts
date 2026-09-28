import { localDateKey } from '../../core/booking';

export function startOfLocalDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function startOfWeekMonday(date: Date): Date {
  const next = startOfLocalDay(date);
  const weekday = next.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  next.setDate(next.getDate() + diff);
  return next;
}

export function periodRange(view: 'day' | 'week', focus: Date): { start: Date; end: Date } {
  if (view === 'day') {
    const start = startOfLocalDay(focus);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }
  const start = startOfWeekMonday(focus);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

export function isInstantInRange(iso: string, start: Date, end: Date): boolean {
  const time = new Date(iso).getTime();
  return time >= start.getTime() && time < end.getTime();
}

export function paddedDateRange(view: 'day' | 'week', focus: Date): { from: string; to: string } {
  if (view === 'day') {
    const start = startOfLocalDay(focus);
    const from = new Date(start);
    from.setDate(from.getDate() - 1);
    const to = new Date(start);
    to.setDate(to.getDate() + 2);
    return { from: localDateKey(from), to: localDateKey(to) };
  }
  const { start, end } = periodRange('week', focus);
  const from = new Date(start);
  from.setDate(from.getDate() - 7);
  const to = new Date(end);
  to.setDate(to.getDate() + 7);
  return { from: localDateKey(from), to: localDateKey(to) };
}

export function mergeTimeWindows(
  windows: { startTime: string; endTime: string }[],
): { startTime: string; endTime: string }[] {
  const sorted = [...windows].sort(
    (left, right) => left.startTime.localeCompare(right.startTime) || left.endTime.localeCompare(right.endTime),
  );
  const merged: { startTime: string; endTime: string }[] = [];
  for (const window of sorted) {
    const last = merged.at(-1);
    if (!last || window.startTime > last.endTime) {
      merged.push({ startTime: window.startTime, endTime: window.endTime });
      continue;
    }
    if (window.endTime > last.endTime) {
      last.endTime = window.endTime;
    }
  }
  return merged;
}
