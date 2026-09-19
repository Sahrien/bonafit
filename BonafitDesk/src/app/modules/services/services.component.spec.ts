import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideDeskTranslate } from '../../core/i18n/provide-desk-translate';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { MOCK_BONOS, MOCK_SERVICES } from '../../testing/fixtures';
import { provideBonaFeedbackTesting } from '../../testing/bona-feedback';
import { BonaToast } from '../../components/bona-toast/bona-toast.service';
import { ServicesApiService } from '../../services/services-api.service';
import { ServicesComponent } from './services.component';
import { SERVICES_LITERALS } from './services.literals';

describe('ServicesComponent', () => {
  let fixture: ComponentFixture<ServicesComponent>;
  let servicesApi: jasmine.SpyObj<ServicesApiService>;

  beforeEach(async () => {
    servicesApi = jasmine.createSpyObj('ServicesApiService', [
      'getServices',
      'getBonos',
      'createService',
      'updateService',
      'deleteService',
      'createBono',
      'updateBono',
      'deleteBono',
    ]);
    servicesApi.getServices.and.returnValue(of(MOCK_SERVICES));
    servicesApi.getBonos.and.returnValue(of(MOCK_BONOS));

    await TestBed.configureTestingModule({
      imports: [ServicesComponent],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(), provideDeskTranslate(),
        { provide: ServicesApiService, useValue: servicesApi },
        ...provideBonaFeedbackTesting().providers,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ServicesComponent);
    fixture.detectChanges();
  });

  it('loads services and renders columns from literals', () => {
    expect(servicesApi.getServices).toHaveBeenCalled();
    expect(servicesApi.getBonos).toHaveBeenCalled();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain(SERVICES_LITERALS.title);
    expect(text).toContain(SERVICES_LITERALS.name);
    expect(text).toContain(SERVICES_LITERALS.durationMinutes);
    expect(text).toContain(SERVICES_LITERALS.price);
    expect(text).toContain(SERVICES_LITERALS.kind);
    expect(text).toContain(SERVICES_LITERALS.sessionCount);
    expect(text).toContain(SERVICES_LITERALS.sale);
    expect(text).toContain('Entrenamiento personal');
    expect(text).toContain('pack-10');
    expect(text).toContain('Masaje');
    expect(fixture.nativeElement.querySelector('app-bona-grid')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.page-toolbar')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.bona-grid__filter-row')).toBeNull();
    expect(fixture.nativeElement.querySelector('.bona-grid__pager')).toBeNull();
    expect(catalogNames(fixture)).toEqual([
      'Entrenamiento personal',
      'pack-5',
      'pack-10',
      'Hipopresivos',
      'pack-8',
      'Masaje',
      'sesion-suelta',
    ]);
  });

  it('keeps the matching service and all of its packs when searching', () => {
    fixture.componentInstance.onSearch('ck-8');
    fixture.detectChanges();

    let text = fixture.nativeElement.textContent as string;
    expect(text).toContain('pack-8');
    expect(text).toContain('Hipopresivos');
    expect(text).not.toContain('pack-10');
    expect(text).not.toContain('pack-5');
    expect(text).not.toContain('Entrenamiento personal');
    expect(text).not.toContain('Masaje');

    fixture.componentInstance.onSearch('pack-10');
    fixture.detectChanges();
    text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Entrenamiento personal');
    expect(text).toContain('pack-5');
    expect(text).toContain('pack-10');
    expect(text).not.toContain('Hipopresivos');
    expect(text).not.toContain('Masaje');
  });

  it('opens the service editor over the catalog table', () => {
    fixture.componentInstance.onCreateService();
    fixture.detectChanges();

    const catalog = fixture.nativeElement.querySelector('.services-catalog') as HTMLElement;
    const list = fixture.nativeElement.querySelector('.services-catalog__list') as HTMLElement;
    const editor = fixture.nativeElement.querySelector('.services-catalog__editor') as HTMLElement;
    expect(catalog.classList.contains('services-catalog--detail')).toBeTrue();
    expect(getComputedStyle(list).display).toBe('none');
    expect(editor).toBeTruthy();
    expect(getComputedStyle(editor).position).not.toBe('absolute');
    expect(fixture.nativeElement.textContent).toContain(SERVICES_LITERALS.serviceEditor);
  });

  it('opens nested bonos for a service', () => {
    fixture.componentInstance.onServiceRowClick({ id: 'svc-masaje' });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain(SERVICES_LITERALS.bonosTitle);
    expect(text).toContain(SERVICES_LITERALS.price);
    expect(text).toContain('sesion-suelta');
    expect(text).toContain('45');
    expect(fixture.nativeElement.querySelectorAll('.services-catalog__editor app-bona-grid').length).toBe(1);
  });

  it('saves a new service with only the Spanish name and duration', () => {
    servicesApi.createService.and.returnValue(
      of({ ...MOCK_SERVICES[0], id: 'svc-pilates', name: 'Pilates' }),
    );
    fixture.componentInstance.onCreateService();
    fixture.detectChanges();

    const nameEs = fixture.nativeElement.querySelector('[data-field-key="nameEs"]') as HTMLInputElement;
    nameEs.value = 'Pilates';
    nameEs.dispatchEvent(new Event('input'));
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain(SERVICES_LITERALS.errorRequired);
    expect(servicesApi.createService).toHaveBeenCalled();
    const payload = servicesApi.createService.calls.mostRecent().args[0];
    expect(payload.name).toBe('Pilates');
    expect(payload.i18n?.['name']?.['en']).toBe('Pilates');
    expect(payload.durationMinutes).toBe(60);
    expect(payload.sharesSessionPool).toBeTrue();
    expect(fixture.nativeElement.querySelector('.services-catalog__editor')).toBeNull();
    expect(fixture.nativeElement.querySelector('.services-catalog--detail')).toBeNull();
  });

  it('puts close next to the editor title', () => {
    fixture.componentInstance.onCreateService();
    fixture.detectChanges();

    const pageActions = fixture.nativeElement.querySelector('.bona-page__actions') as HTMLElement;
    expect(pageActions.textContent).not.toContain(SERVICES_LITERALS.close);
    expect(fixture.nativeElement.querySelector('.services-catalog__editor-header')?.textContent).toContain(
      SERVICES_LITERALS.close,
    );
  });

  it('shows percent or euro on the sale value field', () => {
    fixture.componentInstance.onCreateService();
    fixture.componentInstance.onServiceFormChange({
      ...fixture.componentInstance.serviceForm(),
      saleKind: 'percent',
    });
    fixture.detectChanges();

    const saleField = saleValueField(fixture);
    expect(saleField?.textContent).toContain('%');

    fixture.componentInstance.onServiceFormChange({
      ...fixture.componentInstance.serviceForm(),
      saleKind: 'amount',
    });
    fixture.detectChanges();
    expect(saleValueField(fixture)?.textContent).toContain('€');
  });

  it('explains session-pack flags in the service editor', () => {
    fixture.componentInstance.onCreateService();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain(SERVICES_LITERALS.forcesSingleSession);
    expect(text).toContain(SERVICES_LITERALS.forcesSingleSessionHint);
    expect(text).toContain(SERVICES_LITERALS.allowsSingleSession);
    expect(text).toContain(SERVICES_LITERALS.allowsSingleSessionHint);
  });

  it('explains a 422 sale percent error instead of a generic save failure', () => {
    const toast = TestBed.inject(BonaToast) as jasmine.SpyObj<BonaToast>;
    servicesApi.createService.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 422,
            error: {
              detail: [{ loc: ['body'], msg: 'Value error, sale percent cannot exceed 100' }],
            },
          }),
      ),
    );
    submitNewService(fixture);

    expect(toast.error).toHaveBeenCalledWith(SERVICES_LITERALS.errorSalePercent);
    expect(fixture.nativeElement.textContent).not.toContain(SERVICES_LITERALS.errorSalePercent);
    expect(toast.error).not.toHaveBeenCalledWith(SERVICES_LITERALS.errorSave);
  });

  it('explains a network failure when saving a service', () => {
    const toast = TestBed.inject(BonaToast) as jasmine.SpyObj<BonaToast>;
    servicesApi.createService.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' })),
    );
    submitNewService(fixture);

    expect(toast.error).toHaveBeenCalledWith(SERVICES_LITERALS.errorConnection);
    expect(fixture.nativeElement.textContent).not.toContain(SERVICES_LITERALS.errorConnection);
  });
});

function submitNewService(fixture: ComponentFixture<ServicesComponent>): void {
  fixture.componentInstance.onCreateService();
  fixture.detectChanges();
  const nameEs = fixture.nativeElement.querySelector('[data-field-key="nameEs"]') as HTMLInputElement;
  nameEs.value = 'Pilates';
  nameEs.dispatchEvent(new Event('input'));
  const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  fixture.detectChanges();
}

function saleValueField(fixture: ComponentFixture<ServicesComponent>): HTMLElement | null {
  return fixture.nativeElement.querySelector('[data-field-key="saleValue"]')?.closest('app-bona-field') ?? null;
}

function catalogNames(fixture: ComponentFixture<ServicesComponent>): string[] {
  return [...fixture.nativeElement.querySelectorAll('.services-catalog__list tbody tr td:first-of-type')].map((cell) =>
    (cell.textContent ?? '').trim(),
  );
}
