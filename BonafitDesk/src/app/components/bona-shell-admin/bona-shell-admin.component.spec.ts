import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { BonaShellAdminComponent } from './bona-shell-admin.component';

describe('BonaShellAdminComponent', () => {
  let component: BonaShellAdminComponent;
  let fixture: ComponentFixture<BonaShellAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BonaShellAdminComponent],
      providers: [provideNoopAnimations(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(BonaShellAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('hides the top bar in menu mode', () => {
    fixture.componentRef.setInput('mode', 'menu');
    fixture.componentRef.setInput('userName', 'Entrenador A');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.bona-shell-admin__bar')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Entrenador A');
  });

  it('shows the logged user and back action in bar mode', () => {
    fixture.componentRef.setInput('mode', 'bar');
    fixture.componentRef.setInput('userName', 'Entrenador A');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(fixture.nativeElement.querySelector('.bona-shell-admin__bar')).toBeTruthy();
    expect(text).toContain('Entrenador A');
    expect(text).toContain('Volver al menú');
    expect(text).toContain('Salir');
  });

  it('emits back and logout from the bar', () => {
    fixture.componentRef.setInput('mode', 'bar');
    fixture.componentRef.setInput('userName', 'Entrenador A');
    fixture.detectChanges();

    const backSpy = jasmine.createSpy('back');
    const logoutSpy = jasmine.createSpy('logout');
    component.back.subscribe(backSpy);
    component.logout.subscribe(logoutSpy);

    const buttons = fixture.nativeElement.querySelectorAll(
      '.bona-shell-admin__bar button',
    ) as NodeListOf<HTMLButtonElement>;
    buttons[0].click();
    buttons[1].click();

    expect(backSpy).toHaveBeenCalledTimes(1);
    expect(logoutSpy).toHaveBeenCalledTimes(1);
  });
});
