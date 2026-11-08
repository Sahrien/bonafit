import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-logo',
  imports: [],
  templateUrl: './logo.component.html',
  styleUrl: './logo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoComponent {
  showTagline = input(true);
  showMark = input(true);
  size = input<'sm' | 'md' | 'lg'>('md');
  markSize = input<'sm' | 'md' | 'lg' | null>(null);
  inverted = input(false);
  studioName = input('Bonafit');
  slogan = input('Wellness & Longevity');
  imageUrl = input<string | null>(null);

  protected readonly label = computed(() =>
    this.showTagline() ? `${this.studioName()} ${this.slogan()}` : this.studioName(),
  );
  protected readonly stacked = computed(() => this.size() === 'lg');
  protected readonly markClass = computed(() => 'logo__mark--' + (this.markSize() ?? this.size()));
  protected readonly markSrc = computed(() =>
    this.inverted() ? 'brand/imagotipo-white.svg' : 'brand/imagotipo.svg',
  );
  protected readonly wordSrc = computed(() => {
    if (this.inverted()) {
      return this.showTagline() ? 'brand/logo-white.svg' : 'brand/wordmark-white.svg';
    }
    return this.showTagline() ? 'brand/logo.svg' : 'brand/wordmark.svg';
  });
}
