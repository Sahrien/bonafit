import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { BonaConfirm } from '../../../components/bona-confirm/bona-confirm.service';
import { BonaToast } from '../../../components/bona-toast/bona-toast.service';
import { provideDeskTranslate } from '../../../core/i18n/provide-desk-translate';
import { MOCK_APPOINTMENTS, MOCK_BOOKING_SETTINGS, MOCK_CLIENTS, MOCK_SERVICES, MOCK_TRAINERS } from '../../../testing/fixtures';
import { provideBonaFeedbackTesting } from '../../../testing/bona-feedback';
import { CalendarApiService } from '../../../services/calendar-api.service';
import { ClientsApiService } from '../../../services/clients-api.service';
import { CALENDAR_LITERALS } from '../calendar.literals';
import { AppointmentEditorComponent, AppointmentEditorData } from './appointment-editor.component';

describe('AppointmentEditorComponent', () => {
  let fixture: ComponentFixture<AppointmentEditorComponent>;
  let calendarApi: jasmine.SpyObj<CalendarApiService>;
  let clientsApi: jasmine.SpyObj<ClientsApiService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AppointmentEditorComponent, boolean>>;
  let router: Router;

  const catalog: AppointmentEditorData = {
    appointment: null,
    preset: {
      trainerId: 'trainer-1',
      clientId: '',
      serviceId: '',
      clientBonoId: '',
      startsAt: '',
      endsAt: '',
      location: MOCK_BOOKING_SETTINGS.defaultLocation,
      status: 'confirmed',
      notes: '',
    },
    trainers: MOCK_TRAINERS,
    clients: MOCK_CLIENTS,
    services: MOCK_SERVICES,
    bonos: [],
    settings: MOCK_BOOKING_SETTINGS,
  };

  async function create(data: AppointmentEditorData = catalog): Promise<void> {
    TestBed.resetTestingModule();
    calendarApi = jasmine.createSpyObj('CalendarApiService', ['createAppointment', 'updateAppointment']);
    clientsApi = jasmine.createSpyObj('ClientsApiService', ['getClientBonos']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    calendarApi.createAppointment.and.returnValue(of(MOCK_APPOINTMENTS[0]));
    calendarApi.updateAppointment.and.returnValue(of(MOCK_APPOINTMENTS[0]));
    clientsApi.getClientBonos.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [AppointmentEditorComponent],
      providers: [
        provideNoopAnimations(),
        provideDeskTranslate(),
        provideHttpClient(),
        provideRouter([]),
        { provide: CalendarApiService, useValue: calendarApi },
        { provide: ClientsApiService, useValue: clientsApi },
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
        ...provideBonaFeedbackTesting().providers,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppointmentEditorComponent);
    fixture.detectChanges();
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl');
  }

  it('shows compact fields and reveals extras under more options', async () => {
    await create();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain(CALENDAR_LITERALS.client);
    expect(text).toContain(CALENDAR_LITERALS.service);
    expect(text).toContain(CALENDAR_LITERALS.trainer);
    expect(text).toContain(CALENDAR_LITERALS.startsAt);
    expect(text).not.toContain(CALENDAR_LITERALS.endsAt);
    expect(text).not.toContain(CALENDAR_LITERALS.location);
    expect(text).toContain(CALENDAR_LITERALS.moreOptions);

    fixture.componentInstance.onToggleMore();
    fixture.detectChanges();
    const expanded = fixture.nativeElement.textContent as string;
    expect(expanded).toContain(CALENDAR_LITERALS.bono);
    expect(expanded).toContain(CALENDAR_LITERALS.location);
    expect(expanded).toContain(CALENDAR_LITERALS.sessionNotes);
  });

  it('creates a gift appointment and closes the dialog', async () => {
    await create();
    fixture.componentInstance.onSubmit({
      trainerId: 'trainer-1',
      clientId: 'client-1',
      serviceId: 'svc-ep',
      clientBonoId: '',
      startsAt: '2026-09-09T10:00',
      endsAt: '2026-09-09T11:00',
      location: 'Studio',
      status: 'confirmed',
    });
    expect(calendarApi.createAppointment).toHaveBeenCalled();
    const payload = calendarApi.createAppointment.calls.mostRecent().args[0];
    expect(payload.clientBonoId).toBeNull();
    expect(dialogRef.close).toHaveBeenCalledWith(true);
    const toast = TestBed.inject(BonaToast) as jasmine.SpyObj<BonaToast>;
    expect(toast.success).toHaveBeenCalledWith(CALENDAR_LITERALS.saved);
  });

  it('sends the gift clientBonoId when booking a gifted session', async () => {
    await create();
    fixture.componentInstance.onSubmit({
      trainerId: 'trainer-1',
      clientId: 'client-1',
      serviceId: 'svc-ep',
      clientBonoId: 'cb-gift',
      startsAt: '2026-09-09T10:00',
      endsAt: '2026-09-09T11:00',
      location: 'Studio',
      status: 'confirmed',
    });
    const payload = calendarApi.createAppointment.calls.mostRecent().args[0];
    expect(payload.clientBonoId).toBe('cb-gift');
  });

  it('toasts when required appointment fields are missing', async () => {
    await create();
    const toast = TestBed.inject(BonaToast) as jasmine.SpyObj<BonaToast>;
    fixture.componentInstance.onSubmit({
      trainerId: '',
      clientId: '',
      serviceId: '',
      startsAt: '',
      endsAt: '',
      location: '',
      status: 'confirmed',
    });
    expect(toast.error).toHaveBeenCalledWith(CALENDAR_LITERALS.errorRequired);
    expect(calendarApi.createAppointment).not.toHaveBeenCalled();
  });

  it('opens in edit mode and asks before marking completed', async () => {
    await create({
      ...catalog,
      appointment: MOCK_APPOINTMENTS[2],
      preset: undefined,
    });
    expect(fixture.nativeElement.textContent).toContain(CALENDAR_LITERALS.editAppointment);
    const confirm = TestBed.inject(BonaConfirm) as jasmine.SpyObj<BonaConfirm>;
    fixture.componentInstance.onComplete();
    expect(confirm.open).toHaveBeenCalled();
    expect(calendarApi.updateAppointment).toHaveBeenCalled();
    const payload = calendarApi.updateAppointment.calls.mostRecent().args[1];
    expect(payload.status).toBe('completed');
  });

  it('opens the client ficha from a clean form', async () => {
    await create({
      ...catalog,
      appointment: MOCK_APPOINTMENTS[0],
      preset: undefined,
    });
    fixture.componentInstance.onOpenClient();
    expect(router.navigateByUrl).toHaveBeenCalledWith(`/admin/clients/${MOCK_APPOINTMENTS[0].clientId}`);
    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });

  it('asks before opening the client ficha when the form is dirty', async () => {
    await create({
      ...catalog,
      appointment: MOCK_APPOINTMENTS[0],
      preset: undefined,
    });
    const confirm = TestBed.inject(BonaConfirm) as jasmine.SpyObj<BonaConfirm>;
    confirm.open.and.returnValue(of(false));
    fixture.componentInstance.onFormChange({
      ...fixture.componentInstance.formValue(),
      notes: 'Cambio sin guardar',
    });
    fixture.componentInstance.onOpenClient();
    expect(confirm.open).toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('offers cancel on pending appointments', async () => {
    await create({
      ...catalog,
      appointment: { ...MOCK_APPOINTMENTS[2], id: 'apt-pending', status: 'pending' },
      preset: undefined,
    });
    const menuTrigger = fixture.nativeElement.querySelector(
      `[aria-label="${CALENDAR_LITERALS.moreActions}"]`,
    ) as HTMLButtonElement;
    expect(menuTrigger).toBeTruthy();
    menuTrigger.click();
    fixture.detectChanges();
    expect(document.body.textContent).toContain(CALENDAR_LITERALS.cancelAppointment);
  });
});
