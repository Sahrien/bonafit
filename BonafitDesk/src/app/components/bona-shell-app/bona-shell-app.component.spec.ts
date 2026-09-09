import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { BonaShellAppComponent } from './bona-shell-app.component';

describe('BonaShellAppComponent', () => {
  let component: BonaShellAppComponent;
  let fixture: ComponentFixture<BonaShellAppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BonaShellAppComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([
          { path: 'admin/calendar', component: BonaShellAppComponent },
          { path: 'admin/clients', component: BonaShellAppComponent },
          { path: 'admin/ajustes', component: BonaShellAppComponent },
        ]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BonaShellAppComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('brand', 'Bonafit');
    fixture.componentRef.setInput('userName', 'Alex Martin');
    fixture.componentRef.setInput('navItems', [
      { id: 'calendar', label: 'Calendario', link: '/admin/calendar' },
      { id: 'clients', label: 'Clientes', link: '/admin/clients' },
    ]);
    fixture.componentRef.setInput('menuItems', [
      { id: 'settings', label: 'Ajustes', link: '/admin/ajustes' },
    ]);
    fixture.detectChanges();
  });

  it('renders brand, nav, and the current user', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Bonafit');
    expect(text).toContain('Calendario');
    expect(text).toContain('Clientes');
    expect(text).toContain('Alex Martin');
  });

  it('emits logout from the profile menu', () => {
    const spy = jasmine.createSpy('logout');
    component.logout.subscribe(spy);

    const trigger = fixture.nativeElement.querySelector(
      '.bona-shell-app__profile-trigger',
    ) as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    const items = Array.from(document.querySelectorAll('button[mat-menu-item]')) as HTMLButtonElement[];
    const logout = items.find((item) => item.textContent?.includes('Salir'));
    logout?.click();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
