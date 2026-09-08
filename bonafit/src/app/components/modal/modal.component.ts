import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-modal',
  imports: [ButtonComponent],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent {
  private readonly document = inject(DOCUMENT);

  readonly titleId = `bona-modal-title-${Math.random().toString(36).slice(2, 9)}`;
  open = model(false);
  title = input('Confirmación');
  confirmText = input('Cerrar');
  closed = output<void>();

  constructor() {
    const destroyRef = inject(DestroyRef);

    effect(() => {
      this.document.body.style.overflow = this.open() ? 'hidden' : '';
    });

    destroyRef.onDestroy(() => {
      this.document.body.style.overflow = '';
    });
  }

  close() {
    this.open.set(false);
    this.closed.emit();
  }

  onBackdrop(event: Event) {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.close();
    }
  }
}
