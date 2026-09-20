import { ComponentType } from '@angular/cdk/portal';
import { Injectable, inject } from '@angular/core';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';

export type BonaDialogSize = 'compact' | 'default';

export interface BonaDialogOpenConfig<D> {
  data?: D;
  size?: BonaDialogSize;
  autoFocus?: MatDialogConfig['autoFocus'];
}

@Injectable({ providedIn: 'root' })
export class BonaDialog {
  private readonly dialog = inject(MatDialog);

  open<T, D = unknown, R = unknown>(
    component: ComponentType<T>,
    config: BonaDialogOpenConfig<D> = {},
  ): MatDialogRef<T, R> {
    const size = config.size ?? 'compact';
    return this.dialog.open<T, D, R>(component, {
      data: config.data as D,
      autoFocus: config.autoFocus ?? 'first-tabbable',
      panelClass: ['bona-dialog', `bona-dialog--${size}`],
      width: size === 'compact' ? '32rem' : '40rem',
      maxWidth: 'calc(100vw - 1.5rem)',
    });
  }
}
