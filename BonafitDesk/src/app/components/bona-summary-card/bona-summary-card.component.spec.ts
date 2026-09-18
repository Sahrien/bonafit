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

  it('renders extra actions', () => {
    fixture.componentRef.setInput('actions', [{ name: 'cancel', label: 'Anular', variant: 'secondary' }]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Anular');
  });
});
