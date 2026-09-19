import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, forkJoin, switchMap } from 'rxjs';
import { BonaButtonComponent } from '../../components/bona-button/bona-button.component';
import { BonaConfirm } from '../../components/bona-confirm/bona-confirm.service';
import { BonaFieldComponent } from '../../components/bona-field/bona-field.component';
import { BonaFieldDefinition } from '../../components/bona-field/bona-field.definition';
import { BonaFormComponent, BonaFormValue } from '../../components/bona-form/bona-form.component';
import {
  BonaGridAction,
  BonaGridActionEvent,
  BonaGridColumn,
  BonaGridComponent,
} from '../../components/bona-grid/bona-grid.component';
import { BonaInputTextFieldComponent } from '../../components/bona-input-text-field/bona-input-text-field.component';
import { BonaPageComponent } from '../../components/bona-page/bona-page.component';
import { BonaToast } from '../../components/bona-toast/bona-toast.service';
import { ApiBusinessError } from '../../core/api-business.error';
import { apiErrorMessage } from '../../core/http/api-error-message';
import { BonoDto, BonoWriteDto } from '../../models/bono.dto';
import { ServiceDto, ServiceWriteDto, catalogText } from '../../models/service.dto';
import { ServicesApiService } from '../../services/services-api.service';
import { injectI18n } from '../../core/i18n/inject-i18n';

const NEW_ID = 'new';

const EMPTY_SERVICE: BonaFormValue = {
  nameEs: '',
  nameEn: '',
  allowsSingleSession: 'false',
  bookableByClient: 'true',
  forcesSingleSession: 'false',
  durationMinutes: '60',
  singleSessionPrice: '',
  active: 'true',
  saleKind: 'none',
  saleValue: '',
};

const EMPTY_BONO: BonaFormValue = {
  nameEs: '',
  nameEn: '',
  descriptionEs: '',
  descriptionEn: '',
  sessionCount: '',
  price: '',
};

const SERVICE_PAGE_SIZE = 10;

type CatalogSort = 'name' | 'duration' | 'price' | 'active';

interface CatalogGroup {
  service: ServiceDto;
  bonos: BonoDto[];
}

