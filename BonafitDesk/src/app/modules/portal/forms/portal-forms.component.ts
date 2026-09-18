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
import { injectI18n } from '../../../core/i18n/inject-i18n';
import { AuthApiService } from '../../../services/auth-api.service';
import { FormsApiService } from '../../../services/forms-api.service';

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

  private readonly i18n = injectI18n<Record<string, string>>('portalForms');
  get literals() {
    return this.i18n();
  }
  readonly loading = signal(true);
  readonly error = signal('');
  readonly rows = signal<Record<string, unknown>[]>([]);

  readonly columns = computed<BonaGridColumn[]>(() => [
    { field: 'title', header: this.literals.formTitle },
    { field: 'statusLabel', header: this.literals.status },
    { field: 'assignedAt', header: this.literals.assignedAt, type: 'date' },
  ]);

  readonly actions = computed<BonaGridAction[]>(() => [
    { label: this.literals.open, action: 'open' },
  ]);

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
      statusLabel: this.statusLabel(assignment),
      assignedAt: assignment.assignedAt,
    }));
  }

  private statusLabel(assignment: FormAssignmentDto): string {
    if (assignment.status === 'completed') {
      return PORTAL_FORMS_LITERALS.statusCompleted;
    }
    if (assignment.answers.length > 0) {
      return PORTAL_FORMS_LITERALS.statusDraft;
    }
    return PORTAL_FORMS_LITERALS.statusPending;
  }
}
