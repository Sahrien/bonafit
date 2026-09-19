import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

export interface AccountingLeaveHost {
  confirmLeaveIfDirty(): boolean | Observable<boolean>;
}

export const adminAccountingLeaveGuard: CanDeactivateFn<AccountingLeaveHost> = (component) =>
  component.confirmLeaveIfDirty();
