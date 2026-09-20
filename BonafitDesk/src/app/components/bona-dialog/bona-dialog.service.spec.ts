import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { BonaDialogLayoutComponent } from './bona-dialog-layout.component';
import { BonaDialog } from './bona-dialog.service';

@Component({
  standalone: true,
  template: '<p>Dialog body</p>',
})
class DialogProbeComponent {}

describe('BonaDialog', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideNoopAnimations(), BonaDialog],
    }).compileComponents();
  });

  it('opens a compact overlay and closes it', () => {
    const dialog = TestBed.inject(BonaDialog);
    const ref = dialog.open(DialogProbeComponent, { size: 'compact' });
    expect(document.querySelector('.bona-dialog--compact')).toBeTruthy();
    expect(document.body.textContent).toContain('Dialog body');
    ref.close();
  });
});

describe('BonaDialogLayoutComponent', () => {
  let fixture: ComponentFixture<BonaDialogLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BonaDialogLayoutComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(BonaDialogLayoutComponent);
    fixture.componentRef.setInput('title', 'Nueva cita');
    fixture.detectChanges();
  });

  it('renders the title', () => {
    expect(fixture.nativeElement.textContent).toContain('Nueva cita');
  });
});
