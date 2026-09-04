import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
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
}

export interface BonaCalendarSlotSelect {
  start: Date;
  end: Date;
}

export function toFullCalendarEvent(event: BonaCalendarEvent): EventInput {
  const titleParts = [event.title];
  if (event.location) {
    titleParts.push(event.location);
  }
  return {
    id: event.id,
    title: titleParts.join(' · '),
    start: event.start,
    end: event.end,
    extendedProps: {
      trainer: event.trainer,
      client: event.client,
      location: event.location,
      resourceId: event.resourceId,
      source: event,
    },
  };
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
  private readonly calendar = viewChild<FullCalendarComponent>('calendar');

  readonly view = input<BonaCalendarView>('week');
  readonly events = input<BonaCalendarEvent[]>([]);
  readonly locale = input('es');

  readonly eventClick = output<BonaCalendarEvent>();
  readonly slotSelect = output<BonaCalendarSlotSelect>();

  readonly calendarOptions = computed<CalendarOptions>(() => ({
    plugins: [timeGridPlugin, interactionPlugin],
    initialView: viewName(this.view()),
    locale: this.locale() === 'es' ? esLocale : this.locale(),
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: '',
    },
    events: this.events().map(toFullCalendarEvent),
    selectable: true,
    selectMirror: true,
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
    effect(() => {
      const nextView = viewName(this.view());
      const api = this.calendar()?.getApi();
      if (api && api.view.type !== nextView) {
        api.changeView(nextView);
      }
    });
  }
}
