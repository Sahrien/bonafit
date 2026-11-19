import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideWebTranslate } from '../../i18n/provide-web-translate';
import { NotFoundComponent } from './not-found.component';

describe('NotFoundComponent', () => {
  let component: NotFoundComponent;
  let fixture: ComponentFixture<NotFoundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFoundComponent],
      providers: [provideRouter([]), provideWebTranslate()],
    }).compileComponents();

    fixture = TestBed.createComponent(NotFoundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the 404 copy', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.not-found__code')?.textContent).toContain('404');
    expect(compiled.textContent).toContain('Esta página no existe');
  });
});
