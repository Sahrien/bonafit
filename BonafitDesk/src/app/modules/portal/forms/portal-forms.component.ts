import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { EMPTY, switchMap, take } from 'rxjs';
import {
  BonaGridAction,
  BonaGridActionEvent,
  BonaGridColumn,
  BonaGridComponent,
} from '../../../components/bona-grid/bona-grid.component';
import { BonaPageComponent } from '../../../components/bona-page/bona-page.component';
import { FormAssignmentDto } from '../../../models/form.dto';
import { AuthApiService } from '../../../services/auth-api.service';
import { FormsApiService } from '../../../services/forms-api.service';
import { PORTAL_FORMS_LITERALS } from './portal-forms.literals';

@Component({
  selector: 'app-portal-forms',
  standalone: true,
  imports: [BonaPageComponent, BonaGridComponent],
  templateUrl: './portal-forms.component.html',
  styleUrl: './portal-forms.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalFormsComponent {
  private readonly auth = inject(AuthApiService);
  private readonly formsApi = inject(FormsApiService);
  private readonly router = inject(Router);

  readonly literals = PORTAL_FORMS_LITERALS;
  readonly loading = signal(true);
  readonly error = signal('');
  readonly rows = signal<Record<string, unknown>[]>([]);

  readonly columns: BonaGridColumn[] = [
    { field: 'title', header: PORTAL_FORMS_LITERALS.formTitle },
    { field: 'statusLabel', header: PORTAL_FORMS_LITERALS.status },
    { field: 'assignedAt', header: PORTAL_FORMS_LITERALS.assignedAt, type: 'date' },
  ];

  readonly actions: BonaGridAction[] = [
    { label: PORTAL_FORMS_LITERALS.open, action: 'open' },
  ];

  constructor() {
    this.auth
      .getSession()
      .pipe(
        take(1),
        switchMap((session) => {
          if (!session?.user.clientId) {
            this.loading.set(false);
            this.error.set(PORTAL_FORMS_LITERALS.noSession);
            return EMPTY;
          }
          return this.formsApi.getMyAssignments();
        }),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (assignments) => {
          this.rows.set(this.toRows(assignments));
          this.loading.set(false);
        },
        error: () => {
          this.error.set(PORTAL_FORMS_LITERALS.loadError);
          this.loading.set(false);
        },
      });
  }

  onRowClick(item: Record<string, unknown>): void {
    this.open(String(item['id'] ?? ''));
  }

  onRowAction(event: BonaGridActionEvent<Record<string, unknown>>): void {
    if (event.action === 'open') {
      this.open(String(event.item['id'] ?? ''));
    }
  }

  private open(id: string): void {
    if (!id) {
      return;
    }
    void this.router.navigate(['/app/formularios', id]);
  }

  private toRows(assignments: FormAssignmentDto[]): Record<string, unknown>[] {
    return assignments.map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      statusLabel:
        assignment.status === 'completed'
          ? PORTAL_FORMS_LITERALS.statusCompleted
          : PORTAL_FORMS_LITERALS.statusPending,
      assignedAt: assignment.assignedAt,
    }));
  }
}
