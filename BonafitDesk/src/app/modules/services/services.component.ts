import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { BonaButtonComponent } from '../../components/bona-button/bona-button.component';
import { BonaFieldDefinition } from '../../components/bona-field/bona-field.definition';
import { BonaFormComponent, BonaFormValue } from '../../components/bona-form/bona-form.component';
import {
  BonaGridAction,
  BonaGridActionEvent,
  BonaGridColumn,
  BonaGridComponent,
} from '../../components/bona-grid/bona-grid.component';
import { BonoDto, BonoWriteDto } from '../../models/bono.dto';
import { ServiceCategory, ServiceDto, ServiceWriteDto } from '../../models/service.dto';
import { ServicesApiService } from '../../services/services-api.service';
import { SERVICE_CATEGORY_LABELS, SERVICES_LITERALS } from './services.literals';

const NEW_ID = 'new';

const EMPTY_SERVICE: BonaFormValue = {
  name: '',
  category: 'entrenamiento-personal',
  allowsSingleSession: 'false',
  singleSessionPrice: '',
};

const EMPTY_BONO: BonaFormValue = {
  name: '',
  description: '',
  sessionCount: '',
  price: '',
};

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [BonaGridComponent, BonaFormComponent, BonaButtonComponent],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicesComponent {
  private readonly servicesApi = inject(ServicesApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly literals = SERVICES_LITERALS;
  readonly error = signal('');
  readonly selectedServiceId = signal<string | null>(null);
  readonly serviceForm = signal<BonaFormValue>({ ...EMPTY_SERVICE });
  readonly bonoFormOpen = signal(false);
  readonly editingBonoId = signal<string | null>(null);
  readonly bonoForm = signal<BonaFormValue>({ ...EMPTY_BONO });

  private readonly services = signal<ServiceDto[]>([]);
  private readonly bonos = signal<BonoDto[]>([]);

  readonly serviceColumns: BonaGridColumn[] = [
    { field: 'name', header: SERVICES_LITERALS.name },
    { field: 'categoryLabel', header: SERVICES_LITERALS.category },
    { field: 'allowsSingleSessionLabel', header: SERVICES_LITERALS.allowsSingleSession },
    { field: 'singleSessionPriceLabel', header: SERVICES_LITERALS.singleSessionPrice },
  ];

  readonly serviceActions: BonaGridAction[] = [
    { label: SERVICES_LITERALS.edit, action: 'edit' },
    { label: SERVICES_LITERALS.delete, action: 'delete' },
  ];

  readonly bonoColumns: BonaGridColumn[] = [
    { field: 'name', header: SERVICES_LITERALS.name },
    { field: 'sessionCount', header: SERVICES_LITERALS.sessionCount, type: 'number' },
    { field: 'price', header: SERVICES_LITERALS.price, type: 'number' },
    { field: 'description', header: SERVICES_LITERALS.description },
  ];

  readonly bonoActions: BonaGridAction[] = [
    { label: SERVICES_LITERALS.edit, action: 'edit' },
    { label: SERVICES_LITERALS.delete, action: 'delete' },
  ];

  readonly serviceRows = computed(() =>
    this.services().map((service) => ({
      ...service,
      categoryLabel: SERVICE_CATEGORY_LABELS[service.category],
      allowsSingleSessionLabel: service.allowsSingleSession
        ? this.literals.yes
        : this.literals.no,
      singleSessionPriceLabel:
        service.allowsSingleSession && service.singleSessionPrice != null
          ? String(service.singleSessionPrice)
          : '',
    })),
  );

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
    const allowsSingle = this.serviceForm()['allowsSingleSession'] === 'true';
    const fields: BonaFieldDefinition[] = [
      { key: 'name', label: this.literals.name, type: 'text', required: true },
      {
        key: 'category',
        label: this.literals.category,
        type: 'select',
        required: true,
        options: (Object.keys(SERVICE_CATEGORY_LABELS) as ServiceCategory[]).map(
          (category) => ({
            value: category,
            label: SERVICE_CATEGORY_LABELS[category],
          }),
        ),
      },
      {
        key: 'allowsSingleSession',
        label: this.literals.allowsSingleSession,
        type: 'select',
        options: [
          { value: 'true', label: this.literals.yes },
          { value: 'false', label: this.literals.no },
        ],
      },
    ];
    if (allowsSingle) {
      fields.push({
        key: 'singleSessionPrice',
        label: this.literals.singleSessionPrice,
        type: 'number',
      });
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

  onCreateService(): void {
    this.selectedServiceId.set(NEW_ID);
    this.serviceForm.set({ ...EMPTY_SERVICE });
    this.closeBonoForm();
    this.error.set('');
  }

  onServiceRowClick(item: Record<string, unknown>): void {
    this.selectService(String(item['id'] ?? ''));
  }

  onServiceAction(event: BonaGridActionEvent<Record<string, unknown>>): void {
    const id = String(event.item['id'] ?? '');
    if (event.action === 'edit') {
      this.selectService(id);
      return;
    }
    if (event.action === 'delete' && id) {
      this.deleteService(id);
    }
  }

  onServiceFormChange(value: BonaFormValue): void {
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
        this.loadAll(() => this.selectService(service.id));
      },
      error: () => this.error.set(this.literals.errorSave),
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
      const bono = this.bonos().find((item) => item.id === id);
      if (!bono) {
        return;
      }
      this.editingBonoId.set(bono.id);
      this.bonoForm.set(this.toBonoForm(bono));
      this.bonoFormOpen.set(true);
      return;
    }
    if (event.action === 'delete' && id) {
      this.servicesApi
        .deleteBono(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => this.loadAll(),
          error: () => this.error.set(this.literals.errorSave),
        });
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
        this.closeBonoForm();
        this.loadAll();
      },
      error: () => this.error.set(this.literals.errorSave),
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

  private deleteService(id: string): void {
    this.servicesApi
      .deleteService(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          if (this.selectedServiceId() === id) {
            this.selectedServiceId.set(null);
            this.closeBonoForm();
          }
          this.loadAll();
        },
        error: () => this.error.set(this.literals.errorSave),
      });
  }

  private loadAll(after?: () => void): void {
    forkJoin({
      services: this.servicesApi.getServices(),
      bonos: this.servicesApi.getBonos(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ services, bonos }) => {
        this.services.set(services);
        this.bonos.set(bonos);
        after?.();
      });
  }

  private closeBonoForm(): void {
    this.bonoFormOpen.set(false);
    this.editingBonoId.set(null);
  }

  private toServiceForm(service: ServiceDto): BonaFormValue {
    return {
      name: service.name,
      category: service.category,
      allowsSingleSession: service.allowsSingleSession ? 'true' : 'false',
      singleSessionPrice:
        service.singleSessionPrice != null ? String(service.singleSessionPrice) : '',
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
    const category = value['category'] as ServiceCategory;
    if (!name || !category) {
      this.error.set(this.literals.errorRequired);
      return null;
    }
    const allowsSingleSession = value['allowsSingleSession'] === 'true';
    const payload: ServiceWriteDto = {
      name,
      category,
      allowsSingleSession,
    };
    if (allowsSingleSession) {
      const price = Number(value['singleSessionPrice']);
      if (!Number.isNaN(price) && value['singleSessionPrice'] !== '') {
        payload.singleSessionPrice = price;
      }
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
