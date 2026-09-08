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
import { forkJoin, map } from 'rxjs';
import { BonaButtonComponent } from '../../components/bona-button/bona-button.component';
import { BonaFieldComponent } from '../../components/bona-field/bona-field.component';
import { BonaFieldDefinition } from '../../components/bona-field/bona-field.definition';
import {
  BonaGridAction,
  BonaGridActionEvent,
  BonaGridColumn,
  BonaGridComponent,
} from '../../components/bona-grid/bona-grid.component';
import { BonaInputTextFieldComponent } from '../../components/bona-input-text-field/bona-input-text-field.component';
import { ClientDto } from '../../models/client.dto';
import {
  FormAssignmentDto,
  FormQuestionDto,
  FormQuestionType,
  FormWriteDto,
} from '../../models/form.dto';
import { ClientsApiService } from '../../services/clients-api.service';
import { FormsApiService } from '../../services/forms-api.service';
import { formatQuestionAnswer, orderedQuestions } from './form-question.mapper';
import { FORMS_LITERALS } from './forms.literals';

const NEW_FORM_ID = 'new';

const TYPE_FIELD: BonaFieldDefinition = {
  key: 'type',
  label: FORMS_LITERALS.type,
  type: 'select',
  options: [
    { value: 'text', label: FORMS_LITERALS.typeText },
    { value: 'yesno', label: FORMS_LITERALS.typeYesNo },
    { value: 'singleChoice', label: FORMS_LITERALS.typeSingleChoice },
  ],
};

const REQUIRED_FIELD: BonaFieldDefinition = {
  key: 'required',
  label: FORMS_LITERALS.required,
  type: 'select',
  options: [
    { value: 'true', label: FORMS_LITERALS.yes },
    { value: 'false', label: FORMS_LITERALS.no },
  ],
};

const DESCRIPTION_FIELD: BonaFieldDefinition = {
  key: 'description',
  label: FORMS_LITERALS.description,
  type: 'textarea',
};

