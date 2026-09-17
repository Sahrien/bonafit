import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

const TOAST_POSITION = {
  verticalPosition: 'top' as const,
  horizontalPosition: 'right' as const,
};

@Injectable({ providedIn: 'root' })
export class BonaToast {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.snackBar.open(message, undefined, {
      ...TOAST_POSITION,
      duration: 4000,
      panelClass: 'bona-toast--success',
    });
  }

  error(message: string): void {
    this.snackBar.open(message, undefined, {
      ...TOAST_POSITION,
      duration: 6000,
      panelClass: 'bona-toast--error',
    });
  }
}
