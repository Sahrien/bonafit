import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { routes } from '../../app.routes';
import { AUTH_PATHS } from '../../core/auth/auth.paths';
import { AuthApiService } from '../../services/auth-api.service';
import { CalendarApiService } from '../../services/calendar-api.service';
import { provideBonaFeedbackTesting } from '../../testing/bona-feedback';
import {
  MOCK_ACCOUNTS,
  MOCK_TRAINERS,
  MOCK_TRAINER_SCHEDULES,
  createMockSession,
} from '../../testing/fixtures';
import { SCHEDULES_LITERALS } from '../schedules/schedules.literals';

describe('ADMIN_ROUTES horarios', () => {
  beforeEach(async () => {
    const auth = jasmine.createSpyObj('AuthApiService', ['getSession', 'logout']);
    auth.getSession.and.returnValue(of(createMockSession(MOCK_ACCOUNTS[0])));
    const calendarApi = jasmine.createSpyObj('CalendarApiService', [
      'getTrainers',
      'getTrainerSchedules',
    ]);
    calendarApi.getTrainers.and.returnValue(of(MOCK_TRAINERS));
    calendarApi.getTrainerSchedules.and.returnValue(of(MOCK_TRAINER_SCHEDULES));

    await TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        provideRouter(routes),
        { provide: AuthApiService, useValue: auth },
        { provide: CalendarApiService, useValue: calendarApi },
        ...provideBonaFeedbackTesting().providers,
      ],
    }).compileComponents();
  });

  it('loads the schedules screen at /admin/horarios', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(AUTH_PATHS.adminSchedules);
    expect(TestBed.inject(Router).url).toBe(AUTH_PATHS.adminSchedules);
    expect(harness.routeNativeElement?.textContent).toContain(SCHEDULES_LITERALS.subtitle);
    expect(harness.routeNativeElement?.textContent).toContain(SCHEDULES_LITERALS.newSchedule);
  });
});
