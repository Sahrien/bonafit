import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BonaDialog } from '../../../components/bona-dialog/bona-dialog.service';
import {
  AppointmentEditorComponent,
  AppointmentEditorData,
} from './appointment-editor.component';

@Injectable({ providedIn: 'root' })
export class AppointmentEditor {
  private readonly dialog = inject(BonaDialog);

  open(data: AppointmentEditorData): Observable<boolean> {
    return this.dialog
      .open<AppointmentEditorComponent, AppointmentEditorData, boolean>(AppointmentEditorComponent, {
        data,
        size: 'compact',
      })
      .afterClosed()
      .pipe(map((result) => result === true));
  }
}
