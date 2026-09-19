import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

export interface AdminSettingsLeaveHost {
  confirmLeaveIfDirty(): boolean | Observable<boolean>;
}

export const adminSettingsLeaveGuard: CanDeactivateFn<AdminSettingsLeaveHost> = (component) =>
  component.confirmLeaveIfDirty();
