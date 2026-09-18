import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { BonaPageComponent } from './bona-page.component';

@Component({
  standalone: true,
  imports: [BonaPageComponent],
  template: `
    <app-bona-page title="Calendario" subtitle="Citas" [loading]="loading">
      <p class="projected">contenido</p>
    </app-bona-page>
  `,
})
class BonaPageHostComponent {
  loading = false;
}

describe('BonaPageComponent', () => {
  let fixture: ComponentFixture<BonaPageHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BonaPageHostComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(BonaPageHostComponent);
    fixture.detectChanges();
  });

  it('renders title and subtitle', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Calendario');
    expect(text).toContain('Citas');
  });

  it('shows a skeleton while loading and keeps projected content mounted', () => {
    fixture.componentInstance.loading = true;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.bona-page__skeleton')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.projected')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('.bona-page__content')?.classList.contains(
        'bona-page__content--loading',
      ),
    ).toBeTrue();
  });
});
