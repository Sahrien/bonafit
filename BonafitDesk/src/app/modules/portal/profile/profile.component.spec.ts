import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { AuthSessionDto } from '../../../models/auth-session.dto';
import { ClientDto } from '../../../models/client.dto';
import { AuthApiService } from '../../../services/auth-api.service';
import { ClientsApiService } from '../../../services/clients-api.service';
import { ProfileComponent } from './profile.component';
import { PROFILE_LITERALS } from './profile.literals';

describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let authApi: jasmine.SpyObj<AuthApiService>;
  let clientsApi: jasmine.SpyObj<ClientsApiService>;

  const session: AuthSessionDto = {
    token: 't',
    user: {
      id: 'user-client-1',
      displayName: 'Marina Lopez',
      role: 'client',
      clientId: 'client-1',
    },
  };

  const client: ClientDto = {
    id: 'client-1',
    firstName: 'Marina',
    lastName: 'Lopez',
    email: 'marina.lopez@example.com',
    phone: '+34000000001',
    notes: '',
  };

  beforeEach(async () => {
    authApi = jasmine.createSpyObj('AuthApiService', ['getSession']);
    clientsApi = jasmine.createSpyObj('ClientsApiService', ['getClient', 'updateClient']);
    authApi.getSession.and.returnValue(of(session));
    clientsApi.getClient.and.returnValue(of(client));
    clientsApi.updateClient.and.returnValue(of(client));

    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AuthApiService, useValue: authApi },
        { provide: ClientsApiService, useValue: clientsApi },
      ],
    }).compileComponents();
  });

  function create(): Promise<void> {
    fixture = TestBed.createComponent(ProfileComponent);
    fixture.detectChanges();
    return fixture.whenStable().then(() => fixture.detectChanges());
  }

  it('loads the logged-in client into app-bona-form', async () => {
    await create();

    expect(clientsApi.getClient).toHaveBeenCalledWith('client-1');
    expect(fixture.nativeElement.querySelector('app-bona-form')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain(PROFILE_LITERALS.firstName);

    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    const values = Array.from(inputs).map((input) => input.value);
    expect(values).toContain('Marina');
    expect(values).toContain('Lopez');
    expect(values).toContain('marina.lopez@example.com');
  });

  it('saves personal data through updateClient', async () => {
    const updated: ClientDto = { ...client, firstName: 'Marina Rosa' };
    clientsApi.updateClient.and.returnValue(of(updated));
    await create();

    const firstName = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    firstName.value = 'Marina Rosa';
    firstName.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(clientsApi.updateClient).toHaveBeenCalledWith('client-1', {
      firstName: 'Marina Rosa',
      lastName: 'Lopez',
      email: 'marina.lopez@example.com',
      phone: '+34000000001',
      notes: '',
    });
    expect(fixture.nativeElement.textContent).toContain(PROFILE_LITERALS.saved);
  });

  it('shows an error when the ficha cannot be loaded', async () => {
    clientsApi.getClient.and.returnValue(throwError(() => new Error('fail')));
    await create();

    expect(fixture.nativeElement.querySelector('app-bona-form')).toBeFalsy();
    expect(fixture.nativeElement.textContent).toContain(PROFILE_LITERALS.loadError);
  });
});
