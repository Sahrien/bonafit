import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { Observable, map } from 'rxjs';
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
  private readonly translate = inject(TranslateService);

  open(request: BonaConfirmRequest): Observable<boolean> {
    const data: BonaConfirmData = {
      title: request.title,
      message: request.message,
      confirmLabel: request.confirmLabel ?? this.translate.instant('confirm.confirm'),
      cancelLabel: request.cancelLabel ?? this.translate.instant('confirm.cancel'),
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
