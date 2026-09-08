import { afterNextRender, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonComponent } from '../../components/button/button.component';
import { LogoComponent } from '../../components/logo/logo.component';
import { ContactComponent } from '../contact/contact.component';

@Component({
  selector: 'app-home',
  imports: [ButtonComponent, LogoComponent, ContactComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly router = inject(Router);

  protected readonly territories = ['Fuerza', 'Movilidad', 'Longevidad', 'Bienestar'];

  protected readonly offers = [
    {
      title: 'Sesiones personalizadas',
      text: 'Entrenamientos de unos 55–60 minutos, pensados para ti. Recomendamos dos sesiones por semana para avanzar con constancia y sin prisa.',
    },
    {
      title: 'Valoración y programa',
      text: 'Empezamos con una valoración inicial, escuchamos tus objetivos y diseñamos un programa individualizado que evoluciona contigo.',
    },
    {
      title: 'Cuerpo que te sostiene',
      text: 'Trabajamos fuerza, movilidad, equilibrio y gesto funcional, con seguimiento cercano para que cada sesión tenga sentido.',
    },
  ];

  protected readonly complements = [
    'Hipopresivos',
    'Estiramientos',
    'Recuperación muscular',
    'Masaje deportivo',
    'Drenaje linfático',
  ];

  protected readonly outcomes = [
    'Más seguridad al caminar y al subir escaleras',
    'Levantarte de una silla con autonomía',
    'Viajar y moverte sin que la edad sea un límite',
    'Jugar con nietos y disfrutar el día a día',
    'Fuerza, movilidad y confianza para vivir mejor',
  ];

  protected readonly primaryAreas = ['Bonalba Golf', 'Cotoveta', 'Mutxamel'];
  protected readonly nearbyAreas = [
    "Sant Joan d'Alacant",
    'Playa de San Juan',
    'Busot',
    'El Campello',
  ];

  constructor() {
    afterNextRender(() => {
      if (this.router.url.startsWith('/contacto')) {
        document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  goToContact() {
    void this.router.navigate(['/'], { fragment: 'contacto' }).then(() => {
      document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' });
    });
  }
}
