import { TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideBonaKit } from './bona-kit.providers';

describe('provideBonaKit', () => {
  it('registers animation providers for Material wrappers', () => {
    TestBed.configureTestingModule({
      providers: [provideBonaKit()],
    });

    expect(provideBonaKit()).toEqual(jasmine.anything());
    expect(provideAnimations()).toEqual(jasmine.anything());
  });
});
