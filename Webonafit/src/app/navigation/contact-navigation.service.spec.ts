import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { provideWebTranslate } from '../i18n/provide-web-translate';
import { ContactNavigationService } from './contact-navigation.service';

describe('ContactNavigationService', () => {
  let service: ContactNavigationService;
  let router: Router;
  let section: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideWebTranslate()],
    });
    service = TestBed.inject(ContactNavigationService);
    router = TestBed.inject(Router);

    section = document.createElement('section');
    section.id = 'contacto';
    document.body.appendChild(section);
  });

  afterEach(() => section.remove());

  it('navigates to the contact fragment and scrolls the section into view', async () => {
    const scrollIntoView = spyOn(section, 'scrollIntoView');
    spyOn(router, 'navigate').and.resolveTo(true);

    service.goToContact();
    await Promise.resolve();

    expect(router.navigate).toHaveBeenCalledWith(['/'], { fragment: 'contacto' });
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('does nothing when the contact section is missing', () => {
    section.remove();
    expect(() => service.scrollToContact()).not.toThrow();
  });
});
