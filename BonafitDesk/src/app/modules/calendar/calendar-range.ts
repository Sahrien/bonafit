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
