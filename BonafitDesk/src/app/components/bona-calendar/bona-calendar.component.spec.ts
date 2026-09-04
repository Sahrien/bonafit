import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DateSelectArg, EventClickArg } from '@fullcalendar/core';
import {
  BonaCalendarComponent,
  BonaCalendarEvent,
  fromFullCalendarEvent,
  toFullCalendarEvent,
} from './bona-calendar.component';

describe('BonaCalendarComponent', () => {
  const sample: BonaCalendarEvent = {
    id: 'apt-1',
    title: 'Ana · Masaje',
    start: '2026-09-04T10:00:00',
    end: '2026-09-04T11:00:00',
    trainer: 'Entrenador A',
    client: 'Ana',
    location: 'Sala 1',
    resourceId: 'trainer-a',
  };

  describe('event mapping', () => {
    it('maps DTO fields into FullCalendar events without leaking business modules', () => {
      const mapped = toFullCalendarEvent(sample);

      expect(mapped.id).toBe('apt-1');
      expect(mapped.title).toContain('Ana · Masaje');
      expect(mapped.title).toContain('Sala 1');
      expect(mapped.start).toBe(sample.start);
      expect(mapped.extendedProps).toEqual(
        jasmine.objectContaining({
          trainer: 'Entrenador A',
          client: 'Ana',
          location: 'Sala 1',
          resourceId: 'trainer-a',
          source: sample,
        }),
      );
    });

    it('restores the original DTO from a FullCalendar event', () => {
      const mapped = toFullCalendarEvent(sample);
      const restored = fromFullCalendarEvent({
        id: String(mapped.id),
        title: String(mapped.title),
        start: new Date(sample.start),
        end: new Date(String(sample.end)),
        extendedProps: mapped.extendedProps as Record<string, unknown>,
      });

      expect(restored).toEqual(sample);
    });
  });

  describe('component API', () => {
    let component: BonaCalendarComponent;
    let fixture: ComponentFixture<BonaCalendarComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [BonaCalendarComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(BonaCalendarComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('events', [sample]);
      fixture.detectChanges();
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('builds week view options from generic event inputs', () => {
      const options = component.calendarOptions();
      expect(options.initialView).toBe('timeGridWeek');
      expect(options.events).toEqual([toFullCalendarEvent(sample)]);
    });

    it('emits eventClick with the original DTO', () => {
      const spy = jasmine.createSpy('eventClick');
      component.eventClick.subscribe(spy);

      component.calendarOptions().eventClick?.({
        event: {
          id: sample.id,
          title: 'Ana · Masaje · Sala 1',
          start: new Date(sample.start),
          end: new Date(String(sample.end)),
          extendedProps: { source: sample },
        },
      } as unknown as EventClickArg);

      expect(spy).toHaveBeenCalledWith(sample);
    });

    it('emits slotSelect for a chosen time range', () => {
      const spy = jasmine.createSpy('slotSelect');
      component.slotSelect.subscribe(spy);
      const start = new Date('2026-09-04T12:00:00');
      const end = new Date('2026-09-04T13:00:00');

      component.calendarOptions().select?.({
        start,
        end,
        view: { calendar: { unselect: () => undefined } },
      } as unknown as DateSelectArg);

      expect(spy).toHaveBeenCalledWith({ start, end });
    });
  });
});
