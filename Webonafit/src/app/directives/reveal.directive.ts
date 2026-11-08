import { Directive, ElementRef, NgZone, OnDestroy, OnInit, inject, input } from '@angular/core';

/**
 * Fades and lifts an element into view the first time it enters the viewport.
 * Falls back to a visible element when IntersectionObserver is unavailable or
 * the visitor prefers reduced motion.
 */
@Directive({
  selector: '[appReveal]',
  standalone: true,
})
export class RevealDirective implements OnInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private observer?: IntersectionObserver;

  readonly revealDelay = input(0, { alias: 'appRevealDelay' });

  ngOnInit(): void {
    const element = this.host.nativeElement;
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (typeof IntersectionObserver === 'undefined' || reducedMotion) {
      element.classList.add('reveal--in');
      return;
    }

    element.classList.add('reveal');
    element.style.setProperty('--reveal-delay', `${this.revealDelay()}ms`);

    this.zone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) {
              continue;
            }
            element.classList.add('reveal--in');
            this.observer?.unobserve(element);
          }
        },
        { threshold: 0.15, rootMargin: '0px 0px -6% 0px' },
      );
      this.observer.observe(element);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
