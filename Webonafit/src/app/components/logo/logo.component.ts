import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-logo',
  imports: [],
  templateUrl: './logo.component.html',
  styleUrl: './logo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoComponent {
  showTagline = input(true);
  size = input<'sm' | 'md' | 'lg'>('md');
  inverted = input(false);
  studioName = input('Bonafit');
  slogan = input('Wellness & Longevity');
  imageUrl = input<string | null>(null);
}
