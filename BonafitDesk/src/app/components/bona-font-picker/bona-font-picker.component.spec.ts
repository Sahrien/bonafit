import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { BRAND_FONTS } from '../../core/font-catalog';
import { BonaFontPickerComponent } from './bona-font-picker.component';

describe('BonaFontPickerComponent', () => {
  let fixture: ComponentFixture<BonaFontPickerComponent>;
  let component: BonaFontPickerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BonaFontPickerComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(BonaFontPickerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('label', 'Fuente de títulos');
    fixture.componentRef.setInput('fonts', BRAND_FONTS);
    fixture.componentRef.setInput('value', 'inter');
    fixture.detectChanges();
  });

  it('filters the catalog by name or id', () => {
    component.query.set('jost');
    fixture.detectChanges();
    expect(component.filtered().map((font) => font.id)).toEqual(['jost']);

    component.query.set('serif');
    fixture.detectChanges();
    expect(component.filtered()).toEqual([]);
  });

  it('shows the full catalog when the selected font is active', () => {
    component.query.set('inter');
    fixture.detectChanges();
    expect(component.filtered().length).toBe(BRAND_FONTS.length);
  });

  it('resolves labels and stacks for previews', () => {
    expect(component.displayFont('jost')).toBe('Jost');
    expect(component.displayFont('lato')).toBe('Lato');
    expect(component.displayFont('desconocida')).toBe('desconocida');
  });
});
