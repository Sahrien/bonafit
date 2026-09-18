import { provideHttpClient } from '@angular/common/http';
import { provideDeskTranslate } from '../../core/i18n/provide-desk-translate';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MOCK_BONOS, MOCK_SERVICES } from '../../testing/fixtures';
import { provideBonaFeedbackTesting } from '../../testing/bona-feedback';
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
    expect(text).toContain('Entrenamiento personal');
    expect(text).toContain('pack-10');
    expect(text).toContain('Masaje');
    expect(fixture.nativeElement.querySelector('app-bona-grid')).toBeTruthy();
  });

  it('filters the catalog by a partial bono name', () => {
    fixture.componentInstance.onSearch('pack 8');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('pack-8');
    expect(text).toContain('Hipopresivos');
    expect(text).not.toContain('pack-10');
    expect(text).not.toContain('pack-5');
    expect(text).not.toContain('Entrenamiento personal');
    expect(text).not.toContain('Masaje');
  });

  it('filters the catalog by bono description fragments', () => {
    fixture.componentInstance.onSearch('sessions 5');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('pack-5');
    expect(text).toContain('Entrenamiento personal');
    expect(text).not.toContain('pack-10');
    expect(text).not.toContain('Hipopresivos');
  });

  it('keeps a bono that contains the query under its service', () => {
    fixture.componentInstance.onSearch('10');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('pack-10');
    expect(text).toContain('Entrenamiento personal');
    expect(text).not.toContain('pack-5');
    expect(text).not.toContain('Hipopresivos');
  });

  it('opens nested bonos for a service', () => {
    fixture.componentInstance.onServiceRowClick({ id: 'svc-masaje' });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain(SERVICES_LITERALS.bonosTitle);
    expect(text).toContain(SERVICES_LITERALS.price);
    expect(text).toContain('sesion-suelta');
    expect(text).toContain('45');
    expect(fixture.nativeElement.querySelectorAll('app-bona-grid').length).toBe(2);
  });
});
