import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SITE } from '../../site';

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
  studioName = input(SITE.name);
  slogan = input(SITE.slogan);
  /** Full wordmark vs icon-only mark (favicon/avatar/header). */
  mark = input<'logo' | 'mark'>('logo');

  protected readonly src = computed(() => {
    const scheme = this.inverted() ? 'dark' : 'light';
    const file = this.mark() === 'mark' ? 'mark.svg' : 'logo.svg';
    return `/brand/${scheme}/${file}`;
  });

  protected readonly ariaLabel = computed(() => {
    if (this.mark() === 'mark' || !this.showTagline()) {
      return this.studioName();
    }
    return `${this.studioName()}, ${this.slogan()}`;
  });
}
