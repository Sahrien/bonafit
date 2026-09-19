import { provideHttpClient } from '@angular/common/http';
import { provideDeskTranslate } from '../../core/i18n/provide-desk-translate';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { MOCK_CLIENTS } from '../../testing/fixtures';
import { provideBonaFeedbackTesting } from '../../testing/bona-feedback';
import { ClientsApiService } from '../../services/clients-api.service';
import { ClientsComponent } from './clients.component';
import { CLIENTS_LITERALS } from './clients.literals';

@Component({
  selector: 'app-client-ficha-stub',
  standalone: true,
  template: 'ficha',
})
class ClientFichaStubComponent {}

describe('ClientsComponent', () => {
  let clientsApi: jasmine.SpyObj<ClientsApiService>;
  let router: Router;

  beforeEach(async () => {
    clientsApi = jasmine.createSpyObj('ClientsApiService', ['getClients']);
    clientsApi.getClients.and.returnValue(of(MOCK_CLIENTS));

    await TestBed.configureTestingModule({
      imports: [ClientsComponent],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(), provideDeskTranslate(),
        provideRouter([
          { path: 'admin/clients', component: ClientsComponent },
          { path: 'admin/clients/:id', component: ClientFichaStubComponent },
        ]),
        { provide: ClientsApiService, useValue: clientsApi },
        ...provideBonaFeedbackTesting().providers,
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  it('loads clients and renders columns from literals', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/clients', ClientsComponent);

    expect(clientsApi.getClients).toHaveBeenCalled();
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain(CLIENTS_LITERALS.title);
    expect(text).toContain(CLIENTS_LITERALS.firstName);
    expect(text).toContain(CLIENTS_LITERALS.lastName);
    expect(text).toContain(CLIENTS_LITERALS.email);
    expect(text).toContain(CLIENTS_LITERALS.phone);
    expect(text).toContain('Marina');
    expect(harness.routeNativeElement?.querySelector('app-bona-grid')).toBeTruthy();
    expect(harness.routeNativeElement?.querySelector('button[mat-icon-button]')).toBeFalsy();
  });

  it('opens the ficha when a client row is clicked', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/clients', ClientsComponent);

    const row = harness.routeNativeElement?.querySelector('tr[mat-row]') as HTMLTableRowElement;
    row.click();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/admin/clients/client-1');
  });
});
