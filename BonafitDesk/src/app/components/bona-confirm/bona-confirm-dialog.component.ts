import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { BonaButtonComponent } from '../bona-button/bona-button.component';

export interface BonaConfirmData {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}

@Component({
  selector: 'app-bona-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, BonaButtonComponent],
  templateUrl: './bona-confirm-dialog.component.html',
  styleUrl: './bona-confirm-dialog.component.scss',
})
export class BonaConfirmDialogComponent {
  readonly data = inject<BonaConfirmData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<BonaConfirmDialogComponent, boolean>);

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
