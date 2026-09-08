import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { BonaButtonComponent } from '../../components/bona-button/bona-button.component';
import {
  BonaGridAction,
  BonaGridActionEvent,
  BonaGridColumn,
  BonaGridComponent,
} from '../../components/bona-grid/bona-grid.component';
import { BonaInputTextFieldComponent } from '../../components/bona-input-text-field/bona-input-text-field.component';
import { FormAssignmentDto, FormDto } from '../../models/form.dto';
import { FormsApiService } from '../../services/forms-api.service';
import { FORMS_LITERALS } from './forms.literals';

const NEW_FORM_ID = 'new';

@Component({
  selector: 'app-forms',
  standalone: true,
  imports: [BonaGridComponent, BonaButtonComponent, BonaInputTextFieldComponent],
  templateUrl: './forms.component.html',
  styleUrl: './forms.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormsComponent {
  private readonly formsApi = inject(FormsApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly literals = FORMS_LITERALS;
  readonly search = signal('');
  private readonly forms = signal<FormDto[]>([]);
  private readonly assignments = signal<FormAssignmentDto[]>([]);

  readonly columns: BonaGridColumn[] = [
    { field: 'title', header: FORMS_LITERALS.formTitle },
    { field: 'questionCount', header: FORMS_LITERALS.questionCount, type: 'number' },
    { field: 'assignmentCount', header: FORMS_LITERALS.assignmentCount, type: 'number' },
  ];

  readonly actions: BonaGridAction[] = [
    { label: FORMS_LITERALS.edit, action: 'edit' },
    { label: FORMS_LITERALS.delete, action: 'delete' },
  ];

  readonly rows = computed(() => {
    const query = this.search().trim().toLowerCase();
    const counts = this.assignmentCounts();
    const source = this.forms();
    const filtered = query
      ? source.filter((form) => this.matches(form, query))
      : source;
    return filtered.map((form) => ({
      ...form,
      questionCount: form.questions.length,
      assignmentCount: counts.get(form.id) ?? 0,
    }));
  });

  constructor() {
    this.load();
  }

  onSearch(value: string): void {
    this.search.set(value);
  }

  onCreate(): void {
    void this.router.navigate(['/admin/forms', NEW_FORM_ID]);
  }

  onRowClick(item: Record<string, unknown>): void {
    this.openFicha(String(item['id'] ?? ''));
  }

  onRowAction(event: BonaGridActionEvent<Record<string, unknown>>): void {
    const id = String(event.item['id'] ?? '');
    if (event.action === 'edit') {
      this.openFicha(id);
      return;
    }
    if (event.action === 'delete' && id) {
      this.deleteForm(id);
    }
  }

  private assignmentCounts(): Map<string, number> {
    const counts = new Map<string, number>();
    for (const assignment of this.assignments()) {
      counts.set(assignment.formId, (counts.get(assignment.formId) ?? 0) + 1);
    }
    return counts;
  }

  private openFicha(id: string): void {
    if (!id) {
      return;
    }
    void this.router.navigate(['/admin/forms', id]);
  }

  private deleteForm(id: string): void {
    this.formsApi
      .deleteForm(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.load(),
      });
  }

  private load(): void {
    forkJoin({
      forms: this.formsApi.getForms(),
      assignments: this.formsApi.getAssignments(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ forms, assignments }) => {
        this.forms.set(forms);
        this.assignments.set(assignments);
      });
  }

  private matches(form: FormDto, query: string): boolean {
    return [form.title, form.description].join(' ').toLowerCase().includes(query);
  }
}
