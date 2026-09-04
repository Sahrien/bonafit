import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MOCK_BONOS, MOCK_SERVICES } from '../../core/mock-data';
import { ServicesApiService } from '../../services/services-api.service';
import { ServicesComponent } from './services.component';
import { SERVICE_CATEGORY_LABELS, SERVICES_LITERALS } from './services.literals';

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
        { provide: ServicesApiService, useValue: servicesApi },
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
    expect(text).toContain(SERVICES_LITERALS.category);
    expect(text).toContain(SERVICES_LITERALS.allowsSingleSession);
    expect(text).toContain(SERVICES_LITERALS.singleSessionPrice);
    expect(text).toContain(SERVICE_CATEGORY_LABELS.masaje);
    expect(fixture.nativeElement.querySelector('app-bona-grid')).toBeTruthy();
  });

  it('opens nested bonos and single-session price for masaje', () => {
    fixture.componentInstance.onServiceRowClick({ id: 'svc-masaje' });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain(SERVICES_LITERALS.bonosTitle);
    expect(text).toContain(SERVICES_LITERALS.singleSessionPrice);
    expect(text).toContain('pack-5');
    expect(text).toContain('45');
    expect(fixture.nativeElement.querySelectorAll('app-bona-grid').length).toBe(2);
  });
});
