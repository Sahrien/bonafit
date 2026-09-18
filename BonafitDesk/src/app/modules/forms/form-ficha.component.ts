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
import { filter, forkJoin, map, switchMap } from 'rxjs';
import { BonaButtonComponent } from '../../components/bona-button/bona-button.component';
import { BonaConfirm } from '../../components/bona-confirm/bona-confirm.service';
import { BonaFieldComponent } from '../../components/bona-field/bona-field.component';
import { BonaFieldDefinition } from '../../components/bona-field/bona-field.definition';
import {
  BonaGridAction,
  BonaGridActionEvent,
  BonaGridColumn,
  BonaGridComponent,
} from '../../components/bona-grid/bona-grid.component';
import { BonaInputTextFieldComponent } from '../../components/bona-input-text-field/bona-input-text-field.component';
import { MatIcon } from '@angular/material/icon';
import { BonaPageComponent } from '../../components/bona-page/bona-page.component';
import { BonaTabsComponent, BonaTabItem } from '../../components/bona-tabs/bona-tabs.component';
import { BonaToast } from '../../components/bona-toast/bona-toast.service';
import { BonaFormValue } from '../../components/bona-form/bona-form.component';
import { mapToAnswers, missingRequiredAnswers } from '../../core/form-answers';
import { ClientDto } from '../../models/client.dto';
import {
  FormAssignmentDto,
  FormQuestionDto,
  FormQuestionType,
  FormWriteDto,
  isFormHeading,
  questionHasOptions,
} from '../../models/form.dto';
import { ClientsApiService } from '../../services/clients-api.service';
import { FormsApiService } from '../../services/forms-api.service';
import { injectI18n } from '../../core/i18n/inject-i18n';
import { CatalogI18n, catalogText } from '../../models/service.dto';
import { FormFillViewComponent } from './form-fill-view.component';
import { answerDisplayItems, groupAnswerDisplayItems, groupQuestionsByHeading, orderedQuestions } from './form-question.mapper';

const NEW_FORM_ID = 'new';

const DESCRIPTION_FIELD: BonaFieldDefinition = {
  key: 'description',
  label: '',
  type: 'textarea',
};

