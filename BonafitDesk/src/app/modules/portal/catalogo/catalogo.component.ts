import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, filter, forkJoin, map, switchMap, take } from 'rxjs';
import { BonaConfirm } from '../../../components/bona-confirm/bona-confirm.service';
import {
  BonaGridAction,
  BonaGridActionEvent,
  BonaGridColumn,
  BonaGridComponent,
} from '../../../components/bona-grid/bona-grid.component';
import { BonaPageComponent } from '../../../components/bona-page/bona-page.component';
import { BonaToast } from '../../../components/bona-toast/bona-toast.service';
import { BonoDto } from '../../../models/bono.dto';
import { ServiceDto } from '../../../models/service.dto';
import { AuthApiService } from '../../../services/auth-api.service';
import { ClientsApiService } from '../../../services/clients-api.service';
import { ServicesApiService } from '../../../services/services-api.service';
import { CATALOGO_LITERALS } from './catalogo.literals';

@Component({
  selector: 'app-portal-catalogo',
  standalone: true,
  imports: [BonaPageComponent, BonaGridComponent],
  templateUrl: './catalogo.component.html',
  styleUrl: './catalogo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogoComponent {
  private readonly auth = inject(AuthApiService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly servicesApi = inject(ServicesApiService);
  private readonly confirm = inject(BonaConfirm);
  private readonly toast = inject(BonaToast);
  private readonly destroyRef = inject(DestroyRef);

  readonly literals = CATALOGO_LITERALS;
  readonly loading = signal(true);
  readonly error = signal('');
  readonly rows = signal<Record<string, unknown>[]>([]);

  readonly columns: BonaGridColumn[] = [
    { field: 'serviceName', header: CATALOGO_LITERALS.service },
    { field: 'offerName', header: CATALOGO_LITERALS.offer },
    { field: 'sessionCount', header: CATALOGO_LITERALS.sessions, type: 'number' },
    { field: 'priceLabel', header: CATALOGO_LITERALS.price },
  ];

  readonly actions: BonaGridAction[] = [
    { label: CATALOGO_LITERALS.contract, action: 'contract' },
  ];

  private clientId = '';

  constructor() {
    this.auth
      .getSession()
      .pipe(
        take(1),
        switchMap((session) => {
          const clientId = session?.user.clientId;
          if (!clientId) {
            this.loading.set(false);
            this.error.set(CATALOGO_LITERALS.noSession);
            return EMPTY;
          }
          this.clientId = clientId;
          return this.loadRows();
        }),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (rows) => {
          this.rows.set(rows);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(CATALOGO_LITERALS.loadError);
          this.loading.set(false);
        },
      });
  }

  onContract(event: BonaGridActionEvent): void {
    if (event.action !== 'contract' || !this.clientId) {
      return;
    }

    const bonoId = String(event.item['bonoId'] ?? '');
    if (!bonoId) {
      return;
    }

    this.confirm
      .open({
        title: CATALOGO_LITERALS.confirmContractTitle,
        message: CATALOGO_LITERALS.confirmContractMessage,
        confirmLabel: CATALOGO_LITERALS.contract,
      })
      .pipe(
        filter((ok) => ok),
        switchMap(() => this.clientsApi.contractBono({ clientId: this.clientId, bonoId })),
        switchMap(() => this.loadRows()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (rows) => {
          this.rows.set(rows);
          this.toast.success(CATALOGO_LITERALS.contracted);
        },
        error: () => this.toast.error(CATALOGO_LITERALS.contractError),
      });
  }

  private loadRows() {
    return forkJoin({
      services: this.servicesApi.getServices(),
      bonos: this.servicesApi.getBonos(),
    }).pipe(map(({ services, bonos }) => this.toRows(services, bonos)));
  }

  private toRows(services: ServiceDto[], bonos: BonoDto[]): Record<string, unknown>[] {
    const rows: Record<string, unknown>[] = [];

    for (const service of services) {
      for (const bono of bonos.filter((row) => row.serviceId === service.id)) {
        rows.push({
          id: bono.id,
          bonoId: bono.id,
          serviceId: service.id,
          serviceName: service.name,
          offerName: bono.name,
          sessionCount: bono.sessionCount,
          priceLabel: this.formatPrice(bono.price),
        });
      }
    }

    return rows;
  }

  private formatPrice(amount: number): string {
    return amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
  }
}