@Component({
  selector: 'app-form-ficha',
  standalone: true,
  imports: [
    BonaButtonComponent,
    BonaFieldComponent,
    BonaGridComponent,
    BonaInputTextFieldComponent,
  ],
  templateUrl: './form-ficha.component.html',
  styleUrl: './form-ficha.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormFichaComponent {
  private readonly formsApi = inject(FormsApiService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly literals = FORMS_LITERALS;
  readonly typeField = TYPE_FIELD;
  readonly requiredField = REQUIRED_FIELD;
  readonly descriptionField = DESCRIPTION_FIELD;

  readonly title = signal('');
  readonly description = signal('');
  readonly questions = signal<FormQuestionDto[]>([]);
  readonly error = signal('');
  readonly feedback = signal('');
  readonly saving = signal(false);
  readonly assigning = signal(false);
  readonly selectedClientIds = signal<Set<string>>(new Set());
  readonly selectedAssignmentId = signal<string | null>(null);

  private readonly clients = signal<ClientDto[]>([]);
  private readonly assignments = signal<FormAssignmentDto[]>([]);

  private readonly formId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('id') ?? '' },
  );

  readonly isNew = computed(() => this.formId() === NEW_FORM_ID || !this.formId());
  readonly pageTitle = computed(() =>
    this.isNew() ? this.literals.fichaNewTitle : this.literals.fichaTitle,
  );

  readonly pendingClientIds = computed(() => {
    const pending = new Set<string>();
    for (const assignment of this.assignments()) {
      if (assignment.status === 'pending') {
        pending.add(assignment.clientId);
      }
    }
    return pending;
  });

  readonly clientRows = computed(() => this.clients());

  readonly assignmentRows = computed(() => {
    const clientsById = new Map(
      this.clients().map((client) => [client.id, `${client.firstName} ${client.lastName}`]),
    );
    return this.assignments().map((assignment) => ({
      ...assignment,
      clientName: clientsById.get(assignment.clientId) ?? assignment.clientId,
      statusLabel:
        assignment.status === 'completed'
          ? this.literals.statusCompleted
          : this.literals.statusPending,
      submittedAtLabel: assignment.submittedAt ?? '',
    }));
  });

  readonly assignmentColumns: BonaGridColumn[] = [
    { field: 'clientName', header: FORMS_LITERALS.client },
    { field: 'statusLabel', header: FORMS_LITERALS.status },
    { field: 'assignedAt', header: FORMS_LITERALS.assignedAt, type: 'date' },
    { field: 'submittedAtLabel', header: FORMS_LITERALS.submittedAt, type: 'date' },
  ];

  readonly assignmentActions: BonaGridAction[] = [
    { label: FORMS_LITERALS.view, action: 'view' },
  ];

  readonly selectedAssignment = computed(() => {
    const id = this.selectedAssignmentId();
    if (!id) {
      return null;
    }
    return this.assignments().find((row) => row.id === id) ?? null;
  });

  readonly selectedAnswers = computed(() => {
    const assignment = this.selectedAssignment();
    if (!assignment) {
      return null;
    }
    const labels = {
      yes: this.literals.yes,
      no: this.literals.no,
      empty: this.literals.emptyAnswer,
    };
    const client = this.clients().find((row) => row.id === assignment.clientId);
    return {
      clientName: client ? `${client.firstName} ${client.lastName}` : assignment.clientId,
      items: orderedQuestions(assignment.questions).map((question) => ({
        id: question.id,
        prompt: question.prompt,
        answer: formatQuestionAnswer(question, assignment.answers, labels),
      })),
    };
  });

  constructor() {
    effect(() => {
      const id = this.formId();
      untracked(() => this.load(id));
    });
  }

  onBack(): void {
    void this.router.navigateByUrl('/admin/forms');
  }

  onTitleChange(value: string): void {
    this.title.set(value);
  }

  onDescriptionChange(value: string): void {
    this.description.set(value);
  }

  onAddQuestion(): void {
    this.questions.update((list) => [
      ...list,
      {
        id: crypto.randomUUID(),
        prompt: '',
        type: 'text',
        required: true,
        sortOrder: list.length,
      },
    ]);
  }

  onPromptChange(questionId: string, prompt: string): void {
    this.patchQuestion(questionId, { prompt });
  }

  onTypeChange(questionId: string, typeValue: string): void {
    const type = typeValue as FormQuestionType;
    this.questions.update((list) =>
      list.map((question) => {
        if (question.id !== questionId) {
          return question;
        }
        if (type === 'singleChoice') {
          const options =
            question.options && question.options.length >= 2
              ? question.options
              : [
                  { id: crypto.randomUUID(), label: '', sortOrder: 0 },
                  { id: crypto.randomUUID(), label: '', sortOrder: 1 },
                ];
          return { ...question, type, options };
        }
        return { ...question, type, options: undefined };
      }),
    );
  }

  onRequiredChange(questionId: string, value: string): void {
    this.patchQuestion(questionId, { required: value === 'true' });
  }

  onRemoveQuestion(questionId: string): void {
    this.questions.update((list) => list.filter((question) => question.id !== questionId));
  }

  onMoveQuestion(questionId: string, direction: -1 | 1): void {
    this.questions.update((list) => {
      const index = list.findIndex((question) => question.id === questionId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= list.length) {
        return list;
      }
      const copy = [...list];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, item);
      return copy;
    });
  }

  onAddOption(questionId: string): void {
    this.questions.update((list) =>
      list.map((question) =>
        question.id === questionId
          ? {
              ...question,
              options: [
                ...(question.options ?? []),
                {
                  id: crypto.randomUUID(),
                  label: '',
                  sortOrder: question.options?.length ?? 0,
                },
              ],
            }
          : question,
      ),
    );
  }

  onOptionLabelChange(questionId: string, optionId: string, label: string): void {
    this.questions.update((list) =>
      list.map((question) =>
        question.id === questionId
          ? {
              ...question,
              options: (question.options ?? []).map((option) =>
                option.id === optionId ? { ...option, label } : option,
              ),
            }
          : question,
      ),
    );
  }

  onRemoveOption(questionId: string, optionId: string): void {
    this.questions.update((list) =>
      list.map((question) =>
        question.id === questionId
          ? {
              ...question,
              options: (question.options ?? []).filter((option) => option.id !== optionId),
            }
          : question,
      ),
    );
  }

  onSave(): void {
    const payload = this.toWriteDto();
    if (!payload) {
      return;
    }
    this.saving.set(true);
    this.feedback.set('');
    const id = this.formId();
    const request = this.isNew()
      ? this.formsApi.createForm(payload)
      : this.formsApi.updateForm(id, payload);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (form) => {
        this.saving.set(false);
        if (this.isNew()) {
          void this.router.navigate(['/admin/forms', form.id]);
          return;
        }
        this.title.set(form.title);
        this.description.set(form.description);
        this.questions.set(orderedQuestions(form.questions));
      },
      error: () => {
        this.saving.set(false);
        this.error.set(this.literals.errorSave);
      },
    });
  }

  onDelete(): void {
    if (this.isNew()) {
      return;
    }
    this.formsApi
      .deleteForm(this.formId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.onBack(),
        error: () => this.error.set(this.literals.errorSave),
      });
  }

  isSelected(clientId: string): boolean {
    return this.selectedClientIds().has(clientId);
  }

  isPending(clientId: string): boolean {
    return this.pendingClientIds().has(clientId);
  }

  toggleClient(clientId: string): void {
    if (this.isPending(clientId)) {
      return;
    }
    this.selectedClientIds.update((current) => {
      const next = new Set(current);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  }

  onAssign(): void {
    const clientIds = [...this.selectedClientIds()];
    if (this.isNew() || clientIds.length === 0 || this.assigning()) {
      return;
    }
    this.assigning.set(true);
    this.feedback.set('');
    this.error.set('');
    this.formsApi
      .assignForm({ formId: this.formId(), clientIds })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.assigning.set(false);
          this.selectedClientIds.set(new Set());
          this.feedback.set(
            created.length > 0 ? this.literals.assignedFeedback : this.literals.assignedNone,
          );
          this.reloadAssignments();
        },
        error: () => {
          this.assigning.set(false);
          this.error.set(this.literals.errorAssign);
        },
      });
  }

  onAssignmentAction(event: BonaGridActionEvent<Record<string, unknown>>): void {
    if (event.action === 'view') {
      this.selectedAssignmentId.set(String(event.item['id'] ?? ''));
    }
  }

  onAssignmentRowClick(item: Record<string, unknown>): void {
    this.selectedAssignmentId.set(String(item['id'] ?? ''));
  }

  onCloseAnswers(): void {
    this.selectedAssignmentId.set(null);
  }

  private patchQuestion(questionId: string, patch: Partial<FormQuestionDto>): void {
    this.questions.update((list) =>
      list.map((question) => (question.id === questionId ? { ...question, ...patch } : question)),
    );
  }

  private toWriteDto(): FormWriteDto | null {
    const title = this.title().trim();
    const questions = this.questions();
    if (!title || questions.length === 0) {
      this.error.set(this.literals.errorRequired);
      return null;
    }
    const cleaned: FormQuestionDto[] = [];
    for (const question of questions) {
      const prompt = question.prompt.trim();
      if (!prompt) {
        this.error.set(this.literals.errorQuestion);
        return null;
      }
      if (question.type === 'singleChoice') {
        const options = (question.options ?? [])
          .map((option) => ({ ...option, label: option.label.trim() }))
          .filter((option) => option.label.length > 0)
          .map((option, optionIndex) => ({ ...option, sortOrder: optionIndex }));
        if (options.length < 2) {
          this.error.set(this.literals.errorQuestion);
          return null;
        }
        cleaned.push({ ...question, prompt, sortOrder: cleaned.length, options });
      } else {
        cleaned.push({
          ...question,
          prompt,
          sortOrder: cleaned.length,
          options: undefined,
        });
      }
    }
    this.error.set('');
    return {
      title,
      description: this.description().trim(),
      questions: cleaned,
    };
  }

  private load(id: string): void {
    this.error.set('');
    this.feedback.set('');
    this.selectedAssignmentId.set(null);
    this.selectedClientIds.set(new Set());
    if (!id || id === NEW_FORM_ID) {
      this.title.set('');
      this.description.set('');
      this.questions.set([]);
      this.assignments.set([]);
      this.clients.set([]);
      return;
    }
    forkJoin({
      form: this.formsApi.getForm(id),
      assignments: this.formsApi.getAssignments(id),
      clients: this.clientsApi.getClients(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ form, assignments, clients }) => {
          this.title.set(form.title);
          this.description.set(form.description);
          this.questions.set(orderedQuestions(form.questions));
          this.assignments.set(assignments);
          this.clients.set(clients);
        },
        error: () => this.error.set(this.literals.errorLoad),
      });
  }

  private reloadAssignments(): void {
    this.formsApi
      .getAssignments(this.formId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (assignments) => this.assignments.set(assignments),
      });
  }
}
