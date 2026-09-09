import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class BonaToast {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.snackBar.open(message, undefined, {
      duration: 4000,
      panelClass: 'bona-toast--success',
    });
  }

  error(message: string): void {
    this.snackBar.open(message, undefined, {
      duration: 6000,
      panelClass: 'bona-toast--error',
    });
  }
}
