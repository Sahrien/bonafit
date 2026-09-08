import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { ButtonComponent } from './components/button/button.component';
import { LogoComponent } from './components/logo/logo.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, ButtonComponent, LogoComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly router = inject(Router);

  readonly title = 'BONAFIT';
  protected readonly menuOpen = signal(false);
  protected readonly email = 'hola@bonafit.es';
  protected readonly nav = [
    { label: 'Quiénes somos', fragment: 'quienes-somos' },
    { label: 'Qué ofrecemos', fragment: 'que-ofrecemos' },
    { label: 'Longevidad', fragment: 'longevidad' },
    { label: 'Zona', fragment: 'zona' },
    { label: 'Contacto', fragment: 'contacto' },
  ];

  toggleMenu() {
    this.menuOpen.update((open) => !open);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  goToContact() {
    this.closeMenu();
    void this.router.navigate(['/'], { fragment: 'contacto' }).then(() => {
      document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' });
    });
  }
}
