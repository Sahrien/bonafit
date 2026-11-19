import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LanguageService } from '../i18n/language.service';

/** Single implementation of the "go to the contact section" behaviour. */
@Injectable({ providedIn: 'root' })
export class ContactNavigationService {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly language = inject(LanguageService);

  goToContact(): void {
    const fragment = this.language.contactFragment();
    void this.router
      .navigate([this.language.homePath()], { fragment })
      .then(() => this.scrollToContact());
  }

  scrollToContact(): void {
    this.document
      .getElementById(this.language.contactFragment())
      ?.scrollIntoView({ behavior: 'smooth' });
  }
}
