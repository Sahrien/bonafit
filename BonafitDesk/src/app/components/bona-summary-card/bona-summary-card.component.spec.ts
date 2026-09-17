import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { BonaSummaryCardComponent } from './bona-summary-card.component';

describe('BonaSummaryCardComponent', () => {
  let fixture: ComponentFixture<BonaSummaryCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BonaSummaryCardComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(BonaSummaryCardComponent);
    fixture.componentRef.setInput('kicker', 'Próxima cita');
    fixture.componentRef.setInput('title', 'Entrenamiento');
    fixture.componentRef.setInput('meta', 'Con Alex');
    fixture.detectChanges();
  });

  it('renders kicker, title and meta', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Próxima cita');
    expect(text).toContain('Entrenamiento');
    expect(text).toContain('Con Alex');
  });
});
