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
    fixture.componentRef.setInput('brandSubtitle', 'Estudio');
    fixture.componentRef.setInput('userName', 'Alex Martin');
    fixture.componentRef.setInput('navItems', [
      { id: 'calendar', label: 'Calendario', link: '/admin/calendar', icon: 'calendar_month' },
      { id: 'clients', label: 'Clientes', link: '/admin/clients', icon: 'groups' },
    ]);
    fixture.componentRef.setInput('menuItems', [
      { id: 'settings', label: 'Ajustes', link: '/admin/ajustes' },
    ]);
    fixture.detectChanges();
  });

  it('renders brand, nav, and the current user', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Bonafit');
    expect(text).toContain('Estudio');
    expect(text).toContain('Calendario');
    expect(text).toContain('Clientes');
    expect(text).toContain('Alex Martin');
  });

  it('replaces the brand text with the logo when a logo is configured', () => {
    fixture.componentRef.setInput('brandLogoUrl', '/uploads/branding/logo.png');
    fixture.detectChanges();

    const brand = fixture.nativeElement.querySelector('.bona-shell-app__brand') as HTMLElement;
    const logo = brand.querySelector('.bona-shell-app__brand-logo') as HTMLImageElement;

    expect(logo).toBeTruthy();
    expect(logo.getAttribute('src')).toBe('/uploads/branding/logo.png');
    expect(logo.getAttribute('alt')).toBe('Bonafit');
    expect(brand.querySelector('.bona-shell-app__brand-text')).toBeNull();
    expect(brand.textContent).not.toContain('Bonafit');
    expect(brand.textContent).not.toContain('Estudio');
  });

  it('uses the imagotipo in the header when one is configured', () => {
    fixture.componentRef.setInput('brandLogoUrl', '/uploads/branding/logo-dark.svg');
    fixture.componentRef.setInput('brandMarkUrl', '/uploads/branding/favicon.svg');
    fixture.detectChanges();

    const brand = fixture.nativeElement.querySelector('.bona-shell-app__brand') as HTMLElement;
    const mark = brand.querySelector('.bona-shell-app__brand-mark') as HTMLImageElement;

    expect(mark).toBeTruthy();
    expect(mark.getAttribute('src')).toBe('/uploads/branding/favicon.svg');
    expect(mark.getAttribute('alt')).toBe('Bonafit');
    expect(brand.querySelector('.bona-shell-app__brand-logo')).toBeNull();
    expect(brand.querySelector('.bona-shell-app__brand-text')).toBeNull();
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

  it('renders bottom navigation for the primary destinations', () => {
    const bottom = fixture.nativeElement.querySelector('.bona-shell-app__bottom') as HTMLElement;
    expect(bottom).toBeTruthy();
    expect(bottom.textContent).toContain('Calendario');
    expect(bottom.textContent).toContain('Clientes');
  });
});
