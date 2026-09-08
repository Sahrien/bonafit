import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { BonaButtonComponent } from '../../../components/bona-button/bona-button.component';
import { BonaFormComponent, BonaFormValue } from '../../../components/bona-form/bona-form.component';
import { FormAssignmentDto } from '../../../models/form.dto';
import { FormsApiService } from '../../../services/forms-api.service';
import {
  answersToMap,
  mapToAnswers,
  missingRequiredAnswers,
} from '../../../core/form-answers';
import {
  formatQuestionAnswer,
  orderedQuestions,
  questionsToFields,
} from '../../forms/form-question.mapper';
import { PORTAL_FORMS_LITERALS } from './portal-forms.literals';

@Component({
  selector: 'app-portal-form-fill',
  standalone: true,
  imports: [BonaFormComponent, BonaButtonComponent],
  templateUrl: './portal-form-fill.component.html',
  styleUrl: './portal-form-fill.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalFormFillComponent {
  private readonly formsApi = inject(FormsApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly literals = PORTAL_FORMS_LITERALS;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly feedback = signal('');
  readonly assignment = signal<FormAssignmentDto | null>(null);
  readonly formValue = signal<BonaFormValue>({});

  private readonly assignmentId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('id') ?? '' },
  );

  readonly isCompleted = computed(() => this.assignment()?.status === 'completed');

  readonly fields = computed(() => {
    const assignment = this.assignment();
    if (!assignment) {
      return [];
    }
    return questionsToFields(assignment.questions, {
      yes: this.literals.yes,
      no: this.literals.no,
    });
  });

  readonly answers = computed(() => {
    const assignment = this.assignment();
    if (!assignment) {
      return [];
    }
    const labels = {
      yes: this.literals.yes,
      no: this.literals.no,
      empty: this.literals.emptyAnswer,
    };
    return orderedQuestions(assignment.questions).map((question) => ({
      id: question.id,
      prompt: question.prompt,
      answer: formatQuestionAnswer(question, assignment.answers, labels),
    }));
  });

  constructor() {
    effect(() => {
      const id = this.assignmentId();
      untracked(() => this.load(id));
    });
  }

  onBack(): void {
    void this.router.navigateByUrl('/app/formularios');
  }

  onFormChange(value: BonaFormValue): void {
    this.formValue.set(value);
  }

  onSubmit(value: BonaFormValue): void {
    const assignment = this.assignment();
    if (!assignment || assignment.status === 'completed' || this.saving()) {
      return;
    }
    const answers = mapToAnswers(assignment.questions, value);
    if (missingRequiredAnswers(assignment.questions, answers).length > 0) {
      this.error.set(this.literals.requiredError);
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.formsApi
      .submitAssignment(assignment.id, { answers })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.assignment.set(updated);
          this.formValue.set(answersToMap(updated.answers));
          this.saving.set(false);
          this.feedback.set(this.literals.submitted);
        },
        error: () => {
          this.saving.set(false);
          this.error.set(this.literals.saveError);
        },
      });
  }

  private load(id: string): void {
    this.loading.set(true);
    this.error.set('');
    this.feedback.set('');
    if (!id) {
      this.loading.set(false);
      this.error.set(this.literals.loadError);
      return;
    }
    this.formsApi
      .getAssignment(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (assignment) => {
          this.assignment.set(assignment);
          this.formValue.set(answersToMap(assignment.answers));
          this.loading.set(false);
          if (assignment.status === 'completed') {
            this.feedback.set(this.literals.alreadySubmitted);
          }
        },
        error: () => {
          this.loading.set(false);
          this.error.set(this.literals.loadError);
        },
      });
  }
}
