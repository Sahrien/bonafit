import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { BonaButtonComponent } from '../../components/bona-button/bona-button.component';
import { BonaDialogLayoutComponent } from '../../components/bona-dialog/bona-dialog-layout.component';
import { BonaFieldDefinition } from '../../components/bona-field/bona-field.definition';
import { BonaFormComponent, BonaFormValue } from '../../components/bona-form/bona-form.component';
import { injectI18n } from '../../core/i18n/inject-i18n';

export interface ForgotPasswordDialogData {
  email: string;
}

export interface ForgotPasswordDialogResult {
  email: string;
}

@Component({
  selector: 'app-forgot-password-dialog',
  standalone: true,
  imports: [BonaDialogLayoutComponent, BonaFormComponent, BonaButtonComponent],
  templateUrl: './forgot-password-dialog.component.html',
  styleUrl: './forgot-password-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordDialogComponent {
  readonly data = inject<ForgotPasswordDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(
    MatDialogRef<ForgotPasswordDialogComponent, ForgotPasswordDialogResult | null>,
  );
  private readonly i18n = injectI18n('login');

  get literals() {
    return this.i18n();
  }

  readonly formValue = signal<BonaFormValue>({ email: this.data.email ?? '' });

  readonly fields = computed<BonaFieldDefinition[]>(() => [
    {
      key: 'email',
      label: this.literals.forgotEmail,
      type: 'email',
      required: true,
      autocomplete: 'email',
    },
  ]);

  onFormChange(value: BonaFormValue): void {
    this.formValue.set(value);
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSave(): void {
    const email = (this.formValue()['email'] ?? '').trim();
    if (!email) {
      return;
    }
    this.dialogRef.close({ email });
  }
}
