import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { BonaPageComponent } from './bona-page.component';

describe('BonaPageComponent', () => {
  let fixture: ComponentFixture<BonaPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BonaPageComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(BonaPageComponent);
    fixture.componentRef.setInput('title', 'Calendario');
    fixture.componentRef.setInput('subtitle', 'Citas');
    fixture.detectChanges();
  });

  it('renders title and subtitle', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Calendario');
    expect(text).toContain('Citas');
  });

  it('shows a spinner while loading', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('mat-progress-spinner')).toBeTruthy();
  });
});
