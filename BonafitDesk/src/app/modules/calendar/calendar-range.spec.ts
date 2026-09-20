import { periodRange, startOfLocalDay, startOfWeekMonday } from './calendar-range';

describe('calendar-range', () => {
  it('uses Monday as the start of the week', () => {
    const wednesday = new Date(2026, 8, 9, 15, 0, 0);
    const start = startOfWeekMonday(wednesday);
    expect(start.getDay()).toBe(1);
    expect(start.getDate()).toBe(7);
    expect(start.getHours()).toBe(0);
  });

  it('builds an exclusive day range', () => {
    const focus = new Date(2026, 8, 9, 15, 0, 0);
    const { start, end } = periodRange('day', focus);
    expect(start).toEqual(startOfLocalDay(focus));
    expect(end.getDate()).toBe(10);
  });

  it('builds a seven-day week range', () => {
    const { start, end } = periodRange('week', new Date(2026, 8, 9));
    expect((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)).toBe(7);
  });
});
