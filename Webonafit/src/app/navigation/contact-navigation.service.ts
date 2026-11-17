import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

export const CONTACT_FRAGMENT = 'contacto';

/** Single implementation of the "go to the contact section" behaviour. */
@Injectable({ providedIn: 'root' })
export class ContactNavigationService {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  goToContact(): void {
    void this.router
      .navigate(['/'], { fragment: CONTACT_FRAGMENT })
      .then(() => this.scrollToContact());
  }

  scrollToContact(behavior: ScrollBehavior = 'smooth'): void {
    this.document
      .getElementById(CONTACT_FRAGMENT)
      ?.scrollIntoView({ behavior });
  }
}
