import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';
import { CONFIRM_LITERALS } from '../../i18n/es';
import {
  BonaConfirmData,
  BonaConfirmDialogComponent,
} from './bona-confirm-dialog.component';

export interface BonaConfirmRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

@Injectable({ providedIn: 'root' })
export class BonaConfirm {
  private readonly dialog = inject(MatDialog);

  open(request: BonaConfirmRequest): Observable<boolean> {
    const data: BonaConfirmData = {
      title: request.title,
      message: request.message,
      confirmLabel: request.confirmLabel ?? CONFIRM_LITERALS.confirm,
      cancelLabel: request.cancelLabel ?? CONFIRM_LITERALS.cancel,
    };
    return this.dialog
      .open<BonaConfirmDialogComponent, BonaConfirmData, boolean>(BonaConfirmDialogComponent, {
        data,
        autoFocus: 'first-tabbable',
      })
      .afterClosed()
      .pipe(map((result) => result === true));
  }
}