const DESCRIPTION_EN_FIELD: BonaFieldDefinition = {
  key: 'descriptionEn',
  label: '',
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
    BonaPageComponent,
    BonaTabsComponent,
    FormFillViewComponent,
    MatIcon,
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
  private readonly confirm = inject(BonaConfirm);
  private readonly toast = inject(BonaToast);
  private readonly destroyRef = inject(DestroyRef);

  private readonly i18n = injectI18n('forms');
  get literals() {
    return this.i18n();
  }
  readonly descriptionField = DESCRIPTION_FIELD;
  readonly descriptionEnField = DESCRIPTION_EN_FIELD;

  readonly typeField = computed<BonaFieldDefinition>(() => ({
    key: 'type',
    label: this.literals.type,
    type: 'select',
    options: [
      { value: 'shortText', label: this.literals.typeShortText },
      { value: 'fullName', label: this.literals.typeFullName },
      { value: 'email', label: this.literals.typeEmail },
      { value: 'phone', label: this.literals.typePhone },
      { value: 'date', label: this.literals.typeDate },
      { value: 'number', label: this.literals.typeNumber },
      { value: 'address', label: this.literals.typeAddress },
      { value: 'text', label: this.literals.typeText },
      { value: 'yesno', label: this.literals.typeYesNo },
      { value: 'dropdown', label: this.literals.typeDropdown },
      { value: 'singleChoice', label: this.literals.typeSingleChoice },
      { value: 'multipleChoice', label: this.literals.typeMultipleChoice },
      { value: 'ranking', label: this.literals.typeRanking },
      { value: 'terms', label: this.literals.typeTerms },
    ],
  }));

  readonly requiredField = computed<BonaFieldDefinition>(() => ({
    key: 'required',
    label: this.literals.required,
    type: 'select',
    options: [
      { value: 'true', label: this.literals.yes },
      { value: 'false', label: this.literals.no },
    ],
  }));

  readonly headingPromptField = computed<BonaFieldDefinition>(() => ({
    key: 'headingPrompt',
    label: this.literals.promptEs,
    type: 'textarea',
  }));

  readonly headingPromptEnField = computed<BonaFieldDefinition>(() => ({
    key: 'headingPromptEn',
    label: this.literals.promptEn,
    type: 'textarea',
  }));

  readonly title = signal('');
  readonly titleEn = signal('');
  readonly description = signal('');
  readonly descriptionEn = signal('');
  readonly questions = signal<FormQuestionDto[]>([]);
  readonly error = signal('');
  readonly feedback = signal('');
  readonly loading = signal(true);
  readonly tab = signal('template');
  readonly clientSearch = signal('');
  readonly saving = signal(false);
  readonly assigning = signal(false);
  readonly previewing = signal(false);
  readonly previewValue = signal<BonaFormValue>({});
  readonly previewError = signal('');
  readonly selectedClientIds = signal<Set<string>>(new Set());
  readonly selectedAssignmentId = signal<string | null>(null);
  private readonly openQuestionIds = signal<ReadonlySet<string>>(new Set());

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
  readonly previewPageTitle = computed(() => this.title().trim() || this.pageTitle());
  readonly fieldLabels = computed(() => ({
    yes: this.literals.yes,
    no: this.literals.no,
    firstName: this.literals.firstName,
    lastName: this.literals.lastName,
    moveUp: this.literals.moveUp,
    moveDown: this.literals.moveDown,
  }));
  readonly hasOptions = questionHasOptions;

  readonly templateBlocks = computed(() => groupQuestionsByHeading(this.questions()));

  readonly pendingClientIds = computed(() => {
    const pending = new Set<string>();
    for (const assignment of this.assignments()) {
      if (assignment.status === 'pending') {
        pending.add(assignment.clientId);
      }
    }
    return pending;
  });

  readonly clientRows = computed(() => {
    const query = this.clientSearch().trim().toLowerCase();
    const source = this.clients();
    if (!query) {
      return source;
    }
    return source.filter((client) =>
      `${client.firstName} ${client.lastName}`.toLowerCase().includes(query),
    );
  });

  readonly tabs = computed<BonaTabItem[]>(() => [
    { id: 'template', label: this.literals.tabTemplate },
    { id: 'assign', label: this.literals.tabAssign },
    { id: 'responses', label: this.literals.tabResponses },
  ]);

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

  readonly assignmentColumns = computed<BonaGridColumn[]>(() => [
    { field: 'clientName', header: this.literals.client },
    { field: 'statusLabel', header: this.literals.status },
    { field: 'assignedAt', header: this.literals.assignedAt, type: 'date' },
    { field: 'submittedAtLabel', header: this.literals.submittedAt, type: 'date' },
  ]);

  readonly assignmentActions = computed<BonaGridAction[]>(() => [
    { label: this.literals.view, action: 'view' },
  ]);

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
      firstName: this.literals.firstName,
      lastName: this.literals.lastName,
      moveUp: this.literals.moveUp,
      moveDown: this.literals.moveDown,
    };
    const client = this.clients().find((row) => row.id === assignment.clientId);
    return {
      clientName: client ? `${client.firstName} ${client.lastName}` : assignment.clientId,
      blocks: groupAnswerDisplayItems(
        answerDisplayItems(assignment.questions, assignment.answers, labels),
      ),
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

  onTabChange(id: string): void {
    this.tab.set(id);
  }

  onClientSearch(value: string): void {
    this.clientSearch.set(value);
  }

  onTitleChange(value: string): void {
    this.title.set(value);
  }

  onTitleEnChange(value: string): void {
    this.titleEn.set(value);
  }

  onDescriptionChange(value: string): void {
    this.description.set(value);
  }

  onDescriptionEnChange(value: string): void {
    this.descriptionEn.set(value);
  }

  onAddQuestion(): void {
    this.insertQuestion('text', true, this.questions().length);
  }

  onAddQuestionToSection(headingId: string): void {
    const list = this.questions();
    const headingIndex = list.findIndex((question) => question.id === headingId);
    if (headingIndex < 0) {
      this.onAddQuestion();
      return;
    }
    let insertAt = headingIndex + 1;
    while (insertAt < list.length && !isFormHeading(list[insertAt].type)) {
      insertAt += 1;
    }
    this.insertQuestion('text', true, insertAt);
  }

  onAddHeading(): void {
    this.insertQuestion('heading', false, this.questions().length);
  }

  questionIndex(questionId: string): number {
    return this.questions().findIndex((question) => question.id === questionId);
  }

  isQuestionOpen(questionId: string): boolean {
    return this.openQuestionIds().has(questionId);
  }

  onToggleQuestion(questionId: string): void {
    this.openQuestionIds.update((ids) => {
      const next = new Set(ids);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }

  typeLabel(type: FormQuestionType): string {
    if (isFormHeading(type)) {
      return this.literals.typeHeading;
    }
    return this.typeField().options?.find((option) => option.value === type)?.label ?? type;
  }

  onPromptChange(questionId: string, prompt: string): void {
    this.patchQuestion(questionId, { prompt });
  }

  onPromptEnChange(questionId: string, promptEn: string): void {
    this.questions.update((list) =>
      list.map((question) =>
        question.id === questionId
          ? { ...question, i18n: this.withLocale(question.i18n, 'prompt', question.prompt, promptEn) }
          : question,
      ),
    );
  }

  onTypeChange(questionId: string, typeValue: string): void {
    const type = typeValue as FormQuestionType;
    this.questions.update((list) =>
      list.map((question) => {
        if (question.id !== questionId) {
          return question;
        }
        if (questionHasOptions(type)) {
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

  onOptionEnChange(questionId: string, optionId: string, optionEn: string): void {
    this.questions.update((list) =>
      list.map((question) =>
        question.id === questionId
          ? {
              ...question,
              options: (question.options ?? []).map((option) =>
                option.id === optionId
                  ? { ...option, i18n: this.withLocale(option.i18n, 'label', option.label, optionEn) }
                  : option,
              ),
            }
          : question,
      ),
    );
  }

  promptEn(question: FormQuestionDto): string {
    return catalogText(question.i18n, 'prompt', 'en');
  }

  optionEn(option: { i18n?: CatalogI18n }): string {
    return catalogText(option.i18n, 'label', 'en');
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
        this.title.set(catalogText(form.i18n, 'title', 'es', form.title));
        this.titleEn.set(catalogText(form.i18n, 'title', 'en'));
        this.description.set(catalogText(form.i18n, 'description', 'es', form.description));
        this.descriptionEn.set(catalogText(form.i18n, 'description', 'en'));
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
    this.confirm
      .open({
        title: this.literals.confirmDeleteTitle,
        message: this.literals.confirmDeleteMessage,
        confirmLabel: this.literals.delete,
      })
      .pipe(
        filter((ok) => ok),
        switchMap(() => this.formsApi.deleteForm(this.formId())),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.toast.success(this.literals.deleted);
          this.onBack();
        },
        error: () => this.toast.error(this.literals.errorSave),
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

  onPreview(): void {
    if (this.questions().length === 0) {
      return;
    }
    this.previewing.set(true);
    this.previewValue.set({});
    this.previewError.set('');
    this.error.set('');
    this.feedback.set('');
  }

  onClosePreview(): void {
    this.previewing.set(false);
    this.previewError.set('');
  }

  onPreviewValue(value: BonaFormValue): void {
    this.previewValue.set(value);
  }

  onPreviewSubmit(value: BonaFormValue): void {
    const answers = mapToAnswers(this.questions(), value);
    if (missingRequiredAnswers(this.questions(), answers).length > 0) {
      this.previewError.set(this.literals.requiredError);
      this.feedback.set('');
      return;
    }
    this.previewError.set('');
    this.feedback.set(this.literals.previewSubmitted);
  }

  private insertQuestion(type: FormQuestionType, required: boolean, index: number): void {
    const id = crypto.randomUUID();
    this.questions.update((list) => {
      const next = [...list];
      next.splice(index, 0, {
        id,
        prompt: '',
        type,
        required,
        sortOrder: index,
      });
      return next.map((question, sortOrder) => ({ ...question, sortOrder }));
    });
    this.openQuestionIds.update((ids) => new Set(ids).add(id));
  }

  private patchQuestion(questionId: string, patch: Partial<FormQuestionDto>): void {
    this.questions.update((list) =>
      list.map((question) => (question.id === questionId ? { ...question, ...patch } : question)),
    );
  }

  private withLocale(
    i18n: CatalogI18n | undefined,
    key: string,
    es: string,
    en: string,
  ): CatalogI18n {
    return { ...i18n, [key]: { es, en } };
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
      if (questionHasOptions(question.type)) {
        const options = (question.options ?? [])
          .map((option) => ({ ...option, label: option.label.trim() }))
          .filter((option) => option.label.length > 0)
          .map((option, optionIndex) => ({
            ...option,
            sortOrder: optionIndex,
            i18n: this.withLocale(option.i18n, 'label', option.label, catalogText(option.i18n, 'label', 'en')),
          }));
        if (options.length < 2) {
          this.error.set(this.literals.errorQuestion);
          return null;
        }
        cleaned.push({
          ...question,
          prompt,
          sortOrder: cleaned.length,
          options,
          i18n: this.withLocale(question.i18n, 'prompt', prompt, catalogText(question.i18n, 'prompt', 'en')),
        });
      } else {
        cleaned.push({
          ...question,
          prompt,
          required: isFormHeading(question.type) ? false : question.required,
          sortOrder: cleaned.length,
          options: undefined,
          i18n: this.withLocale(question.i18n, 'prompt', prompt, catalogText(question.i18n, 'prompt', 'en')),
        });
      }
    }
    this.error.set('');
    const titleEn = this.titleEn().trim();
    const description = this.description().trim();
    const descriptionEn = this.descriptionEn().trim();
    return {
      title,
      description,
      i18n: {
        title: { es: title, en: titleEn },
        description: { es: description, en: descriptionEn },
      },
      questions: cleaned,
    };
  }

  private load(id: string): void {
    this.error.set('');
    this.feedback.set('');
    this.selectedAssignmentId.set(null);
    this.selectedClientIds.set(new Set());
    this.tab.set('template');
    this.clientSearch.set('');
    this.previewing.set(false);
    this.previewValue.set({});
    this.previewError.set('');
    this.openQuestionIds.set(new Set());
    if (!id || id === NEW_FORM_ID) {
      this.title.set('');
      this.titleEn.set('');
      this.description.set('');
      this.descriptionEn.set('');
      this.questions.set([]);
      this.assignments.set([]);
      this.clients.set([]);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    forkJoin({
      form: this.formsApi.getForm(id),
      assignments: this.formsApi.getAssignments(id),
      clients: this.clientsApi.getClients(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ form, assignments, clients }) => {
          this.title.set(catalogText(form.i18n, 'title', 'es', form.title));
          this.titleEn.set(catalogText(form.i18n, 'title', 'en'));
          this.description.set(catalogText(form.i18n, 'description', 'es', form.description));
          this.descriptionEn.set(catalogText(form.i18n, 'description', 'en'));
          this.questions.set(orderedQuestions(form.questions));
          this.assignments.set(assignments);
          this.clients.set(clients);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(this.literals.errorLoad);
          this.loading.set(false);
        },
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
