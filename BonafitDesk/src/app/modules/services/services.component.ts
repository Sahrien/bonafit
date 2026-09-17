import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, forkJoin, switchMap } from 'rxjs';
import { BonaButtonComponent } from '../../components/bona-button/bona-button.component';
import { BonaConfirm } from '../../components/bona-confirm/bona-confirm.service';
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
import { BonoDto, BonoWriteDto } from '../../models/bono.dto';
import { ServiceDto, ServiceWriteDto } from '../../models/service.dto';
import { ServicesApiService } from '../../services/services-api.service';
import { SERVICES_LITERALS } from './services.literals';

const NEW_ID = 'new';

const EMPTY_SERVICE: BonaFormValue = {
  name: '',
  allowsSingleSession: 'false',
  bookableByClient: 'true',
  sharesSessionPool: 'true',
  forcesSingleSession: 'false',
  durationMinutes: '60',
  singleSessionPrice: '',
  active: 'true',
};

const EMPTY_BONO: BonaFormValue = {
  name: '',
  description: '',
  sessionCount: '',
  price: '',
};

const YES_NO_OPTIONS = [
  { value: 'true', label: SERVICES_LITERALS.yes },
  { value: 'false', label: SERVICES_LITERALS.no },
];

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [
    BonaPageComponent,
    BonaGridComponent,
    BonaFormComponent,
    BonaButtonComponent,
    BonaInputTextFieldComponent,
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

  readonly literals = SERVICES_LITERALS;
  readonly error = signal('');
  readonly loading = signal(true);
  readonly search = signal('');
  readonly selectedServiceId = signal<string | null>(null);
  readonly serviceForm = signal<BonaFormValue>({ ...EMPTY_SERVICE });
  readonly bonoFormOpen = signal(false);
  readonly editingBonoId = signal<string | null>(null);
  readonly bonoForm = signal<BonaFormValue>({ ...EMPTY_BONO });

  private readonly services = signal<ServiceDto[]>([]);
  private readonly bonos = signal<BonoDto[]>([]);

  readonly serviceColumns: BonaGridColumn[] = [
    { field: 'name', header: SERVICES_LITERALS.name },
    { field: 'kindLabel', header: SERVICES_LITERALS.kind },
    { field: 'durationMinutesLabel', header: SERVICES_LITERALS.durationMinutes },
    { field: 'sessionCountLabel', header: SERVICES_LITERALS.sessionCount },
    { field: 'priceLabel', header: SERVICES_LITERALS.price, type: 'currency' },
    { field: 'activeLabel', header: SERVICES_LITERALS.active },
  ];

  readonly serviceActions: BonaGridAction[] = [
    { label: SERVICES_LITERALS.edit, action: 'edit' },
    { label: SERVICES_LITERALS.delete, action: 'delete' },
  ];

  readonly bonoColumns: BonaGridColumn[] = [
    { field: 'name', header: SERVICES_LITERALS.name },
    { field: 'sessionCount', header: SERVICES_LITERALS.sessionCount, type: 'number' },
    { field: 'price', header: SERVICES_LITERALS.price, type: 'currency' },
    { field: 'description', header: SERVICES_LITERALS.description },
  ];

  readonly bonoActions: BonaGridAction[] = [
    { label: SERVICES_LITERALS.edit, action: 'edit' },
    { label: SERVICES_LITERALS.delete, action: 'delete' },
  ];

  readonly serviceRows = computed(() => {
    const query = this.search().trim().toLowerCase();
    const rows: Record<string, unknown>[] = [];
    for (const service of this.services()) {
      const serviceBonos = this.bonos().filter((bono) => bono.serviceId === service.id);
      const serviceMatches = !query || service.name.toLowerCase().includes(query);
      const matchingBonos = query
        ? serviceBonos.filter((bono) => bono.name.toLowerCase().includes(query))
        : serviceBonos;
      if (!serviceMatches && matchingBonos.length === 0) {
        continue;
      }
      rows.push({
        rowKind: 'service',
        id: service.id,
        name: service.name,
        kindLabel: this.literals.kindService,
        durationMinutesLabel: String(service.durationMinutes),
        sessionCountLabel: '',
        priceLabel: service.singleSessionPrice,
        activeLabel: service.active ? this.literals.yes : this.literals.no,
      });
      for (const bono of serviceMatches ? serviceBonos : matchingBonos) {
        rows.push({
          rowKind: 'bono',
          id: bono.id,
          serviceId: service.id,
          name: bono.name,
          kindLabel: this.literals.kindBono,
          durationMinutesLabel: '',
          sessionCountLabel: String(bono.sessionCount),
          priceLabel: bono.price,
          activeLabel: '',
        });
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
    const fields: BonaFieldDefinition[] = [
      { key: 'name', label: this.literals.name, type: 'text', required: true },
      {
        key: 'durationMinutes',
        label: this.literals.durationMinutes,
        type: 'number',
        required: true,
      },
      {
        key: 'singleSessionPrice',
        label: this.literals.price,
        type: 'number',
      },
      {
        key: 'active',
        label: this.literals.active,
        type: 'select',
        options: YES_NO_OPTIONS,
      },
      {
        key: 'sharesSessionPool',
        label: this.literals.sharesSessionPool,
        type: 'select',
        options: YES_NO_OPTIONS,
      },
      {
        key: 'forcesSingleSession',
        label: this.literals.forcesSingleSession,
        type: 'select',
        options: YES_NO_OPTIONS,
      },
    ];
    if (!forcesSingleSession) {
      fields.push(
        {
          key: 'bookableByClient',
          label: this.literals.bookableByClient,
          type: 'select',
          options: YES_NO_OPTIONS,
        },
        {
          key: 'allowsSingleSession',
          label: this.literals.allowsSingleSession,
          type: 'select',
          options: YES_NO_OPTIONS,
        },
      );
    }
    return fields;
  });

  readonly bonoFields: BonaFieldDefinition[] = [
    { key: 'name', label: SERVICES_LITERALS.name, type: 'text', required: true },
    { key: 'sessionCount', label: SERVICES_LITERALS.sessionCount, type: 'number', required: true },
    { key: 'price', label: SERVICES_LITERALS.price, type: 'number', required: true },
    { key: 'description', label: SERVICES_LITERALS.description, type: 'textarea' },
  ];

  constructor() {
    this.loadAll();
  }

  onSearch(value: string): void {
    this.search.set(value);
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
      next: (service) => {
        this.toast.success(this.literals.saved);
        this.loadAll(() => this.selectService(service.id));
      },
      error: () => this.toast.error(this.literals.errorSave),
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
      error: () => this.toast.error(this.literals.errorSave),
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
        error: () => {
          this.toast.error(this.literals.errorSave);
          this.loading.set(false);
        },
      });
  }

  private closeBonoForm(): void {
    this.bonoFormOpen.set(false);
    this.editingBonoId.set(null);
  }

  private toServiceForm(service: ServiceDto): BonaFormValue {
    return {
      name: service.name,
      allowsSingleSession: service.allowsSingleSession ? 'true' : 'false',
      bookableByClient: service.bookableByClient ? 'true' : 'false',
      sharesSessionPool: service.sharesSessionPool ? 'true' : 'false',
      forcesSingleSession: service.forcesSingleSession ? 'true' : 'false',
      durationMinutes: String(service.durationMinutes),
      singleSessionPrice:
        service.singleSessionPrice != null ? String(service.singleSessionPrice) : '',
      active: service.active ? 'true' : 'false',
    };
  }

  private toBonoForm(bono: BonoDto): BonaFormValue {
    return {
      name: bono.name,
      description: bono.description,
      sessionCount: String(bono.sessionCount),
      price: String(bono.price),
    };
  }

  private toServiceWrite(value: BonaFormValue): ServiceWriteDto | null {
    const name = (value['name'] ?? '').trim();
    const durationMinutes = Number(value['durationMinutes']);
    if (!name || Number.isNaN(durationMinutes) || durationMinutes <= 0) {
      this.error.set(this.literals.errorRequired);
      return null;
    }
    const forcesSingleSession = value['forcesSingleSession'] === 'true';
    const payload: ServiceWriteDto = {
      name,
      sharesSessionPool: value['sharesSessionPool'] === 'true',
      forcesSingleSession,
      allowsSingleSession: value['allowsSingleSession'] === 'true',
      bookableByClient: value['bookableByClient'] === 'true',
      durationMinutes,
      active: value['active'] !== 'false',
    };
    const priceRaw = value['singleSessionPrice'] ?? '';
    if (priceRaw !== '') {
      const price = Number(priceRaw);
      if (Number.isNaN(price) || price < 0) {
        this.error.set(this.literals.errorRequired);
        return null;
      }
      payload.singleSessionPrice = price;
    }
    return payload;
  }

  private toBonoWrite(value: BonaFormValue, serviceId: string): BonoWriteDto | null {
    const name = (value['name'] ?? '').trim();
    const sessionCount = Number(value['sessionCount']);
    const price = Number(value['price']);
    if (!name || Number.isNaN(sessionCount) || Number.isNaN(price)) {
      this.error.set(this.literals.errorRequired);
      return null;
    }
    return {
      serviceId,
      name,
      description: (value['description'] ?? '').trim(),
      sessionCount,
      price,
    };
  }
}