function parseLocaleNumber(raw: string): number {
  const normalized = raw.trim().replace(',', '.');
  if (!normalized) {
    return Number.NaN;
  }
  return Number(normalized);
}

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [
    BonaPageComponent,
    BonaGridComponent,
    BonaFormComponent,
    BonaButtonComponent,
    BonaInputTextFieldComponent,
    BonaFieldComponent,
  ],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicesComponent {
  private readonly servicesApi = inject(ServicesApiService);
  private readonly confirm = inject(BonaConfirm);
  private readonly toast = inject(BonaToast);
  private readonly destroyRef = inject(DestroyRef);

  private readonly i18n = injectI18n('services');
  private readonly gridI18n = injectI18n('grid');
  get literals() {
    return this.i18n();
  }
  get gridLiterals() {
    return this.gridI18n();
  }
  readonly error = signal('');
  readonly loading = signal(true);
  readonly search = signal('');
  readonly catalogSort = signal<CatalogSort>('name');
  readonly pageIndex = signal(0);
  readonly selectedServiceId = signal<string | null>(null);
  readonly serviceForm = signal<BonaFormValue>({ ...EMPTY_SERVICE });
  readonly bonoFormOpen = signal(false);
  readonly editingBonoId = signal<string | null>(null);
  readonly bonoForm = signal<BonaFormValue>({ ...EMPTY_BONO });

  private readonly services = signal<ServiceDto[]>([]);
  private readonly bonos = signal<BonoDto[]>([]);

  readonly serviceColumns = computed<BonaGridColumn[]>(() => [
    { field: 'name', header: this.literals.name },
    { field: 'kindLabel', header: this.literals.kind },
    { field: 'durationMinutesLabel', header: this.literals.durationMinutes },
    { field: 'sessionCountLabel', header: this.literals.sessionCount },
    { field: 'priceLabel', header: this.literals.price, type: 'currency' },
    { field: 'saleLabel', header: this.literals.sale },
    { field: 'activeLabel', header: this.literals.active },
  ]);

  readonly serviceActions = computed<BonaGridAction[]>(() => [
    { label: this.literals.edit, action: 'edit' },
    { label: this.literals.delete, action: 'delete' },
  ]);

  readonly bonoColumns = computed<BonaGridColumn[]>(() => [
    { field: 'name', header: this.literals.name },
    { field: 'sessionCount', header: this.literals.sessionCount, type: 'number' },
    { field: 'price', header: this.literals.price, type: 'currency' },
    { field: 'description', header: this.literals.description },
  ]);

  readonly bonoActions = computed<BonaGridAction[]>(() => [
    { label: this.literals.edit, action: 'edit' },
    { label: this.literals.delete, action: 'delete' },
  ]);

  readonly sortField = computed<BonaFieldDefinition>(() => ({
    key: 'catalogSort',
    label: this.literals.sortBy,
    type: 'select',
    options: [
      { value: 'name', label: this.literals.sortName },
      { value: 'duration', label: this.literals.sortDuration },
      { value: 'price', label: this.literals.sortPrice },
      { value: 'active', label: this.literals.sortActive },
    ],
  }));

  readonly catalogGroups = computed(() => {
    const query = this.search().trim().toLowerCase();
    const groups = this.services().map((service) => ({
      service,
      bonos: this.sortedBonos(service.id),
    }));
    const matched = query ? groups.filter((group) => this.groupMatches(group, query)) : groups;
    return [...matched].sort((left, right) => this.compareServices(left.service, right.service));
  });

  readonly catalogPageCount = computed(() =>
    Math.max(1, Math.ceil(this.catalogGroups().length / SERVICE_PAGE_SIZE)),
  );

  readonly showCatalogPager = computed(() => this.catalogGroups().length > SERVICE_PAGE_SIZE);

  readonly catalogEmptyMessage = computed(() =>
    this.search().trim() && this.services().length > 0
      ? this.literals.emptyServicesFilter
      : this.literals.emptyServices,
  );

  readonly catalogEmptyAction = computed(() =>
    this.search().trim() ? '' : this.literals.newService,
  );

  readonly catalogPageLabel = computed(() =>
    this.gridLiterals.pageOf
      .replace('{{page}}', String(this.clampedPageIndex() + 1))
      .replace('{{pages}}', String(this.catalogPageCount())),
  );

  readonly catalogCanPrevious = computed(() => this.clampedPageIndex() > 0);
  readonly catalogCanNext = computed(() => this.clampedPageIndex() < this.catalogPageCount() - 1);

  readonly serviceRows = computed(() => {
    const start = this.clampedPageIndex() * SERVICE_PAGE_SIZE;
    const page = this.catalogGroups().slice(start, start + SERVICE_PAGE_SIZE);
    const rows: Record<string, unknown>[] = [];
    for (const group of page) {
      rows.push(this.serviceRow(group.service));
      for (const bono of group.bonos) {
        rows.push(this.bonoRow(group.service, bono));
      }
    }
    return rows;
  });

  readonly selectedBonos = computed(() => {
    const serviceId = this.selectedServiceId();
    if (!serviceId || serviceId === NEW_ID) {
      return [];
    }
    return this.bonos()
      .filter((bono) => bono.serviceId === serviceId)
      .map((bono) => ({ ...bono }));
  });

  readonly isNewService = computed(() => this.selectedServiceId() === NEW_ID);
  readonly showDetail = computed(() => this.selectedServiceId() !== null);

  readonly serviceFields = computed((): BonaFieldDefinition[] => {
    const forcesSingleSession = this.serviceForm()['forcesSingleSession'] === 'true';
    const yesNo = [
      { value: 'true', label: this.literals.yes },
      { value: 'false', label: this.literals.no },
    ];
    const fields: BonaFieldDefinition[] = [
      { key: 'nameEs', label: this.literals.nameEs, type: 'text', required: true },
      { key: 'nameEn', label: this.literals.nameEn, type: 'text' },
      {
        key: 'durationMinutes',
        label: this.literals.durationMinutes,
        type: 'number',
        required: true,
      },
      {
        key: 'singleSessionPrice',
        label: this.literals.singleSessionPrice,
        type: 'number',
        suffix: '€',
      },
      {
        key: 'saleKind',
        label: this.literals.saleKind,
        type: 'select',
        options: [
          { value: 'none', label: this.literals.saleNone },
          { value: 'percent', label: this.literals.salePercent },
          { value: 'amount', label: this.literals.saleAmount },
        ],
      },
    ];
    if (this.serviceForm()['saleKind'] !== 'none') {
      fields.push({
        key: 'saleValue',
        label: this.literals.saleValue,
        type: 'number',
        required: true,
        suffix: this.serviceForm()['saleKind'] === 'percent' ? '%' : '€',
      });
    }
    fields.push(
      {
        key: 'active',
        label: this.literals.active,
        type: 'select',
        options: yesNo,
      },
      {
        key: 'forcesSingleSession',
        label: this.literals.forcesSingleSession,
        type: 'select',
        options: yesNo,
        hint: this.literals.forcesSingleSessionHint,
      },
    );
    if (!forcesSingleSession) {
      fields.push(
        {
          key: 'bookableByClient',
          label: this.literals.bookableByClient,
          type: 'select',
          options: yesNo,
        },
        {
          key: 'allowsSingleSession',
          label: this.literals.allowsSingleSession,
          type: 'select',
          options: yesNo,
          hint: this.literals.allowsSingleSessionHint,
        },
      );
    }
    return fields;
  });

  readonly bonoFields = computed<BonaFieldDefinition[]>(() => [
    { key: 'nameEs', label: this.literals.nameEs, type: 'text', required: true },
    { key: 'nameEn', label: this.literals.nameEn, type: 'text' },
    { key: 'sessionCount', label: this.literals.sessionCount, type: 'number', required: true },
    { key: 'price', label: this.literals.price, type: 'number', required: true, suffix: '€' },
    { key: 'descriptionEs', label: this.literals.descriptionEs, type: 'textarea' },
    { key: 'descriptionEn', label: this.literals.descriptionEn, type: 'textarea' },
  ]);

  constructor() {
    this.loadAll();
  }

  onSearch(value: string): void {
    this.search.set(value);
    this.pageIndex.set(0);
  }

  onCatalogSort(value: string): void {
    this.catalogSort.set((value as CatalogSort) || 'name');
    this.pageIndex.set(0);
  }

  onCatalogPrevious(): void {
    this.pageIndex.set(Math.max(0, this.clampedPageIndex() - 1));
  }

  onCatalogNext(): void {
    this.pageIndex.set(Math.min(this.catalogPageCount() - 1, this.clampedPageIndex() + 1));
  }

  onCreateService(): void {
    this.selectedServiceId.set(NEW_ID);
    this.serviceForm.set({ ...EMPTY_SERVICE });
    this.closeBonoForm();
    this.error.set('');
  }

  onServiceRowClick(item: Record<string, unknown>): void {
    if (item['rowKind'] === 'bono') {
      this.selectBono(String(item['id'] ?? ''));
      return;
    }
    this.selectService(String(item['id'] ?? ''));
  }

  onServiceAction(event: BonaGridActionEvent<Record<string, unknown>>): void {
    const id = String(event.item['id'] ?? '');
    if (event.item['rowKind'] === 'bono') {
      if (event.action === 'edit') {
        this.selectBono(id);
        return;
      }
      if (event.action === 'delete' && id) {
        this.deleteBono(id);
      }
      return;
    }
    if (event.action === 'edit') {
      this.selectService(id);
      return;
    }
    if (event.action === 'delete' && id) {
      this.deleteService(id);
    }
  }

  onServiceFormChange(value: BonaFormValue): void {
    if (value['forcesSingleSession'] === 'true') {
      this.serviceForm.set({
        ...value,
        allowsSingleSession: 'true',
        bookableByClient: 'false',
      });
      return;
    }
    this.serviceForm.set(value);
  }

  onSaveService(value: BonaFormValue): void {
    const payload = this.toServiceWrite(value);
    if (!payload) {
      return;
    }
    const id = this.selectedServiceId();
    const request =
      !id || id === NEW_ID
        ? this.servicesApi.createService(payload)
        : this.servicesApi.updateService(id, payload);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success(this.literals.saved);
        this.onCancelService();
        this.loadAll();
      },
      error: (error: unknown) => this.reportSaveError(error),
    });
  }

  onCancelService(): void {
    this.selectedServiceId.set(null);
    this.closeBonoForm();
    this.error.set('');
  }

  onCreateBono(): void {
    const serviceId = this.selectedServiceId();
    if (!serviceId || serviceId === NEW_ID) {
      return;
    }
    this.editingBonoId.set(NEW_ID);
    this.bonoForm.set({ ...EMPTY_BONO });
    this.bonoFormOpen.set(true);
  }

  onBonoAction(event: BonaGridActionEvent<Record<string, unknown>>): void {
    const id = String(event.item['id'] ?? '');
    if (event.action === 'edit') {
      this.selectBono(id);
      return;
    }
    if (event.action === 'delete' && id) {
      this.deleteBono(id);
    }
  }

  onBonoFormChange(value: BonaFormValue): void {
    this.bonoForm.set(value);
  }

  onSaveBono(value: BonaFormValue): void {
    const serviceId = this.selectedServiceId();
    if (!serviceId || serviceId === NEW_ID) {
      return;
    }
    const payload = this.toBonoWrite(value, serviceId);
    if (!payload) {
      return;
    }
    const id = this.editingBonoId();
    const request =
      !id || id === NEW_ID
        ? this.servicesApi.createBono(payload)
        : this.servicesApi.updateBono(id, payload);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success(this.literals.saved);
        this.closeBonoForm();
        this.loadAll();
      },
      error: (error: unknown) => this.reportSaveError(error),
    });
  }

  onCancelBono(): void {
    this.closeBonoForm();
  }

  private selectService(id: string): void {
    const service = this.services().find((item) => item.id === id);
    if (!service) {
      return;
    }
    this.selectedServiceId.set(service.id);
    this.serviceForm.set(this.toServiceForm(service));
    this.closeBonoForm();
    this.error.set('');
  }

  private selectBono(id: string): void {
    const bono = this.bonos().find((item) => item.id === id);
    if (!bono) {
      return;
    }
    this.selectService(bono.serviceId);
    this.editingBonoId.set(bono.id);
    this.bonoForm.set(this.toBonoForm(bono));
    this.bonoFormOpen.set(true);
  }

  private deleteService(id: string): void {
    this.confirm
      .open({
        title: this.literals.confirmDeleteServiceTitle,
        message: this.literals.confirmDeleteServiceMessage,
        confirmLabel: this.literals.delete,
      })
      .pipe(
        filter((ok) => ok),
        switchMap(() => this.servicesApi.deleteService(id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          if (this.selectedServiceId() === id) {
            this.selectedServiceId.set(null);
            this.closeBonoForm();
          }
          this.toast.success(this.literals.deleted);
          this.loadAll();
        },
        error: (error: unknown) => this.toast.error(this.deleteError(error)),
      });
  }

  private deleteBono(id: string): void {
    this.confirm
      .open({
        title: this.literals.confirmDeleteBonoTitle,
        message: this.literals.confirmDeleteBonoMessage,
        confirmLabel: this.literals.delete,
      })
      .pipe(
        filter((ok) => ok),
        switchMap(() => this.servicesApi.deleteBono(id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          if (this.editingBonoId() === id) {
            this.closeBonoForm();
          }
          this.toast.success(this.literals.deleted);
          this.loadAll();
        },
        error: (error: unknown) => this.toast.error(this.deleteError(error)),
      });
  }

  private reportSaveError(error: unknown): void {
    const message = apiErrorMessage(error, {
      fallback: this.literals.errorSave,
      connection: this.literals.errorConnection,
      salePercent: this.literals.errorSalePercent,
      saveWithField: this.literals.errorSaveField,
      fieldLabels: {
        name: this.literals.name,
        durationMinutes: this.literals.durationMinutes,
        singleSessionPrice: this.literals.singleSessionPrice,
        saleKind: this.literals.saleKind,
        saleValue: this.literals.saleValue,
        sessionCount: this.literals.sessionCount,
        price: this.literals.price,
      },
    });
    this.toast.error(message);
  }

  private deleteError(error: unknown): string {
    if (
      error instanceof ApiBusinessError &&
      (error.code === 'service.hasRelations' || error.code === 'bono.hasRelations')
    ) {
      return this.literals.errorAssigned;
    }
    return this.literals.errorSave;
  }

  private loadAll(after?: () => void): void {
    forkJoin({
      services: this.servicesApi.getServices(),
      bonos: this.servicesApi.getBonos(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ services, bonos }) => {
          this.services.set(services);
          this.bonos.set(bonos);
          this.loading.set(false);
          after?.();
        },
        error: (error: unknown) => {
          this.reportSaveError(error);
          this.loading.set(false);
        },
      });
  }

  private closeBonoForm(): void {
    this.bonoFormOpen.set(false);
    this.editingBonoId.set(null);
  }

  private clampedPageIndex(): number {
    return Math.min(this.pageIndex(), this.catalogPageCount() - 1);
  }

  private sortedBonos(serviceId: string): BonoDto[] {
    return this.bonos()
      .filter((bono) => bono.serviceId === serviceId)
      .slice()
      .sort((left, right) => {
        if (left.sessionCount !== right.sessionCount) {
          return left.sessionCount - right.sessionCount;
        }
        return left.price - right.price;
      });
  }

  private groupMatches(group: CatalogGroup, query: string): boolean {
    if (this.serviceHaystack(group.service).includes(query)) {
      return true;
    }
    return group.bonos.some((bono) => this.bonoHaystack(group.service, bono).includes(query));
  }

  private serviceHaystack(service: ServiceDto): string {
    return [
      service.name,
      this.literals.kindService,
      String(service.durationMinutes),
      service.singleSessionPrice ?? '',
      this.saleLabel(service),
      service.active ? this.literals.yes : this.literals.no,
    ]
      .join(' ')
      .toLowerCase();
  }

  private bonoHaystack(service: ServiceDto, bono: BonoDto): string {
    return [bono.name, this.literals.kindBono, String(bono.sessionCount), String(bono.price), this.saleLabel(service)]
      .join(' ')
      .toLowerCase();
  }

  private compareServices(left: ServiceDto, right: ServiceDto): number {
    const byName = left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' });
    switch (this.catalogSort()) {
      case 'duration': {
        const delta = left.durationMinutes - right.durationMinutes;
        return delta !== 0 ? delta : byName;
      }
      case 'price': {
        const delta = (left.singleSessionPrice ?? Number.POSITIVE_INFINITY) - (right.singleSessionPrice ?? Number.POSITIVE_INFINITY);
        return delta !== 0 ? delta : byName;
      }
      case 'active': {
        const delta = Number(right.active) - Number(left.active);
        return delta !== 0 ? delta : byName;
      }
      default:
        return byName;
    }
  }

  private serviceRow(service: ServiceDto): Record<string, unknown> {
    return {
      rowKind: 'service',
      id: service.id,
      name: service.name,
      kindLabel: this.literals.kindService,
      durationMinutesLabel: String(service.durationMinutes),
      sessionCountLabel: '',
      priceLabel: service.singleSessionPrice,
      saleLabel: this.saleLabel(service),
      activeLabel: service.active ? this.literals.yes : this.literals.no,
    };
  }

  private bonoRow(service: ServiceDto, bono: BonoDto): Record<string, unknown> {
    return {
      rowKind: 'bono',
      id: bono.id,
      serviceId: service.id,
      name: bono.name,
      kindLabel: this.literals.kindBono,
      durationMinutesLabel: '',
      sessionCountLabel: String(bono.sessionCount),
      priceLabel: bono.price,
      saleLabel: this.saleLabel(service),
      activeLabel: '',
    };
  }

  private toServiceForm(service: ServiceDto): BonaFormValue {
    return {
      nameEs: catalogText(service.i18n, 'name', 'es', service.name),
      nameEn: catalogText(service.i18n, 'name', 'en'),
      allowsSingleSession: service.allowsSingleSession ? 'true' : 'false',
      bookableByClient: service.bookableByClient ? 'true' : 'false',
      forcesSingleSession: service.forcesSingleSession ? 'true' : 'false',
      durationMinutes: String(service.durationMinutes),
      singleSessionPrice:
        service.singleSessionPrice != null ? String(service.singleSessionPrice) : '',
      active: service.active ? 'true' : 'false',
      saleKind: service.saleKind ?? 'none',
      saleValue: service.saleValue != null && service.saleKind !== 'none' ? String(service.saleValue) : '',
    };
  }

  private toBonoForm(bono: BonoDto): BonaFormValue {
    return {
      nameEs: catalogText(bono.i18n, 'name', 'es', bono.name),
      nameEn: catalogText(bono.i18n, 'name', 'en'),
      descriptionEs: catalogText(bono.i18n, 'description', 'es', bono.description),
      descriptionEn: catalogText(bono.i18n, 'description', 'en'),
      sessionCount: String(bono.sessionCount),
      price: String(bono.price),
    };
  }

  private toServiceWrite(value: BonaFormValue): ServiceWriteDto | null {
    const nameEs = (value['nameEs'] ?? '').trim();
    const nameEn = (value['nameEn'] ?? '').trim() || nameEs;
    const durationMinutes = parseLocaleNumber(value['durationMinutes'] ?? '');
    if (!nameEs) {
      this.error.set(this.literals.errorRequired);
      return null;
    }
    if (Number.isNaN(durationMinutes) || durationMinutes <= 0 || !Number.isInteger(durationMinutes)) {
      this.error.set(
        Number.isNaN(durationMinutes) || !Number.isInteger(durationMinutes)
          ? this.literals.errorInvalidNumber
          : this.literals.errorRequired,
      );
      return null;
    }
    const forcesSingleSession = value['forcesSingleSession'] === 'true';
    const payload: ServiceWriteDto = {
      name: nameEs,
      sharesSessionPool: true,
      forcesSingleSession,
      allowsSingleSession: value['allowsSingleSession'] === 'true',
      bookableByClient: value['bookableByClient'] === 'true',
      durationMinutes,
      active: value['active'] !== 'false',
      saleKind: (value['saleKind'] || 'none') as ServiceWriteDto['saleKind'],
      saleValue: 0,
      i18n: { name: { es: nameEs, en: nameEn } },
    };
    if (payload.saleKind && payload.saleKind !== 'none') {
      const saleRaw = (value['saleValue'] ?? '').trim();
      if (!saleRaw) {
        this.error.set(this.literals.errorRequired);
        return null;
      }
      const saleValue = parseLocaleNumber(saleRaw);
      if (Number.isNaN(saleValue) || saleValue <= 0) {
        this.error.set(this.literals.errorInvalidNumber);
        return null;
      }
      if (payload.saleKind === 'percent' && saleValue > 100) {
        this.error.set(this.literals.errorSalePercent);
        return null;
      }
      payload.saleValue = saleValue;
    }
    const priceRaw = (value['singleSessionPrice'] ?? '').trim();
    if (priceRaw !== '') {
      const price = parseLocaleNumber(priceRaw);
      if (Number.isNaN(price) || price < 0) {
        this.error.set(this.literals.errorInvalidNumber);
        return null;
      }
      payload.singleSessionPrice = price;
    }
    this.error.set('');
    return payload;
  }

  private saleLabel(service: ServiceDto): string {
    if (!service.saleKind || service.saleKind === 'none' || !service.saleValue) {
      return '';
    }
    if (service.saleKind === 'percent') {
      return `-${service.saleValue}%`;
    }
    return `-${service.saleValue}`;
  }

  private toBonoWrite(value: BonaFormValue, serviceId: string): BonoWriteDto | null {
    const nameEs = (value['nameEs'] ?? '').trim();
    const nameEn = (value['nameEn'] ?? '').trim() || nameEs;
    const sessionCount = parseLocaleNumber(value['sessionCount'] ?? '');
    const price = parseLocaleNumber(value['price'] ?? '');
    if (!nameEs) {
      this.error.set(this.literals.errorRequired);
      return null;
    }
    if (
      Number.isNaN(sessionCount) ||
      Number.isNaN(price) ||
      sessionCount <= 0 ||
      price < 0 ||
      !Number.isInteger(sessionCount)
    ) {
      this.error.set(this.literals.errorInvalidNumber);
      return null;
    }
    const descriptionEs = (value['descriptionEs'] ?? '').trim();
    const descriptionEn = (value['descriptionEn'] ?? '').trim();
    this.error.set('');
    return {
      serviceId,
      name: nameEs,
      description: descriptionEs,
      sessionCount,
      price,
      i18n: {
        name: { es: nameEs, en: nameEn },
        description: { es: descriptionEs, en: descriptionEn },
      },
    };
  }
}
