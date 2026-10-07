import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-logo',
  imports: [],
  templateUrl: './logo.component.html',
  styleUrl: './logo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoComponent {
  /** Kept for API compatibility; logo SVG already includes the descriptor. */
  showTagline = input(true);
  size = input<'sm' | 'md' | 'lg'>('md');
  /** Use dark (cream/white) brand assets for dark backgrounds. */
  inverted = input(false);
  studioName = input('BonaFIT');
  slogan = input('Wellness & Longevity');
  /** API override (photo). When null, static brand assets are used. */
  imageUrl = input<string | null>(null);
  /** Full wordmark vs icon-only mark (favicon/avatar/header). */
  mark = input<'logo' | 'mark'>('logo');

  protected readonly src = computed(() => {
    const api = this.imageUrl();
    if (api) {
      return api;
    }
    const scheme = this.inverted() ? 'dark' : 'light';
    const file = this.mark() === 'mark' ? 'mark.svg' : 'logo.svg';
    return `/brand/${scheme}/${file}`;
  });

  protected readonly isPhoto = computed(() => !!this.imageUrl());

  protected readonly ariaLabel = computed(() => {
    if (this.mark() === 'mark' || !this.showTagline()) {
      return this.studioName();
    }
    return `${this.studioName()}, ${this.slogan()}`;
  });
}
