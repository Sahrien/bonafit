import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BonaDialog } from '../../components/bona-dialog/bona-dialog.service';
import {
  ScheduleActionDialogComponent,
} from './schedule-action-dialog.component';
import { ScheduleActionDialogData, ScheduleActionResult } from './schedule-action.model';

@Injectable({ providedIn: 'root' })
export class ScheduleAction {
  private readonly dialog = inject(BonaDialog);

  open(data: ScheduleActionDialogData): Observable<ScheduleActionResult | null> {
    return this.dialog
      .open<ScheduleActionDialogComponent, ScheduleActionDialogData, ScheduleActionResult | null>(
        ScheduleActionDialogComponent,
        { data, size: 'compact' },
      )
      .afterClosed()
      .pipe(map((result) => result ?? null));
  }
}
