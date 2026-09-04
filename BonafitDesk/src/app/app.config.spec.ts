import { AnimationBuilder } from '@angular/animations';
import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { appConfig } from './app.config';

describe('appConfig', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...appConfig.providers],
    });
  });

  it('registers HttpClient via provideHttpClient', () => {
    expect(TestBed.inject(HttpClient)).toBeTruthy();
  });

  it('registers provideBonaKit animations for Material wrappers', () => {
    expect(TestBed.inject(AnimationBuilder)).toBeTruthy();
  });
});
