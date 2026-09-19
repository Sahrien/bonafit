import { provideHttpClient } from '@angular/common/http';
import { provideDeskTranslate } from '../../core/i18n/provide-desk-translate';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import {
  MOCK_APPOINTMENTS,
  MOCK_BONOS,
  MOCK_CLIENT_BONOS,
  MOCK_CLIENTS,
  MOCK_SERVICES,
  MOCK_TRAINERS,
} from '../../testing/fixtures';
import { BonaToast } from '../../components/bona-toast/bona-toast.service';
import { provideBonaFeedbackTesting } from '../../testing/bona-feedback';
import { clickGridMenuAction } from '../../testing/grid-menu';
import { CalendarApiService } from '../../services/calendar-api.service';
import { ClientsApiService } from '../../services/clients-api.service';
import { ServicesApiService } from '../../services/services-api.service';
import { ClientFichaComponent } from './client-ficha.component';
import { CLIENTS_LITERALS } from './clients.literals';

describe('ClientFichaComponent', () => {
  let clientsApi: jasmine.SpyObj<ClientsApiService>;
  let servicesApi: jasmine.SpyObj<ServicesApiService>;
  let calendarApi: jasmine.SpyObj<CalendarApiService>;

  async function openHistory(
    harness: RouterTestingHarness,
    component: ClientFichaComponent,
  ): Promise<void> {
    component.onToggleHistory();
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();
  }

  beforeEach(async () => {
    clientsApi = jasmine.createSpyObj('ClientsApiService', [
      'getClient',
      'createClient',
      'updateClient',
      'deleteClient',
      'getClientBonos',
      'getCoupons',
      'createCoupon',
      'deleteCoupon',
      'contractBono',
      'deleteClientBono',
    ]);
    servicesApi = jasmine.createSpyObj('ServicesApiService', ['getBonos', 'getServices']);
    calendarApi = jasmine.createSpyObj('CalendarApiService', [
      'getTrainers',
      'getAppointments',
      'updateAppointment',
    ]);
    clientsApi.getClient.and.callFake((id: string) =>
      of(MOCK_CLIENTS.find((client) => client.id === id) ?? MOCK_CLIENTS[0]),
    );
    clientsApi.updateClient.and.returnValue(of(MOCK_CLIENTS[0]));
    clientsApi.getClientBonos.and.callFake((id: string) =>
      of(MOCK_CLIENT_BONOS.filter((row) => row.clientId === id)),
    );
    clientsApi.getCoupons.and.returnValue(of([]));
    clientsApi.getCoupons.and.returnValue(of([]));
    clientsApi.deleteCoupon.and.returnValue(of(void 0));
    clientsApi.createCoupon.and.returnValue(
      of({
        id: 'coupon-new',
        clientId: 'client-1',
        kind: 'percent',
        value: 10,
      }),
    );
    clientsApi.contractBono.and.returnValue(
      of({
        id: 'cb-new',
        clientId: 'client-1',
        bonoId: 'bono-ep-5',
        remainingSessions: 5,
        purchasedAt: '2026-09-17T10:00:00.000Z',
        expiresAt: null,
      }),
    );
    clientsApi.deleteClientBono.and.returnValue(of(void 0));
    servicesApi.getBonos.and.returnValue(of(MOCK_BONOS));
    servicesApi.getServices.and.returnValue(of(MOCK_SERVICES));
    calendarApi.getTrainers.and.returnValue(of(MOCK_TRAINERS));
    calendarApi.getAppointments.and.callFake((query?: { clientId?: string }) =>
      of(MOCK_APPOINTMENTS.filter((row) => !query?.clientId || row.clientId === query.clientId)),
    );
    calendarApi.updateAppointment.and.callFake((id: string, payload) =>
      of({
        ...(MOCK_APPOINTMENTS.find((row) => row.id === id) ?? MOCK_APPOINTMENTS[0]),
        notes: payload.notes ?? '',
      }),
    );

    await TestBed.configureTestingModule({
      imports: [ClientFichaComponent],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(), provideDeskTranslate(),
        provideRouter([{ path: 'admin/clients/:id', component: ClientFichaComponent }]),
        { provide: ClientsApiService, useValue: clientsApi },
        { provide: ServicesApiService, useValue: servicesApi },
        { provide: CalendarApiService, useValue: calendarApi },
        ...provideBonaFeedbackTesting().providers,
      ],
    }).compileComponents();
  });

  it('loads the ficha and shows field literals', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/clients/client-1', ClientFichaComponent);

    expect(clientsApi.getClient).toHaveBeenCalledWith('client-1');
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(CLIENTS_LITERALS.fichaTitle);
    expect(text).toContain(CLIENTS_LITERALS.firstName);
    expect(text).toContain(CLIENTS_LITERALS.lastName);
    expect(text).toContain(CLIENTS_LITERALS.email);
    expect(text).toContain(CLIENTS_LITERALS.phone);
    expect(text).toContain(CLIENTS_LITERALS.notes);
    expect(text).toContain(CLIENTS_LITERALS.instantConfirm);

    const inputs = Array.from(
      harness.routeNativeElement?.querySelectorAll('input') ?? [],
    ) as HTMLInputElement[];
    expect(inputs.some((input) => input.value === 'Marina')).toBeTrue();
    expect(harness.routeNativeElement?.querySelector('app-bona-form')).toBeTruthy();

    const saveBar = harness.routeNativeElement?.querySelector('.page-section__save');
    expect(saveBar?.textContent).toContain(CLIENTS_LITERALS.close);
    expect(saveBar?.textContent).toContain(CLIENTS_LITERALS.save);
    expect(saveBar?.textContent).toContain(CLIENTS_LITERALS.deleteClient);
    expect(harness.routeNativeElement?.querySelector('.bona-page__actions')?.textContent).not.toContain(
      CLIENTS_LITERALS.save,
    );
  });

  it('hides delete profile on a new ficha', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/clients/new', ClientFichaComponent);

    const saveBar = harness.routeNativeElement?.querySelector('.page-section__save');
    expect(saveBar?.textContent).toContain(CLIENTS_LITERALS.close);
    expect(saveBar?.textContent).toContain(CLIENTS_LITERALS.save);
    expect(saveBar?.textContent).not.toContain(CLIENTS_LITERALS.deleteClient);
  });

  it('lists assigned bonos and the gift form', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/clients/client-1', ClientFichaComponent);

    expect(clientsApi.getClientBonos).toHaveBeenCalledWith('client-1');
    expect(servicesApi.getServices).toHaveBeenCalled();
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(CLIENTS_LITERALS.assignedTitle);
    expect(text).toContain('Entrenamiento personal');
    expect(text).toContain('pack-10');
    expect(text).toContain(CLIENTS_LITERALS.gift);
    const assignedHeader = harness.routeNativeElement?.querySelectorAll('.page-section__header')[0];
    expect(assignedHeader?.textContent).toContain(CLIENTS_LITERALS.gift);
  });

  it('hides assigned packs with no remaining sessions', async () => {
    clientsApi.getClientBonos.and.returnValue(
      of([
        {
          id: 'cb-done',
          clientId: 'client-1',
          bonoId: 'bono-ep-10',
          remainingSessions: 0,
          purchasedAt: '2026-06-01T10:00:00.000Z',
          expiresAt: null,
        },
        {
          id: 'cb-open',
          clientId: 'client-1',
          bonoId: 'bono-ep-5',
          remainingSessions: 2,
          purchasedAt: '2026-09-01T10:00:00.000Z',
          expiresAt: null,
        },
      ]),
    );
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/clients/client-1', ClientFichaComponent);

    const assigned = harness.routeNativeElement?.querySelectorAll('.page-section app-bona-grid')[0];
    const text = assigned?.textContent ?? '';
    expect(text).toContain('pack-5');
    expect(text).not.toContain('pack-10');
  });

  it('lists coupons and gifts a new coupon', async () => {
    clientsApi.getCoupons.and.returnValue(
      of([
        {
          id: 'coupon-1',
          clientId: 'client-1',
          kind: 'percent',
          value: 15,
        },
        {
          id: 'coupon-2',
          clientId: 'client-1',
          kind: 'amount',
          value: 20,
        },
      ]),
    );
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/admin/clients/client-1', ClientFichaComponent);

    expect(clientsApi.getCoupons).toHaveBeenCalledWith('client-1');
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(CLIENTS_LITERALS.couponsTitle);
    expect(text).toContain(CLIENTS_LITERALS.giftCoupon);
    expect(text).toContain('15%');
    expect(text).toContain('20 €');
    expect(text).toContain(CLIENTS_LITERALS.couponAny);

    component.onOpenCouponGift();
    harness.fixture.detectChanges();
    const valueField = component.couponFields().find((field) => field.key === 'value');
    expect(valueField?.suffix).toBe('%');
    component.onCouponFormChange({ ...component.couponForm(), kind: 'amount' });
    harness.fixture.detectChanges();
    expect(component.couponFields().find((field) => field.key === 'value')?.suffix).toBe('€');

    component.onCouponSubmit({
      kind: 'amount',
      value: '20',
      scope: 'any',
      serviceId: '',
      bonoId: '',
    });
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(clientsApi.createCoupon).toHaveBeenCalledWith('client-1', {
      kind: 'amount',
      value: 20,
    });
  });

  it('toasts when the client is saved', async () => {
    const toast = TestBed.inject(BonaToast) as jasmine.SpyObj<BonaToast>;
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/admin/clients/client-1', ClientFichaComponent);

    component.onSubmit({
      firstName: 'Marina',
      lastName: 'Lopez',
      email: 'marina.lopez@example.com',
      phone: '+34000000001',
      notes: '',
      instantConfirm: 'true',
    });
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(clientsApi.updateClient).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith(CLIENTS_LITERALS.saved);
  });

  it('creates a client with an empty phone', async () => {
    const toast = TestBed.inject(BonaToast) as jasmine.SpyObj<BonaToast>;
    clientsApi.createClient.and.returnValue(of({ ...MOCK_CLIENTS[0], id: 'client-new', phone: '' }));
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/admin/clients/new', ClientFichaComponent);

    component.onSubmit({
      firstName: 'Nia',
      lastName: 'Costa',
      email: 'nia.costa@example.com',
      phone: '',
      notes: '',
      instantConfirm: 'false',
    });
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(clientsApi.createClient).toHaveBeenCalledWith({
      firstName: 'Nia',
      lastName: 'Costa',
      email: 'nia.costa@example.com',
      phone: '',
      notes: '',
      instantConfirm: false,
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('does not create a client with an incomplete email', async () => {
    const toast = TestBed.inject(BonaToast) as jasmine.SpyObj<BonaToast>;
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/admin/clients/new', ClientFichaComponent);

    component.onSubmit({
      firstName: 'Nia',
      lastName: 'Costa',
      email: 'a',
      phone: '',
      notes: '',
      instantConfirm: 'false',
    });
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(clientsApi.createClient).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(CLIENTS_LITERALS.errorEmail);
  });

  it('keeps the session history collapsed until asked', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/clients/client-1', ClientFichaComponent);

    expect(calendarApi.getAppointments).not.toHaveBeenCalled();
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(CLIENTS_LITERALS.historyTitle);
    const toggle = harness.routeNativeElement?.querySelector('.history-toggle') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-label')).toBe(CLIENTS_LITERALS.showHistory);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(text).not.toContain('Alex Martin');
    expect(text).not.toContain('Buena sesión de fuerza.');
  });

  it('lists the session history for the client', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/admin/clients/client-1', ClientFichaComponent);
    await openHistory(harness, component);

    expect(calendarApi.getAppointments).toHaveBeenCalledWith({ clientId: 'client-1' });
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(CLIENTS_LITERALS.historyTitle);
    expect(harness.routeNativeElement?.querySelector('.history-toggle')?.getAttribute('aria-label')).toBe(
      CLIENTS_LITERALS.hideHistory,
    );
    expect(text).toContain('Alex Martin');
    expect(text).toContain(CLIENTS_LITERALS.statusCompleted);
    expect(text).toContain('Buena sesión de fuerza.');
  });

  it('filters the session history from the column field', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/admin/clients/client-1', ClientFichaComponent);
    await openHistory(harness, component);

    const notesFilter = Array.from(
      harness.routeNativeElement?.querySelectorAll('.bona-grid__table .bona-grid__filter') ?? [],
    ).find((input) => input.getAttribute('aria-label')?.includes(CLIENTS_LITERALS.sessionNotes)) as
      | HTMLInputElement
      | undefined;
    expect(notesFilter).toBeTruthy();
    notesFilter!.value = 'zzz';
    notesFilter!.dispatchEvent(new Event('input'));
    harness.fixture.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain(CLIENTS_LITERALS.emptyHistoryFilter);

    notesFilter!.value = 'fuerza';
    notesFilter!.dispatchEvent(new Event('input'));
    harness.fixture.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Buena sesión de fuerza.');
  });

  it('sorts the session history from the column header', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/admin/clients/client-1', ClientFichaComponent);
    await openHistory(harness, component);

    const sort = Array.from(
      harness.routeNativeElement?.querySelectorAll('.bona-grid__table .bona-grid__sort') ?? [],
    ).find((button) => button.getAttribute('aria-label')?.includes(CLIENTS_LITERALS.sessionWhen)) as
      | HTMLButtonElement
      | undefined;
    expect(sort).toBeTruthy();
    sort!.click();
    harness.fixture.detectChanges();
    expect(sort!.getAttribute('aria-label')).toContain(CLIENTS_LITERALS.sessionWhen);
    expect(harness.routeNativeElement?.textContent).toContain('Buena sesión de fuerza.');
  });

  it('saves a session note', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/admin/clients/client-1', ClientFichaComponent);
    await openHistory(harness, component);

    clickGridMenuAction(harness.routeNativeElement, CLIENTS_LITERALS.editSessionNote, {
      rowText: 'Buena sesión de fuerza.',
    });
    component.onSaveSessionNote({ notes: 'Más movilidad.' });
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(calendarApi.updateAppointment).toHaveBeenCalled();
    const payload = calendarApi.updateAppointment.calls.mostRecent().args[1];
    expect(payload.notes).toBe('Más movilidad.');
  });

  it('labels a gifted session as regalo', async () => {
    clientsApi.getClientBonos.and.returnValue(
      of([
        {
          id: 'cb-gift',
          clientId: 'client-1',
          bonoId: 'bono-ep-10',
          remainingSessions: 1,
          isGift: true,
          purchasedAt: '2026-09-17T10:00:00.000Z',
          expiresAt: null,
        },
      ]),
    );
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/clients/client-1', ClientFichaComponent);

    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(CLIENTS_LITERALS.giftCredit);
    expect(text).not.toContain('pack-10');
  });

  it('gifts a catalog pack to the client', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/admin/clients/client-1', ClientFichaComponent);

    component.onGiftSubmit({
      serviceId: 'svc-ep',
      kind: 'pack',
      bonoId: 'bono-ep-5',
    });
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(clientsApi.contractBono).toHaveBeenCalledWith({
      clientId: 'client-1',
      bonoId: 'bono-ep-5',
      isGift: true,
    });
  });

  it('gifts a single session of a service', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/admin/clients/client-1', ClientFichaComponent);

    component.onGiftSubmit({
      serviceId: 'svc-ep',
      kind: 'single',
      bonoId: '',
    });
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(clientsApi.contractBono).toHaveBeenCalledWith({
      clientId: 'client-1',
      serviceId: 'svc-ep',
      remainingSessions: 1,
      isGift: true,
    });
  });

  it('unassigns a client bono', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/clients/client-1', ClientFichaComponent);

    clickGridMenuAction(harness.routeNativeElement, CLIENTS_LITERALS.unassign, {
      rowText: 'pack-10',
    });
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    expect(clientsApi.deleteClientBono).toHaveBeenCalledWith('cb-1');
  });
});
