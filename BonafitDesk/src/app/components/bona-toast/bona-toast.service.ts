import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

const TOAST_POSITION = {
  verticalPosition: 'bottom' as const,
  horizontalPosition: 'right' as const,
};

@Injectable({ providedIn: 'root' })
export class BonaToast {
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  success(message: string): void {
    this.show(message, 4000, 'bona-toast--success');
  }

  error(message: string): void {
    this.show(message, 6000, 'bona-toast--error');
  }

  private show(message: string, duration: number, panelClass: string): void {
    this.snackBar.open(message, this.translate.instant('toast.close'), {
      ...TOAST_POSITION,
      duration,
      panelClass,
    });
  }
}
