import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { BonaShellClientComponent } from './bona-shell-client.component';

describe('BonaShellClientComponent', () => {
  let component: BonaShellClientComponent;
  let fixture: ComponentFixture<BonaShellClientComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BonaShellClientComponent],
      providers: [provideNoopAnimations(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(BonaShellClientComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.componentRef.setInput('brand', 'Bonafit');
    fixture.componentRef.setInput('userName', 'Cliente Demo');
    fixture.componentRef.setInput('navItems', [
      { id: 'profile', label: 'Datos personales', link: '/app/profile' },
      { id: 'bonos', label: 'Bonos' },
    ]);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the web header with brand, user and nav labels', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Bonafit');
    expect(text).toContain('Cliente Demo');
    expect(text).toContain('Datos personales');
    expect(text).toContain('Bonos');
    expect(text).toContain('Salir');
  });

  it('emits navSelect and navigates when the item has a link', () => {
    const spy = jasmine.createSpy('navSelect');
    component.navSelect.subscribe(spy);
    const navigate = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    const navButtons = fixture.nativeElement.querySelectorAll(
      '.bona-shell-client__nav button',
    ) as NodeListOf<HTMLButtonElement>;
    navButtons[0].click();

    expect(spy).toHaveBeenCalledWith('profile');
    expect(navigate).toHaveBeenCalledWith('/app/profile');
  });

  it('emits logout from the header', () => {
    const spy = jasmine.createSpy('logout');
    component.logout.subscribe(spy);

    const logoutButton = fixture.nativeElement.querySelector(
      '.bona-shell-client__user button',
    ) as HTMLButtonElement;
    logoutButton.click();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
