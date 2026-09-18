import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, DateSelectArg, EventClickArg, EventInput } from '@fullcalendar/core';
import esLocale from '@fullcalendar/core/locales/es';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';

export type BonaCalendarView = 'week' | 'day';

export interface BonaCalendarEvent {
  id: string;
  title: string;
  start: string | Date;
  end?: string | Date;
  trainer?: string;
  client?: string;
  location?: string;
  resourceId?: string;
  color?: string;
  classNames?: string[];
  interactive?: boolean;
}

export interface BonaCalendarSlotSelect {
  start: Date;
  end: Date;
}

export function toFullCalendarEvent(event: BonaCalendarEvent): EventInput {
  const mapped: EventInput = {
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    backgroundColor: event.color,
    borderColor: event.color,
    classNames: event.classNames,
    extendedProps: {
      trainer: event.trainer,
      client: event.client,
      location: event.location,
      resourceId: event.resourceId,
      source: event,
    },
  };
  if (typeof event.interactive === 'boolean') {
    mapped.interactive = event.interactive;
  }
  return mapped;
}

export function fromFullCalendarEvent(event: {
  id: string;
  title: string;
  start: Date | null;
  end: Date | null;
  extendedProps: Record<string, unknown>;
}): BonaCalendarEvent {
  const source = event.extendedProps['source'];
  if (source && typeof source === 'object') {
    return source as BonaCalendarEvent;
  }
  return {
    id: event.id,
    title: event.title,
    start: event.start ?? '',
    end: event.end ?? undefined,
    trainer: optionalString(event.extendedProps['trainer']),
    client: optionalString(event.extendedProps['client']),
    location: optionalString(event.extendedProps['location']),
    resourceId: optionalString(event.extendedProps['resourceId']),
  };
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function viewName(view: BonaCalendarView): 'timeGridWeek' | 'timeGridDay' {
  return view === 'day' ? 'timeGridDay' : 'timeGridWeek';
}

@Component({
  selector: 'app-bona-calendar',
  standalone: true,
  imports: [FullCalendarModule],
  templateUrl: './bona-calendar.component.html',
  styleUrl: './bona-calendar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BonaCalendarComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly calendar = viewChild<FullCalendarComponent>('calendar');

  readonly view = input<BonaCalendarView>('week');
  readonly events = input<BonaCalendarEvent[]>([]);
  readonly locale = input('es');
  readonly selectable = input(true);
  readonly showHeader = input(true);
  readonly focusDate = input<Date | undefined>();

  readonly eventClick = output<BonaCalendarEvent>();
  readonly slotSelect = output<BonaCalendarSlotSelect>();

  readonly calendarOptions = computed<CalendarOptions>(() => ({
    plugins: [timeGridPlugin, interactionPlugin],
    initialView: viewName(this.view()),
    locale: this.locale() === 'es' ? esLocale : this.locale(),
    headerToolbar: this.showHeader()
      ? {
          left: 'prev,next today',
          center: 'title',
          right: '',
        }
      : false,
    events: this.events().map(toFullCalendarEvent),
    selectable: this.selectable(),
    selectMirror: true,
    selectOverlap: true,
    eventOverlap: true,
    slotEventOverlap: false,
    allDaySlot: false,
    slotMinTime: '07:00:00',
    slotMaxTime: '22:00:00',
    height: 'auto',
    eventClick: (info: EventClickArg) => {
      this.eventClick.emit(
        fromFullCalendarEvent({
          id: info.event.id,
          title: info.event.title,
          start: info.event.start,
          end: info.event.end,
          extendedProps: info.event.extendedProps,
        }),
      );
    },
    select: (info: DateSelectArg) => {
      this.slotSelect.emit({ start: info.start, end: info.end });
      info.view.calendar.unselect();
    },
  }));

  constructor() {
    afterNextRender(() => {
      this.syncSize();
      const observer = new ResizeObserver(() => this.syncSize());
      observer.observe(this.host.nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
    effect(() => {
      const nextView = viewName(this.view());
      const api = this.calendar()?.getApi();
      if (api && api.view.type !== nextView) {
        api.changeView(nextView);
      }
    });
    effect(() => {
      const date = this.focusDate();
      const api = this.calendar()?.getApi();
      if (!api || !date) {
        return;
      }
      const current = api.getDate();
      if (current.toDateString() !== date.toDateString()) {
        api.gotoDate(date);
      }
    });
  }

  private syncSize(): void {
    if (this.host.nativeElement.clientWidth <= 0) {
      return;
    }
    this.calendar()?.getApi()?.updateSize();
  }
}
